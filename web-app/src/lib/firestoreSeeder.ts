'use client';

/**
 * Per-user Firestore seeder.
 * seedUserData(uid, email) — called once per login from LiveDataContext.
 * Checks accounts/{uid}/meta/seeded before writing anything.
 *
 * test user (testing@gmail.com):
 *   4 warehouses × 4 zones × 3 sensors + 30-day history + 55 alerts + 6 reports
 * all other approved users:
 *   4 warehouses + 4 zones + 4 sensors + 7-day history (minimal skeleton)
 */

import {
  getFirestore, doc, getDoc, setDoc, writeBatch, collection,
  getDocs, query, where,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col, isTestEmail, TEST_EMAIL } from '@/lib/accountDb';
import type { LiveSensorReading } from './liveEngine';

const db = getFirestore(firebaseApp);

const SEED_VERSION = 3;
// Regular accounts: version-based one-time seed (just writes meta, no data).
//                   Version bump triggers cleanup of data written by older versions.
// Test account:     permanent 'test_seeded' flag — seeded once, never again.
//                   Always seeds last 30 days so charts always have recent data.

// ─── Utilities ────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic float in [min, max] from a string seed + salt */
function seeded(seed: string, salt: number, min: number, max: number): number {
  const h = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0) * salt, 0);
  return min + (Math.abs(Math.sin(h) * 10000) % (max - min));
}

function seededInt(seed: string, salt: number, min: number, max: number): number {
  return min + (Math.abs(Math.round(seeded(seed, salt, 0, max - min + 1))) % (max - min + 1));
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── Test-user warehouse definitions ─────────────────────────────────────────

const TEST_WAREHOUSES = [
  { id: 'WH-A', name: 'North Wing Silo',    capacity: 5000, location: 'Block A, North',  baseTemp: 25.5, baseHum: 57, baseMoist: 10.8, baseCO2: 488, baseAQI: 33, baseCap: 72 },
  { id: 'WH-B', name: 'East Block Storage',  capacity: 4200, location: 'Block B, East',   baseTemp: 27.0, baseHum: 61, baseMoist: 11.8, baseCO2: 512, baseAQI: 40, baseCap: 67 },
  { id: 'WH-C', name: 'South Facility',      capacity: 6100, location: 'Block C, South',  baseTemp: 26.0, baseHum: 55, baseMoist: 10.5, baseCO2: 502, baseAQI: 37, baseCap: 81 },
  { id: 'WH-D', name: 'West Cold Unit',      capacity: 3800, location: 'Block D, West',   baseTemp: 27.5, baseHum: 62, baseMoist: 12.0, baseCO2: 518, baseAQI: 43, baseCap: 61 },
];

const ZONE_NAMES = ['Zone Alpha', 'Zone Beta', 'Zone Gamma', 'Zone Delta'];

// ─── Build a daily sensorHistory snapshot ────────────────────────────────────

function buildDaySnapshot(dateStr: string, whConfigs: typeof TEST_WAREHOUSES) {
  const variants = whConfigs.map(wh => ({
    id:          wh.id,
    temperature: clamp(+(wh.baseTemp + seeded(dateStr, wh.id.charCodeAt(2), -2, 4)).toFixed(1), 20, 36),
    humidity:    clamp(Math.round(wh.baseHum + seeded(dateStr, wh.id.charCodeAt(3), -4, 8)),     40, 80),
    moisture:    clamp(+(wh.baseMoist + seeded(dateStr, wh.id.charCodeAt(2) + 1, -1, 2)).toFixed(1), 8, 16),
    co2:         clamp(Math.round(wh.baseCO2 + seeded(dateStr, wh.id.charCodeAt(2) + 2, -30, 80)), 400, 700),
    aqi:         clamp(Math.round(wh.baseAQI + seeded(dateStr, wh.id.charCodeAt(2) + 3, -8, 20)),   10, 90),
  }));

  const avgT   = +(variants.reduce((s, w) => s + w.temperature, 0) / variants.length).toFixed(1);
  const avgH   = Math.round(variants.reduce((s, w) => s + w.humidity, 0) / variants.length);
  const avgM   = +(variants.reduce((s, w) => s + w.moisture, 0) / variants.length).toFixed(1);
  const avgCO2 = Math.round(variants.reduce((s, w) => s + w.co2, 0) / variants.length);
  const avgAQI = Math.round(variants.reduce((s, w) => s + w.aqi, 0) / variants.length);

  const statuses = variants.map(w => {
    if (w.temperature >= 32 || w.humidity >= 72 || w.co2 >= 650) return 'high';
    if (w.temperature >= 29 || w.humidity >= 65 || w.co2 >= 550) return 'medium';
    return 'good';
  });

  const good     = statuses.filter(s => s === 'good').length;
  const warning  = statuses.filter(s => s === 'medium').length;
  const critical = statuses.filter(s => s === 'high').length;

  const stability: Record<string, number> = {};
  for (const w of variants) {
    const tScore = clamp(100 - Math.max(0, w.temperature - 25) * 8, 0, 100);
    const hScore = clamp(100 - Math.max(0, w.humidity - 60) * 4, 0, 100);
    stability[w.id] = Math.round(tScore * 0.6 + hScore * 0.4);
  }

  return {
    date: dateStr,
    averages:         { temperature: avgT, humidity: avgH, moisture: avgM, co2: avgCO2, aqi: avgAQI },
    warehouseStatus:  { good, warning, critical },
    stability,
    alertCounts: {
      Critical: Math.max(0, critical * 2 + seededInt(dateStr, 11, 0, 3)),
      Warning:  Math.max(0, warning * 3 + critical + seededInt(dateStr, 7, 0, 6)),
      Info:     Math.max(0, 5 + good + seededInt(dateStr, 3, 0, 5)),
    },
  };
}

// ─── Build live warehouseReadings ─────────────────────────────────────────────

function buildReading(wh: typeof TEST_WAREHOUSES[0]): LiveSensorReading {
  const temp     = clamp(+(wh.baseTemp + (Math.random() - 0.4) * 3).toFixed(1), 20, 36);
  const humidity = clamp(Math.round(wh.baseHum + (Math.random() - 0.4) * 6), 40, 80);
  const moisture = clamp(+(wh.baseMoist + (Math.random() - 0.4) * 1.5).toFixed(1), 8, 16);
  const co2      = clamp(Math.round(wh.baseCO2 + (Math.random() - 0.4) * 60), 400, 700);
  const aqi      = clamp(Math.round(wh.baseAQI + (Math.random() - 0.4) * 15), 10, 90);
  const capacity = clamp(Math.round(wh.baseCap + (Math.random() - 0.5) * 8), 10, 98);

  const status: LiveSensorReading['status'] =
    temp >= 32 || humidity >= 72 || co2 >= 650 ? 'high' :
    temp >= 29 || humidity >= 65 || co2 >= 550 ? 'medium' : 'good';

  const spoilageRisk = clamp(Math.round(
    Math.max(0, temp - 24) * 3 + Math.max(0, humidity - 58) * 1.5 + Math.max(0, moisture - 11) * 5
  ), 1, 95);

  const health = clamp(
    100 - spoilageRisk - Math.max(0, co2 - 500) * 0.05 - Math.max(0, aqi - 40) * 0.3,
    10, 99
  );

  return {
    warehouseId:  wh.id,
    temperature:  temp,
    humidity,
    moisture,
    co2,
    aqi,
    capacity,
    spoilageRisk,
    health:       +health.toFixed(1),
    status,
    trend:        'stable',
    lastUpdate:   Date.now(),
  };
}

// ─── Build seed alerts ────────────────────────────────────────────────────────

const ALERT_TEMPLATES = [
  { param: 'Temperature', unit: '°C', threshold: 29, severity: 'high' as const,   baseValue: 30.5 },
  { param: 'Temperature', unit: '°C', threshold: 32, severity: 'critical' as const, baseValue: 33.1 },
  { param: 'Humidity',    unit: '%',  threshold: 65, severity: 'high' as const,   baseValue: 68 },
  { param: 'Humidity',    unit: '%',  threshold: 72, severity: 'critical' as const, baseValue: 74 },
  { param: 'Moisture',    unit: '%',  threshold: 13, severity: 'high' as const,   baseValue: 13.8 },
  { param: 'CO₂',         unit: 'ppm',threshold: 550, severity: 'high' as const,  baseValue: 572 },
  { param: 'CO₂',         unit: 'ppm',threshold: 650, severity: 'critical' as const, baseValue: 668 },
  { param: 'AQI',         unit: '',   threshold: 50, severity: 'high' as const,   baseValue: 57 },
];

function buildAlerts(today: Date, daysBack: number) {
  const active: object[]  = [];
  const history: object[] = [];

  let count = 0;
  for (let daysAgo = daysBack - 1; daysAgo >= 0; daysAgo--) {
    const day  = addDays(today, -daysAgo);
    const dKey = dateKey(day);
    const alertsThisDay = seededInt(dKey, 13, 0, 3);

    for (let j = 0; j < alertsThisDay; j++) {
      const tpl = ALERT_TEMPLATES[seededInt(`${dKey}-${j}`, 17, 0, ALERT_TEMPLATES.length - 1)];
      const wh  = TEST_WAREHOUSES[seededInt(`${dKey}-${j}`, 19, 0, 3)];
      const id  = `seed-${dKey}-${j}`;
      const value = +(tpl.baseValue + seeded(`${dKey}-v-${j}`, 7, -1, 2)).toFixed(1);
      const ts  = day.getTime() + seededInt(`${dKey}-ts-${j}`, 11, 0, 86399) * 1000;
      const isResolved = daysAgo > 0; // only the most recent day has unresolved alerts

      const alertDoc = {
        id,
        warehouseId: wh.id,
        param:       tpl.param,
        value,
        unit:        tpl.unit,
        threshold:   tpl.threshold,
        severity:    tpl.severity,
        message:     `${tpl.param} ${value}${tpl.unit} exceeded threshold of ${tpl.threshold}${tpl.unit} in ${wh.name}`,
        timestamp:   ts,
        resolved:    isResolved,
      };

      if (!isResolved) active.push(alertDoc);

      history.push({
        ...alertDoc,
        triggeredAt: ts,
        resolvedAt:  isResolved ? ts + seededInt(`${dKey}-ra-${j}`, 3, 3600, 86400) * 1000 : null,
        date:        dKey,
      });

      count++;
      if (count >= 55) break;
    }
    if (count >= 55) break;
  }

  return { active, history };
}

// ─── Build seed reports ───────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildReports(today: Date) {
  type ReportType = 'environmental' | 'compliance' | 'performance' | 'alert-summary' | 'custom';
  const types: { type: ReportType; label: string; color: string }[] = [
    { type: 'environmental', label: 'Environmental', color: '#1f5135' },
    { type: 'compliance',    label: 'Compliance',    color: '#3b82f6' },
    { type: 'performance',   label: 'Performance',   color: '#f59e0b' },
    { type: 'alert-summary', label: 'Alert Summary', color: '#ef4444' },
    { type: 'custom',        label: 'Custom',        color: '#8b5cf6' },
  ];

  const reports = types.map((t, i) => {
    const d   = addDays(today, -i * 5);
    const mon = MONTHS_SHORT[d.getMonth()];
    const day = d.getDate();
    const yr  = d.getFullYear();
    return {
      id:           `rep-seed-${i + 1}`,
      type:          t.type,
      title:        `${t.label} Report — ${mon} ${day}, ${yr}`,
      warehouse:    i < 4 ? TEST_WAREHOUSES[i].id : 'All',
      period:       `Last 30 days`,
      generatedAt:  `${mon} ${day}, ${yr}`,
      dateGenerated: dateKey(d),
      generatedBy:  'System',
      size:         `${seededInt(dateKey(d), 7, 120, 850)} KB`,
      downloads:     seededInt(dateKey(d), 11, 0, 12),
      status:       'ready' as const,
    };
  });

  const reportTypeData = types.map(t => ({
    label: t.label,
    count: seededInt(t.type, 5, 2, 18),
    color: t.color,
  }));

  const today7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return {
      day:        `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`,
      Generated:  seededInt(dateKey(d), 3, 0, 5),
      Downloaded: seededInt(dateKey(d), 7, 0, 8),
    };
  });

  const stats = [
    { label: 'Total Reports',    value: 47, delta: '+12',   deltaPositive: true,  colorKey: 'blue'   as const },
    { label: 'This Month',       value: 14, delta: '+3',    deltaPositive: true,  colorKey: 'green'  as const },
    { label: 'Avg Downloads',    value: 6,  delta: '+0.8',  deltaPositive: true,  colorKey: 'purple' as const },
    { label: 'Compliance Score', value: 94, delta: '+2.1%', deltaPositive: true,  colorKey: 'amber'  as const },
  ];

  return { reports, reportTypeData, reportTrendData: today7, stats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/** Called from LiveDataContext on every login — idempotent. */
export async function seedUserData(uid: string, email: string): Promise<void> {
  try {
    if (isTestEmail(email)) {
      // Test account uses a permanent key — seeded exactly once, no re-seed ever.
      // If only the legacy 'seeded' key exists, we migrate the flag without touching data.
      const testRef   = doc(db, col.meta(uid), 'test_seeded');
      const [testSnap, legacySnap] = await Promise.all([
        getDoc(testRef),
        getDoc(doc(db, col.meta(uid), 'seeded')),
      ]);
      if (testSnap.exists()) return;
      if (legacySnap.exists()) {
        // Migrate: create permanent flag, keep existing data as-is
        await setDoc(testRef, { seededAt: Date.now(), migratedAt: Date.now() });
        return;
      }
      await seedTestUser(uid, new Date(), Date.now(), testRef);
      console.info('[seeder] Seeded test user', uid);
    } else {
      const metaRef  = doc(db, col.meta(uid), 'seeded');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists() && (metaSnap.data()?.version ?? 0) >= SEED_VERSION) return;
      await seedRegularUser(uid, Date.now(), metaRef);
      console.info('[seeder] Seeded regular user', uid);
    }
  } catch (err) {
    console.warn('[seeder] Seeding failed (non-fatal):', err);
  }
}

// ─── Test user seeding ────────────────────────────────────────────────────────

async function seedTestUser(uid: string, today: Date, now: number, metaRef: ReturnType<typeof doc>) {
  const daysBack = 30; // always last 30 days, no matter when the seeder runs

  // Restore /users/{uid} if admin deleted it — required so Firestore rules
  // allow writes and the admin panel shows the test account.
  const userDocRef  = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    await setDoc(userDocRef, {
      uid,
      email:          TEST_EMAIL,
      displayName:    'Test Account',
      approvalStatus: 'approved',
      createdAt:      now,
      approvedAt:     now,
    });
  }

  const batch1 = writeBatch(db);

  // ── Warehouses ───────────────────────────────────────────────────────────────
  for (const wh of TEST_WAREHOUSES) {
    batch1.set(doc(db, col.warehouses(uid), wh.id), {
      id:           wh.id,
      name:         wh.name,
      capacity:     wh.capacity,
      location:     wh.location,
      status:       'active',
      liveEngineId: wh.id,
      createdAt:    now - 30 * 24 * 3600 * 1000,
    });
  }

  // ── Zones & Sensors ──────────────────────────────────────────────────────────
  for (const wh of TEST_WAREHOUSES) {
    for (let z = 0; z < 4; z++) {
      const zoneId = `${wh.id}-Z${z + 1}`;
      batch1.set(doc(db, col.zones(uid), zoneId), {
        id:          zoneId,
        warehouseId: wh.id,
        name:        ZONE_NAMES[z],
        status:      'active',
        createdAt:   now - 29 * 24 * 3600 * 1000,
      });

      const sensorTypes: Array<'temperature' | 'humidity' | 'moisture'> = ['temperature', 'humidity', 'moisture'];
      for (const sType of sensorTypes) {
        const sensorId = `${zoneId}-${sType}`;
        batch1.set(doc(db, col.sensors(uid), sensorId), {
          id:          sensorId,
          zoneId,
          warehouseId: wh.id,
          name:        `${sType.charAt(0).toUpperCase() + sType.slice(1)} Sensor`,
          type:        sType,
          status:      'active',
          createdAt:   now - 28 * 24 * 3600 * 1000,
        });
      }
    }
  }

  // ── warehouseReadings (current live snapshots) ───────────────────────────────
  for (const wh of TEST_WAREHOUSES) {
    const reading = buildReading(wh);
    batch1.set(doc(db, col.warehouseReadings(uid), wh.id), {
      ...reading,
      updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
    });
  }

  await batch1.commit();

  // ── sensorHistory — from TEST_SEED_START to today ─────────────────────────────
  const batch2 = writeBatch(db);
  for (let i = daysBack - 1; i >= 0; i--) {
    const day     = addDays(today, -i);
    const dKey    = dateKey(day);
    const snapshot = buildDaySnapshot(dKey, TEST_WAREHOUSES);
    batch2.set(doc(db, col.sensorHistory(uid), dKey), snapshot);
  }
  await batch2.commit();

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const { active, history } = buildAlerts(today, daysBack);
  const batch3 = writeBatch(db);
  for (const a of active) {
    batch3.set(doc(db, col.alerts(uid), (a as { id: string }).id), a);
  }
  for (const h of history) {
    batch3.set(doc(db, col.alertHistory(uid), (h as { id: string }).id), h);
  }
  await batch3.commit();

  // ── Reports ────────────────────────────────────────────────────────────────────
  const { reports, reportTypeData, reportTrendData, stats } = buildReports(today);
  const batch4 = writeBatch(db);
  for (const r of reports) {
    batch4.set(doc(db, col.reports(uid), r.id), r);
  }
  batch4.set(doc(db, col.reportsMeta(uid), 'global'), {
    stats,
    reportTypeData,
    reportTrendData,
    totalReports: 47,
    updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
  });
  batch4.set(metaRef, { version: SEED_VERSION, seededAt: now, email: 'test' });
  await batch4.commit();
}

// ─── Regular user seeding (empty — no data, no warehouses) ───────────────────
// New users start with an empty account. They add warehouses/zones/sensors
// themselves; sensors require admin approval before generating data.
//
// Version 3 cleanup: older seeder versions created WH-A through WH-D warehouse
// documents and readings for ALL approved users. This function removes that stale
// data so accounts that were seeded before the fix see a clean empty state.

const OLD_SEEDED_WH_IDS = ['WH-A', 'WH-B', 'WH-C', 'WH-D'];

async function seedRegularUser(uid: string, now: number, metaRef: ReturnType<typeof doc>): Promise<void> {
  // Query zones and sensors belonging to the old seeded warehouses.
  const [zoneSnap, sensorSnap, histSnap] = await Promise.all([
    getDocs(query(collection(db, col.zones(uid)),   where('warehouseId', 'in', OLD_SEEDED_WH_IDS))),
    getDocs(query(collection(db, col.sensors(uid)), where('warehouseId', 'in', OLD_SEEDED_WH_IDS))),
    getDocs(collection(db, col.sensorHistory(uid))),
  ]);

  const cleanup = writeBatch(db);
  for (const whId of OLD_SEEDED_WH_IDS) {
    cleanup.delete(doc(db, col.warehouses(uid),       whId));
    cleanup.delete(doc(db, col.warehouseReadings(uid), whId));
  }
  zoneSnap.docs.forEach(d   => cleanup.delete(d.ref));
  sensorSnap.docs.forEach(d => cleanup.delete(d.ref));
  histSnap.docs.forEach(d   => cleanup.delete(d.ref));
  await cleanup.commit();

  await setDoc(metaRef, { version: SEED_VERSION, seededAt: now, email: 'regular' });
}

// ─── Daily snapshot append (called by liveEngine) ─────────────────────────────

export async function appendTodaySnapshot(
  uid: string,
  readings: Record<string, LiveSensorReading>,
): Promise<void> {
  try {
    const key    = dateKey(new Date());
    const values = Object.values(readings);
    if (!values.length) return;

    const avgT   = +(values.reduce((s, r) => s + r.temperature, 0) / values.length).toFixed(1);
    const avgH   = Math.round(values.reduce((s, r) => s + r.humidity, 0) / values.length);
    const avgM   = +(values.reduce((s, r) => s + r.moisture, 0) / values.length).toFixed(1);
    const avgCO2 = Math.round(values.reduce((s, r) => s + r.co2, 0) / values.length);
    const avgAQI = Math.round(values.reduce((s, r) => s + r.aqi, 0) / values.length);

    await setDoc(doc(db, col.sensorHistory(uid), key), {
      date: key,
      averages:        { temperature: avgT, humidity: avgH, moisture: avgM, co2: avgCO2, aqi: avgAQI },
      warehouseStatus: {
        good:     values.filter(r => r.status === 'good').length,
        warning:  values.filter(r => r.status === 'medium').length,
        critical: values.filter(r => r.status === 'high').length,
      },
      stability: Object.fromEntries(
        values.map(r => {
          const tScore = clamp(100 - Math.max(0, r.temperature - 25) * 8, 0, 100);
          const hScore = clamp(100 - Math.max(0, r.humidity - 60) * 4, 0, 100);
          return [r.warehouseId, Math.round(tScore * 0.6 + hScore * 0.4)];
        })
      ),
      alertCounts: {
        Critical: values.filter(r => r.status === 'high').length * 2,
        Warning:  values.filter(r => r.status === 'medium').length * 3,
        Info:     8,
      },
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {
    // non-fatal
  }
}

// ─── Save a report (called when user generates one) ──────────────────────────

export async function saveReport(
  uid: string,
  report: {
    id: string; type: string; title: string; warehouse: string; period: string;
    generatedAt: string; dateGenerated: string; generatedBy: string;
    size: string; downloads: number; status: string;
  },
): Promise<void> {
  await setDoc(doc(db, col.reports(uid), report.id), {
    ...report,
    createdAt: Date.now(),
  });
}
