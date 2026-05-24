/**
 * Scheduled Cloud Function — runs every 1 minute.
 *
 * Per-user architecture:
 *   For every approved user in `users/`, this function:
 *     1. Reads the user's warehouses from `accounts/{uid}/warehouses`
 *     2. Reads previous state from `accounts/{uid}/warehouseReadings/{whId}`
 *     3. Applies one physics tick (same model as the old browser liveEngine)
 *     4. Writes new state back to `accounts/{uid}/warehouseReadings/{whId}`
 *     5. Manages alerts: writes/updates active alerts in `accounts/{uid}/alerts/{id}`
 *        and appends permanent records to `accounts/{uid}/alertHistory/{id}`.
 *
 * Sensors keep generating data 24/7 — even when the user is offline.
 * When the user opens the app days later, they see the full alert history.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─── Alert thresholds ─────────────────────────────────────────────────────────

const THR = {
  temp:     { medium: 29,  high: 32  },
  humidity: { medium: 65,  high: 72  },
  moisture: { medium: 13,  high: 15  },
  co2:      { medium: 550, high: 650 },
  aqi:      { medium: 50,  high: 80  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function gauss(mean: number, std: number): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

function circadian(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return Math.sin(((h - 9) / 12) * Math.PI) * 1.8;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarehouseDoc {
  id?:          string;
  name?:        string;
  liveEngineId?:string;
  baseTemp?:    number;
  baseHum?:     number;
  baseMoist?:   number;
  baseCO2?:     number;
  baseAQI?:     number;
  baseCap?:     number;
  drift?:       number;
}

interface WarehouseState {
  warehouseId:  string;
  temperature:  number;
  humidity:     number;
  moisture:     number;
  co2:          number;
  aqi:          number;
  capacity:     number;
  spoilageRisk: number;
  health:       number;
  status:       'good' | 'medium' | 'high';
  trend:        'up' | 'down' | 'stable';
  tickCount:    number;
  updatedAt:    admin.firestore.FieldValue;
}

interface BaseConfig {
  id:        string;
  baseTemp:  number;
  baseHum:   number;
  baseMoist: number;
  baseCO2:   number;
  baseAQI:   number;
  baseCap:   number;
  drift:     number;
}

// Generate stable per-warehouse base values from the warehouse id
function deriveBaseConfig(wh: WarehouseDoc, fallbackId: string): BaseConfig {
  const id = wh.liveEngineId || wh.id || fallbackId;
  // Hash the id to a stable seed so each warehouse has its own personality
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  const seed = Math.abs(h) % 1000;
  return {
    id,
    baseTemp:  wh.baseTemp  ?? 26 + (seed % 50) / 10,        // 26 – 31
    baseHum:   wh.baseHum   ?? 55 + (seed % 15),             // 55 – 69
    baseMoist: wh.baseMoist ?? 10.5 + (seed % 40) / 10,      // 10.5 – 14.4
    baseCO2:   wh.baseCO2   ?? 480 + (seed % 100),           // 480 – 579
    baseAQI:   wh.baseAQI   ?? 32 + (seed % 18),             // 32 – 49
    baseCap:   wh.baseCap   ?? 55 + (seed % 35),             // 55 – 89
    drift:     wh.drift     ?? ((seed % 30) - 15) / 200,     // -0.075 to 0.075
  };
}

// ─── Physics tick ─────────────────────────────────────────────────────────────

function applyTick(cfg: BaseConfig, prev: Partial<WarehouseState>): WarehouseState {
  const tickCount = (prev.tickCount ?? 0) + 1;
  const circ = circadian();

  const prevTemp = prev.temperature ?? cfg.baseTemp;

  const tempTarget = cfg.baseTemp + circ + cfg.drift * tickCount * 0.01;
  const temperature = clamp(
    +(prevTemp + gauss(0, 0.12) + (tempTarget - prevTemp) * 0.04).toFixed(1),
    cfg.baseTemp - 5, cfg.baseTemp + 9,
  );

  const tempRise = temperature - prevTemp;
  const humidity = clamp(
    Math.round((prev.humidity ?? cfg.baseHum) + gauss(0, 0.4) - tempRise * 0.6 +
               (cfg.baseHum - (prev.humidity ?? cfg.baseHum)) * 0.03),
    40, 94,
  );

  const moisture = clamp(
    +((prev.moisture ?? cfg.baseMoist) + gauss(0, 0.025) +
      (cfg.baseMoist - (prev.moisture ?? cfg.baseMoist)) * 0.015).toFixed(1),
    9, 16.5,
  );

  const capacity = tickCount % 10 === 0
    ? clamp((prev.capacity ?? cfg.baseCap) + Math.round(gauss(0, 0.3)), 25, 98)
    : (prev.capacity ?? cfg.baseCap);

  const capContrib = (capacity - 60) * 0.04;
  const co2 = clamp(
    Math.round((prev.co2 ?? cfg.baseCO2) + gauss(0, 2.5) + capContrib +
               (cfg.baseCO2 - (prev.co2 ?? cfg.baseCO2)) * 0.02),
    400, 850,
  );

  const co2Factor  = Math.max(0, co2 - cfg.baseCO2) * 0.05;
  const tempFactor = Math.max(0, temperature - 28) * 1.1;
  const aqi = clamp(Math.round(cfg.baseAQI + co2Factor + tempFactor + gauss(0, 1)), 20, 120);

  const tfRisk   = Math.max(0, (temperature - 25) / 10) * 40;
  const hfRisk   = Math.max(0, (humidity    - 55) / 15) * 28;
  const mfRisk   = Math.max(0, (moisture    - 10) /  5) * 22;
  const co2FRisk = Math.max(0, (co2 - 500) / 150) * 10;
  const spoilageRisk = clamp(Math.round(tfRisk + hfRisk + mfRisk + co2FRisk), 0, 100);
  const health = clamp(Math.round(100 - spoilageRisk * 0.65), 15, 100);

  const status: WarehouseState['status'] =
    temperature >= THR.temp.high || humidity >= THR.humidity.high || moisture >= THR.moisture.high
      ? 'high'
      : temperature >= THR.temp.medium || humidity >= THR.humidity.medium || moisture >= THR.moisture.medium
      ? 'medium'
      : 'good';

  const delta = temperature - prevTemp;
  const trend: WarehouseState['trend'] = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable';

  return {
    warehouseId: cfg.id, temperature, humidity, moisture, co2, aqi,
    capacity, spoilageRisk, health, status, trend, tickCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ─── Alert management ─────────────────────────────────────────────────────────

interface AlertCheck {
  param: string; value: number; unit: string;
  thr: number; sev: 'critical' | 'high' | 'medium'; msg: string;
}

function buildChecks(state: WarehouseState): AlertCheck[] {
  return [
    { param: 'Temperature', value: state.temperature, unit: '°C',  thr: THR.temp.high,        sev: 'critical', msg: `Temperature critical at ${state.temperature.toFixed(1)}°C` },
    { param: 'Temperature', value: state.temperature, unit: '°C',  thr: THR.temp.medium,      sev: 'medium',   msg: `Temperature elevated at ${state.temperature.toFixed(1)}°C` },
    { param: 'Humidity',    value: state.humidity,    unit: '%',   thr: THR.humidity.high,    sev: 'high',     msg: `Humidity exceeded ${THR.humidity.high}% at ${state.humidity}%` },
    { param: 'Humidity',    value: state.humidity,    unit: '%',   thr: THR.humidity.medium,  sev: 'medium',   msg: `Humidity warning at ${state.humidity}%` },
    { param: 'Moisture',    value: state.moisture,    unit: '%',   thr: THR.moisture.high,    sev: 'high',     msg: `Moisture critical at ${state.moisture.toFixed(1)}%` },
    { param: 'Moisture',    value: state.moisture,    unit: '%',   thr: THR.moisture.medium,  sev: 'medium',   msg: `Moisture rising at ${state.moisture.toFixed(1)}%` },
    { param: 'CO2',         value: state.co2,         unit: 'ppm', thr: THR.co2.medium,       sev: 'medium',   msg: `CO₂ elevated at ${state.co2} ppm` },
    { param: 'AQI',         value: state.aqi,         unit: '',    thr: THR.aqi.medium,       sev: 'medium',   msg: `Air quality index at ${state.aqi}` },
  ];
}

async function syncAlertsForUser(
  uid: string,
  state: WarehouseState,
  batch: admin.firestore.WriteBatch,
): Promise<void> {
  const checks = buildChecks(state);
  const now    = Date.now();
  const today  = new Date().toISOString().slice(0, 10);

  for (const c of checks) {
    // Stable id per day so an alert that persists doesn't spam history
    const baseId  = `${state.warehouseId}_${c.param.toLowerCase().replace(/[^a-z0-9]/g, '')}_${c.sev}`;
    const dayId   = `${baseId}_${today}`;
    const activeRef  = db.collection(`accounts/${uid}/alerts`).doc(dayId);
    const historyRef = db.collection(`accounts/${uid}/alertHistory`).doc(dayId);

    if (c.value > c.thr) {
      // Reading breaches threshold — create or refresh the alert
      const payload = {
        id:          dayId,
        warehouseId: state.warehouseId,
        param:       c.param,
        value:       c.value,
        unit:        c.unit,
        threshold:   c.thr,
        severity:    c.sev,
        message:     c.msg,
        timestamp:   now,
        resolved:    false,
        status:      'active' as const,
        date:        today,
        updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(activeRef,  payload,                                              { merge: true });
      batch.set(historyRef, { ...payload, triggeredAt: now, resolvedAt: null },   { merge: true });
    } else if (c.value < c.thr * 0.95) {
      // Reading dropped — auto-resolve in active + record resolution in history
      batch.set(activeRef,  { resolved: true,  status: 'resolved', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      batch.set(historyRef, { resolved: true,  status: 'resolved', resolvedAt: now, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  }
}

// ─── Process one user ─────────────────────────────────────────────────────────

async function processUser(uid: string): Promise<void> {
  const whSnap = await db.collection(`accounts/${uid}/warehouses`).get();
  if (whSnap.empty) return;

  const batch = db.batch();
  const tasks: Array<Promise<void>> = [];

  for (const whDoc of whSnap.docs) {
    const whData = whDoc.data() as WarehouseDoc;
    const cfg    = deriveBaseConfig(whData, whDoc.id);

    // Cloud Function uses the Firestore document id as the warehouse key,
    // so the UI can match a managed warehouse to its readings directly.
    cfg.id = whDoc.id;

    const readingRef = db.doc(`accounts/${uid}/warehouseReadings/${whDoc.id}`);
    const prevSnap   = await readingRef.get();
    const prev       = prevSnap.exists ? (prevSnap.data() as Partial<WarehouseState>) : {};

    const next = applyTick(cfg, prev);
    batch.set(readingRef, next);

    tasks.push(syncAlertsForUser(uid, next, batch));
  }

  await Promise.all(tasks);
  await batch.commit();
}

// ─── Scheduled function ───────────────────────────────────────────────────────

export const simulateSensorData = onSchedule(
  { schedule: 'every 1 minutes', region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    // Find every approved user
    const usersSnap = await db.collection('users').where('approvalStatus', '==', 'approved').get();

    if (usersSnap.empty) {
      console.log('[simulateSensorData] No approved users.');
      return;
    }

    let processed = 0;
    let failed    = 0;

    // Process users in parallel batches of 5 so we don't fan out unbounded
    const uids = usersSnap.docs.map(d => d.id);
    const BATCH = 5;
    for (let i = 0; i < uids.length; i += BATCH) {
      const slice = uids.slice(i, i + BATCH);
      const results = await Promise.allSettled(slice.map(uid => processUser(uid)));
      for (const r of results) {
        if (r.status === 'fulfilled') processed++;
        else { failed++; console.error('[simulateSensorData]', r.reason); }
      }
    }

    console.log(`[simulateSensorData] processed=${processed} failed=${failed} total=${uids.length}`);
  },
);
