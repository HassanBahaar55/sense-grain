'use client';

/**
 * Per-user Firestore seeder.
 * seedUserData(uid, email) — called once per login from LiveDataContext.
 *
 * Testing account (testing@gmail.com):
 *   4 warehouses × 4 zones × 5 sensors per zone = 80 sensors
 *   Each sensor has its own sensorReadings document (per-sensor live reading)
 *   Same-type sensors per zone are averaged for zone/warehouse display
 *   30-day sensorHistory + alerts + reports
 *
 * All other accounts:
 *   Empty — just writes a meta marker. User must add warehouses/zones/sensors
 *   through the approval workflow.
 */

import {
  getFirestore, doc, getDoc, setDoc, writeBatch, collection,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col, isTestEmail, isAdminEmail, TEST_EMAIL } from '@/lib/accountDb';

const db = getFirestore(firebaseApp);

const SEED_VERSION = 4; // bump when regular-user seeder logic changes

// ─── Utilities ────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function seeded(seed: string, salt: number, min: number, max: number): number {
  const h = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0) * salt, 0);
  return min + (Math.abs(Math.sin(h) * 10000) % (max - min));
}

function seededInt(seed: string, salt: number, min: number, max: number): number {
  return min + (Math.abs(Math.round(seeded(seed, salt, 0, max - min + 1))) % (max - min + 1));
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function sensorStatus(type: string, value: number): 'normal' | 'warning' | 'critical' {
  if (type === 'temperature') {
    if (value >= 32) return 'critical';
    if (value >= 29) return 'warning';
  } else if (type === 'humidity') {
    if (value >= 72) return 'critical';
    if (value >= 65) return 'warning';
  } else if (type === 'moisture') {
    if (value >= 15) return 'critical';
    if (value >= 13) return 'warning';
  } else if (type === 'co2') {
    if (value >= 650) return 'critical';
    if (value >= 550) return 'warning';
  } else if (type === 'aqi') {
    if (value >= 80) return 'critical';
    if (value >= 50) return 'warning';
  }
  return 'normal';
}

function unitFor(type: string): string {
  switch (type) {
    case 'temperature': return '°C';
    case 'humidity':    return '%';
    case 'moisture':    return '%';
    case 'co2':         return 'ppm';
    case 'aqi':         return '';
    default:            return '';
  }
}

// ─── Testing account warehouse configs ────────────────────────────────────────

const TEST_WAREHOUSES = [
  { id: 'WH-A', name: 'North Wing Silo',   capacity: 5000, location: 'Block A, North',
    baseTemp: 25.5, baseHum: 57, baseMoist: 10.8, baseCO2: 488, baseAQI: 33, baseCap: 72 },
  { id: 'WH-B', name: 'East Block Storage', capacity: 4200, location: 'Block B, East',
    baseTemp: 27.0, baseHum: 61, baseMoist: 11.8, baseCO2: 512, baseAQI: 40, baseCap: 67 },
  { id: 'WH-C', name: 'South Facility',     capacity: 6100, location: 'Block C, South',
    baseTemp: 26.0, baseHum: 55, baseMoist: 10.5, baseCO2: 502, baseAQI: 37, baseCap: 81 },
  { id: 'WH-D', name: 'West Cold Unit',     capacity: 3800, location: 'Block D, West',
    baseTemp: 27.5, baseHum: 62, baseMoist: 12.0, baseCO2: 518, baseAQI: 43, baseCap: 61 },
];

const ZONE_NAMES = ['Zone Alpha', 'Zone Beta', 'Zone Gamma', 'Zone Delta'];

// 5 sensors per zone: 2 temperature (A/B), 1 humidity, 1 moisture, 1 CO2
const SENSOR_DEFS = [
  { suffix: 'T1', name: 'Temp Sensor A',    type: 'temperature' as const },
  { suffix: 'T2', name: 'Temp Sensor B',    type: 'temperature' as const },
  { suffix: 'H',  name: 'Humidity Sensor',  type: 'humidity'    as const },
  { suffix: 'M',  name: 'Moisture Sensor',  type: 'moisture'    as const },
  { suffix: 'C',  name: 'CO2 Sensor',       type: 'co2'         as const },
];

// Base values per sensor type (each sensor gets a small individual offset)
function sensorBaseValue(type: string, wh: typeof TEST_WAREHOUSES[0]): number {
  switch (type) {
    case 'temperature': return wh.baseTemp;
    case 'humidity':    return wh.baseHum;
    case 'moisture':    return wh.baseMoist;
    case 'co2':         return wh.baseCO2;
    case 'aqi':         return wh.baseAQI;
    default:            return 0;
  }
}

// Generate a live reading for one sensor with a small individual drift
function liveSensorValue(
  type: string,
  baseValue: number,
  sensorSalt: number,
): number {
  const drift = seeded(`live-${sensorSalt}`, sensorSalt, -0.5, 0.5);
  switch (type) {
    case 'temperature': return clamp(+(baseValue + drift * 2).toFixed(1), 20, 36);
    case 'humidity':    return clamp(Math.round(baseValue + drift * 4), 40, 80);
    case 'moisture':    return clamp(+(baseValue + drift * 0.8).toFixed(1), 8, 16);
    case 'co2':         return clamp(Math.round(baseValue + drift * 30), 400, 750);
    case 'aqi':         return clamp(Math.round(baseValue + drift * 10), 10, 100);
    default:            return baseValue;
  }
}

// Generate a historical daily reading for one sensor
function historicalSensorValue(
  type: string,
  baseValue: number,
  dateStr: string,
  sensorId: string,
): number {
  const salt = sensorId.length + dateStr.length;
  switch (type) {
    case 'temperature': return clamp(+(baseValue + seeded(dateStr + sensorId, salt, -2, 4)).toFixed(1), 20, 36);
    case 'humidity':    return clamp(Math.round(baseValue + seeded(dateStr + sensorId, salt + 1, -4, 8)), 40, 80);
    case 'moisture':    return clamp(+(baseValue + seeded(dateStr + sensorId, salt + 2, -1, 2)).toFixed(1), 8, 16);
    case 'co2':         return clamp(Math.round(baseValue + seeded(dateStr + sensorId, salt + 3, -30, 80)), 400, 700);
    case 'aqi':         return clamp(Math.round(baseValue + seeded(dateStr + sensorId, salt + 4, -8, 20)), 10, 90);
    default:            return baseValue;
  }
}

// ─── Build daily sensorHistory snapshot (per-warehouse aggregates) ────────────

interface DaySensorData {
  sensorId: string; type: string; value: number; zoneId: string; warehouseId: string;
}

function buildDaySnapshot(dateStr: string, allSensorData: DaySensorData[]) {
  // Group by warehouseId → compute averages per type → warehouse summary
  const byWarehouse: Record<string, DaySensorData[]> = {};
  for (const s of allSensorData) {
    if (!byWarehouse[s.warehouseId]) byWarehouse[s.warehouseId] = [];
    byWarehouse[s.warehouseId].push(s);
  }

  const warehouseSnapshots: Record<string, {
    temperature: number; humidity: number; moisture: number; co2: number; aqi: number;
    health: number; spoilageRisk: number; status: string;
  }> = {};

  let sumT = 0, sumH = 0, sumM = 0, sumCO2 = 0, sumAQI = 0, whCount = 0;
  let good = 0, warning = 0, critical = 0;

  const stability: Record<string, number> = {};

  for (const [whId, sensors] of Object.entries(byWarehouse)) {
    const temps   = sensors.filter(s => s.type === 'temperature').map(s => s.value);
    const hums    = sensors.filter(s => s.type === 'humidity').map(s => s.value);
    const moists  = sensors.filter(s => s.type === 'moisture').map(s => s.value);
    const co2s    = sensors.filter(s => s.type === 'co2').map(s => s.value);
    const aqis    = sensors.filter(s => s.type === 'aqi').map(s => s.value);

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const t   = +avg(temps).toFixed(1);
    const h   = Math.round(avg(hums));
    const m   = +avg(moists).toFixed(1);
    const co2 = Math.round(avg(co2s));
    const aqi = Math.round(avg(aqis));

    const spoilageRisk = clamp(Math.round(
      Math.max(0, t - 24) * 3 + Math.max(0, h - 58) * 1.5 + Math.max(0, m - 11) * 5
    ), 1, 95);
    const health = clamp(100 - spoilageRisk - Math.max(0, co2 - 500) * 0.05 - Math.max(0, aqi - 40) * 0.3, 10, 99);
    const status = t >= 32 || h >= 72 || co2 >= 650 ? 'high' : t >= 29 || h >= 65 || co2 >= 550 ? 'medium' : 'good';

    warehouseSnapshots[whId] = { temperature: t, humidity: h, moisture: m, co2, aqi, health: +health.toFixed(1), spoilageRisk, status };

    sumT += t; sumH += h; sumM += m; sumCO2 += co2; sumAQI += aqi; whCount++;
    if (status === 'good') good++;
    else if (status === 'medium') warning++;
    else critical++;

    const tScore = clamp(100 - Math.max(0, t - 25) * 8, 0, 100);
    const hScore = clamp(100 - Math.max(0, h - 60) * 4, 0, 100);
    stability[whId] = Math.round(tScore * 0.6 + hScore * 0.4);
  }

  const n = Math.max(1, whCount);
  return {
    date: dateStr,
    averages: {
      temperature: +((sumT / n)).toFixed(1),
      humidity:    Math.round(sumH / n),
      moisture:    +((sumM / n)).toFixed(1),
      co2:         Math.round(sumCO2 / n),
      aqi:         Math.round(sumAQI / n),
    },
    warehouseSnapshots,
    warehouseStatus: { good, warning, critical },
    stability,
    alertCounts: {
      Critical: Math.max(0, critical * 2 + seededInt(dateStr, 11, 0, 3)),
      Warning:  Math.max(0, warning * 3 + critical + seededInt(dateStr, 7, 0, 6)),
      Info:     Math.max(0, 5 + good + seededInt(dateStr, 3, 0, 5)),
    },
  };
}

// ─── Build seed alerts ────────────────────────────────────────────────────────

const ALERT_TEMPLATES = [
  { param: 'Temperature', unit: '°C',  threshold: 29,  severity: 'high'     as const, baseValue: 30.5 },
  { param: 'Temperature', unit: '°C',  threshold: 32,  severity: 'critical' as const, baseValue: 33.1 },
  { param: 'Humidity',    unit: '%',   threshold: 65,  severity: 'high'     as const, baseValue: 68   },
  { param: 'Humidity',    unit: '%',   threshold: 72,  severity: 'critical' as const, baseValue: 74   },
  { param: 'Moisture',    unit: '%',   threshold: 13,  severity: 'high'     as const, baseValue: 13.8 },
  { param: 'CO₂',         unit: 'ppm', threshold: 550, severity: 'high'     as const, baseValue: 572  },
  { param: 'CO₂',         unit: 'ppm', threshold: 650, severity: 'critical' as const, baseValue: 668  },
  { param: 'AQI',         unit: '',    threshold: 50,  severity: 'high'     as const, baseValue: 57   },
];

function buildAlerts(today: Date, daysBack: number) {
  const active:  object[] = [];
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
      const value     = +(tpl.baseValue + seeded(`${dKey}-v-${j}`, 7, -1, 2)).toFixed(1);
      const ts        = day.getTime() + seededInt(`${dKey}-ts-${j}`, 11, 0, 86399) * 1000;
      const isResolved = daysAgo > 0;

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
        status:      isResolved ? 'resolved' : 'active',
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
      warehouse:    i < 4 ? TEST_WAREHOUSES[i].name : 'All Warehouses',
      warehouseId:  i < 4 ? TEST_WAREHOUSES[i].id : 'all',
      period:       'Last 30 days',
      generatedAt:  `${mon} ${day}, ${yr}`,
      dateGenerated: dateKey(d),
      generatedBy:  'System',
      size:         `${seededInt(dateKey(d), 7, 120, 850)} KB`,
      downloads:     seededInt(dateKey(d), 11, 0, 12),
      status:       'ready' as const,
    };
  });

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

  return {
    reports,
    reportTypeData: types.map(t => ({ label: t.label, count: seededInt(t.type, 5, 2, 18), color: t.color })),
    reportTrendData: today7,
    stats,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export async function seedUserData(uid: string, email: string): Promise<void> {
  try {
    if (isAdminEmail(email)) return; // admin has no data to seed

    if (isTestEmail(email)) {
      const testRef  = doc(db, col.meta(uid), 'test_seeded');
      const testSnap = await getDoc(testRef);
      if (testSnap.exists()) return; // already seeded — idempotent
      await seedTestUser(uid, new Date(), Date.now(), testRef);
      console.info('[seeder] Seeded test user', uid);
    } else {
      const metaRef  = doc(db, col.meta(uid), 'seeded');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists() && (metaSnap.data()?.version ?? 0) >= SEED_VERSION) return;
      await setDoc(metaRef, { version: SEED_VERSION, seededAt: Date.now(), email: 'regular' });
    }
  } catch (err) {
    console.warn('[seeder] Seeding failed (non-fatal):', err);
  }
}

// ─── Testing account seeder ───────────────────────────────────────────────────

async function seedTestUser(uid: string, today: Date, now: number, metaRef: ReturnType<typeof doc>) {
  const daysBack = 30;

  // Ensure users/{uid} exists (may have been reset)
  const userDocRef  = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    await setDoc(userDocRef, {
      uid,
      email:          TEST_EMAIL,
      displayName:    'Test Account',
      approvalStatus: 'approved',
      role:           'user',
      createdAt:      now,
      approvedAt:     now,
    });
  }

  // ── Collect all sensor definitions upfront for history generation ─────────────
  interface SeedSensor {
    sensorId: string; zoneId: string; warehouseId: string;
    type: string; name: string; baseValue: number; suffix: string;
  }
  const allSensors: SeedSensor[] = [];

  const batch1 = writeBatch(db);

  // Warehouses
  for (const wh of TEST_WAREHOUSES) {
    batch1.set(doc(db, col.warehouses(uid), wh.id), {
      name:      wh.name,
      capacity:  wh.capacity,
      location:  wh.location,
      status:    'active',
      createdAt: now - 30 * 24 * 3600 * 1000,
    });

    // Zones
    for (let z = 0; z < 4; z++) {
      const zoneId = `${wh.id}-Z${z + 1}`;
      batch1.set(doc(db, col.zones(uid), zoneId), {
        warehouseId: wh.id,
        name:        ZONE_NAMES[z],
        status:      'active',
        createdAt:   now - 29 * 24 * 3600 * 1000,
      });

      // Sensors (5 per zone)
      for (let si = 0; si < SENSOR_DEFS.length; si++) {
        const def      = SENSOR_DEFS[si];
        const sensorId = `${zoneId}-${def.suffix}`;
        const base     = sensorBaseValue(def.type, wh) + (si % 2 === 0 ? 0.3 : -0.3); // slight per-sensor offset

        allSensors.push({ sensorId, zoneId, warehouseId: wh.id, type: def.type, name: def.name, baseValue: base, suffix: def.suffix });

        batch1.set(doc(db, col.sensors(uid), sensorId), {
          zoneId,
          warehouseId: wh.id,
          name:        def.name,
          type:        def.type,
          status:      'active',
          baseValue:   base,
          createdAt:   now - 28 * 24 * 3600 * 1000,
        });

        // Per-sensor live reading (sensorReadings collection)
        const liveValue = liveSensorValue(def.type, base, sensorId.length + si);
        batch1.set(doc(db, col.sensorReadings(uid), sensorId), {
          sensorId,
          zoneId,
          warehouseId: wh.id,
          type:        def.type,
          value:       liveValue,
          unit:        unitFor(def.type),
          status:      sensorStatus(def.type, liveValue),
          updatedAt:   now,
        });
      }
    }

    // Computed warehouseReadings cache (average of all sensors in this warehouse)
    const whSensors = allSensors.filter(s => s.warehouseId === wh.id);
    const avgType = (type: string) => {
      const vals = whSensors.filter(s => s.type === type).map(s => liveSensorValue(type, s.baseValue, s.sensorId.length));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const t   = +avgType('temperature').toFixed(1);
    const h   = Math.round(avgType('humidity'));
    const m   = +avgType('moisture').toFixed(1);
    const co2 = Math.round(avgType('co2'));
    const aqi = Math.round(avgType('aqi'));
    const cap = wh.baseCap;
    const spoilageRisk = clamp(Math.round(Math.max(0, t - 24) * 3 + Math.max(0, h - 58) * 1.5 + Math.max(0, m - 11) * 5), 1, 95);
    const health = clamp(100 - spoilageRisk - Math.max(0, co2 - 500) * 0.05 - Math.max(0, aqi - 40) * 0.3, 10, 99);
    const whStatus: 'good' | 'medium' | 'high' = t >= 32 || h >= 72 || co2 >= 650 ? 'high' : t >= 29 || h >= 65 || co2 >= 550 ? 'medium' : 'good';

    batch1.set(doc(db, col.warehouseReadings(uid), wh.id), {
      warehouseId:  wh.id,
      temperature:  t, humidity: h, moisture: m, co2, aqi, capacity: cap,
      spoilageRisk, health: +health.toFixed(1),
      status: whStatus, trend: 'stable',
      updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
    });
  }

  await batch1.commit();

  // ── 30-day sensorHistory ─────────────────────────────────────────────────────
  // Each day: compute per-sensor historical value, then aggregate to warehouse
  const batch2 = writeBatch(db);
  for (let i = daysBack - 1; i >= 0; i--) {
    const day  = addDays(today, -i);
    const dKey = dateKey(day);

    const daySensorData = allSensors.map(s => ({
      sensorId:    s.sensorId,
      type:        s.type,
      value:       historicalSensorValue(s.type, s.baseValue, dKey, s.sensorId),
      zoneId:      s.zoneId,
      warehouseId: s.warehouseId,
    }));

    batch2.set(doc(db, col.sensorHistory(uid), dKey), buildDaySnapshot(dKey, daySensorData));
  }
  await batch2.commit();

  // ── Alerts ───────────────────────────────────────────────────────────────────
  const { active, history } = buildAlerts(today, daysBack);
  const batch3 = writeBatch(db);
  for (const a of active)   batch3.set(doc(db, col.alerts(uid),      (a as { id: string }).id), a);
  for (const h of history)  batch3.set(doc(db, col.alertHistory(uid), (h as { id: string }).id), h);
  await batch3.commit();

  // ── Reports ──────────────────────────────────────────────────────────────────
  const { reports, reportTypeData, reportTrendData, stats } = buildReports(today);
  const batch4 = writeBatch(db);
  for (const r of reports) batch4.set(doc(db, col.reports(uid), r.id), r);
  batch4.set(doc(db, col.reportsMeta(uid), 'global'), {
    stats, reportTypeData, reportTrendData, totalReports: 47,
    updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
  });
  batch4.set(metaRef, { version: SEED_VERSION, seededAt: now, email: 'test' });
  await batch4.commit();
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
  await setDoc(doc(db, col.reports(uid), report.id), { ...report, createdAt: Date.now() });
}

// ─── Daily snapshot append (called by Cloud Function / liveEngine fallback) ───

export async function appendTodaySnapshot(
  uid: string,
  warehouseAverages: Record<string, {
    warehouseId: string; temperature: number; humidity: number; moisture: number; co2: number; aqi: number;
    health: number; spoilageRisk: number; status: string;
  }>,
): Promise<void> {
  try {
    const key    = dateKey(new Date());
    const values = Object.values(warehouseAverages);
    if (!values.length) return;

    const n = values.length;
    const stability: Record<string, number> = {};
    let good = 0, warning = 0, critical = 0;
    let sumT = 0, sumH = 0, sumM = 0, sumCO2 = 0, sumAQI = 0;

    for (const w of values) {
      sumT += w.temperature; sumH += w.humidity; sumM += w.moisture; sumCO2 += w.co2; sumAQI += w.aqi;
      const tScore = clamp(100 - Math.max(0, w.temperature - 25) * 8, 0, 100);
      const hScore = clamp(100 - Math.max(0, w.humidity - 60) * 4, 0, 100);
      stability[w.warehouseId] = Math.round(tScore * 0.6 + hScore * 0.4);
      if (w.status === 'high') critical++;
      else if (w.status === 'medium') warning++;
      else good++;
    }

    await setDoc(doc(db, col.sensorHistory(uid), key), {
      date: key,
      averages: {
        temperature: +((sumT / n)).toFixed(1),
        humidity:    Math.round(sumH / n),
        moisture:    +((sumM / n)).toFixed(1),
        co2:         Math.round(sumCO2 / n),
        aqi:         Math.round(sumAQI / n),
      },
      warehouseSnapshots: Object.fromEntries(values.map(w => [w.warehouseId, w])),
      warehouseStatus: { good, warning, critical },
      stability,
      alertCounts: { Critical: critical * 2, Warning: warning * 3, Info: 8 },
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {
    // non-fatal
  }
}
