/**
 * Scheduled Cloud Function — runs every 10 minutes.
 *
 * Per-sensor architecture:
 *   For every approved user in `users/`, this function:
 *     1. Reads the user's active sensors from `accounts/{uid}/sensors`
 *     2. For each active sensor, reads its current reading from `accounts/{uid}/sensorReadings/{sensorId}`
 *     3. Applies one physics tick per sensor type
 *     4. Writes new reading back to `accounts/{uid}/sensorReadings/{sensorId}`
 *     5. Aggregates sensor readings to warehouse-level averages
 *     6. Writes computed cache to `accounts/{uid}/warehouseReadings/{whId}`
 *     7. Manages alerts based on warehouse averages
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

type SensorType = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';

interface SensorDoc {
  zoneId:      string;
  warehouseId: string;
  type:        SensorType;
  status:      string;
  baseValue:   number;
}

interface SensorReading {
  sensorId:    string;
  zoneId:      string;
  warehouseId: string;
  type:        SensorType;
  value:       number;
  values?:     { temperature?: number; humidity?: number; moisture?: number; co2?: number; aqi?: number };
  unit:        string;
  status:      'normal' | 'warning' | 'critical';
}

interface WarehouseAggregate {
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
  updatedAt:    admin.firestore.FieldValue;
}

// ─── Per-sensor physics tick ──────────────────────────────────────────────────

function unitForType(type: SensorType): string {
  switch (type) {
    case 'temperature': return '°C';
    case 'humidity':    return '%';
    case 'moisture':    return '%';
    case 'co2':         return 'ppm';
    case 'aqi':         return '';
    case 'multi':       return '°C';
  }
}

function readingStatus(type: SensorType, value: number): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'temperature':
      return value >= THR.temp.high ? 'critical' : value >= THR.temp.medium ? 'warning' : 'normal';
    case 'humidity':
      return value >= THR.humidity.high ? 'critical' : value >= THR.humidity.medium ? 'warning' : 'normal';
    case 'moisture':
      return value >= THR.moisture.high ? 'critical' : value >= THR.moisture.medium ? 'warning' : 'normal';
    case 'co2':
      return value >= THR.co2.high ? 'critical' : value >= THR.co2.medium ? 'warning' : 'normal';
    case 'aqi':
      return value >= THR.aqi.high ? 'critical' : value >= THR.aqi.medium ? 'warning' : 'normal';
    case 'multi':
      return value >= THR.temp.high ? 'critical' : value >= THR.temp.medium ? 'warning' : 'normal';
  }
}

function tickSensor(
  sensor: SensorDoc,
  sensorId: string,
  prev: Partial<SensorReading>,
): SensorReading {
  const base = sensor.baseValue;
  const circ = circadian();

  let value: number;
  let values: SensorReading['values'] | undefined;

  switch (sensor.type) {
    case 'temperature': {
      const prevVal = prev.value ?? base;
      const target  = base + circ;
      value = clamp(
        +(prevVal + gauss(0, 0.12) + (target - prevVal) * 0.04).toFixed(1),
        base - 5, base + 9,
      );
      break;
    }
    case 'humidity': {
      const prevVal = prev.value ?? base;
      value = clamp(
        Math.round(prevVal + gauss(0, 0.4) + (base - prevVal) * 0.03),
        40, 94,
      );
      break;
    }
    case 'moisture': {
      const prevVal = prev.value ?? base;
      value = clamp(
        +((prevVal + gauss(0, 0.025) + (base - prevVal) * 0.015).toFixed(1)),
        9, 16.5,
      );
      break;
    }
    case 'co2': {
      const prevVal = prev.value ?? base;
      value = clamp(
        Math.round(prevVal + gauss(0, 2.5) + (base - prevVal) * 0.02),
        400, 850,
      );
      break;
    }
    case 'aqi': {
      const prevVal = prev.value ?? base;
      value = clamp(
        Math.round(prevVal + gauss(0, 1) + (base - prevVal) * 0.02),
        20, 120,
      );
      break;
    }
    case 'multi': {
      const prevTemp  = prev.values?.temperature ?? base;
      const prevHum   = prev.values?.humidity    ?? 58;
      const prevMoist = prev.values?.moisture    ?? 11;
      const prevCO2   = prev.values?.co2         ?? 500;
      const prevAQI   = prev.values?.aqi         ?? 35;

      const temperature = clamp(+(prevTemp + gauss(0, 0.12) + (base + circ - prevTemp) * 0.04).toFixed(1), base - 5, base + 9);
      const humidity    = clamp(Math.round(prevHum   + gauss(0, 0.4)  + (58  - prevHum)   * 0.03), 40, 94);
      const moisture    = clamp(+(prevMoist + gauss(0, 0.025) + (11  - prevMoist) * 0.015).toFixed(1), 9, 16.5);
      const co2         = clamp(Math.round(prevCO2   + gauss(0, 2.5)  + (500 - prevCO2)   * 0.02), 400, 850);
      const aqi         = clamp(Math.round(prevAQI   + gauss(0, 1)    + (35  - prevAQI)   * 0.02), 20, 120);

      value  = temperature;
      values = { temperature, humidity, moisture, co2, aqi };
      break;
    }
    default:
      value = base;
  }

  return {
    sensorId,
    zoneId:      sensor.zoneId,
    warehouseId: sensor.warehouseId,
    type:        sensor.type,
    value,
    values,
    unit:        unitForType(sensor.type),
    status:      readingStatus(sensor.type, value),
  };
}

// ─── Warehouse aggregate computation ─────────────────────────────────────────

function computeWarehouseAggregates(
  readings: SensorReading[],
  prevAggregates: Record<string, Partial<WarehouseAggregate>>,
): Record<string, WarehouseAggregate> {
  const byWarehouse: Record<string, SensorReading[]> = {};
  for (const r of readings) {
    (byWarehouse[r.warehouseId] ??= []).push(r);
  }

  const result: Record<string, WarehouseAggregate> = {};

  for (const [whId, whReadings] of Object.entries(byWarehouse)) {
    const avg = (type: SensorType): number => {
      const vals: number[] = [];
      for (const r of whReadings) {
        if (r.type === type) {
          vals.push(r.value);
        } else if (r.type === 'multi' && r.values) {
          const v = r.values[type as keyof typeof r.values];
          if (v !== undefined) vals.push(v);
        }
      }
      if (!vals.length) return 0;
      return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    };

    const temperature  = avg('temperature');
    const humidity     = avg('humidity');
    const moisture     = avg('moisture');
    const co2          = avg('co2');
    const aqi          = avg('aqi');
    const capacity     = prevAggregates[whId]?.capacity ?? 65;

    const tfRisk   = Math.max(0, (temperature - 25) / 10) * 40;
    const hfRisk   = Math.max(0, (humidity    - 55) / 15) * 28;
    const mfRisk   = Math.max(0, (moisture    - 10) /  5) * 22;
    const co2FRisk = Math.max(0, (co2 - 500) / 150) * 10;
    const spoilageRisk = clamp(Math.round(tfRisk + hfRisk + mfRisk + co2FRisk), 0, 100);
    const health       = clamp(Math.round(100 - spoilageRisk * 0.65), 15, 100);

    const status: WarehouseAggregate['status'] =
      temperature >= THR.temp.high || humidity >= THR.humidity.high || moisture >= THR.moisture.high
        ? 'high'
        : temperature >= THR.temp.medium || humidity >= THR.humidity.medium || moisture >= THR.moisture.medium
        ? 'medium'
        : 'good';

    const prevTemp = prevAggregates[whId]?.temperature ?? temperature;
    const delta    = temperature - prevTemp;
    const trend: WarehouseAggregate['trend'] = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable';

    result[whId] = {
      warehouseId: whId,
      temperature, humidity, moisture, co2, aqi,
      capacity, spoilageRisk, health, status, trend,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  return result;
}

// ─── Alert management ─────────────────────────────────────────────────────────

interface AlertCheck {
  param: string; value: number; unit: string;
  thr: number; sev: 'critical' | 'high' | 'medium'; msg: string;
}

function buildChecks(agg: WarehouseAggregate): AlertCheck[] {
  return [
    { param: 'Temperature', value: agg.temperature, unit: '°C',  thr: THR.temp.high,       sev: 'critical', msg: `Temperature critical at ${agg.temperature.toFixed(1)}°C` },
    { param: 'Temperature', value: agg.temperature, unit: '°C',  thr: THR.temp.medium,     sev: 'medium',   msg: `Temperature elevated at ${agg.temperature.toFixed(1)}°C` },
    { param: 'Humidity',    value: agg.humidity,    unit: '%',   thr: THR.humidity.high,   sev: 'high',     msg: `Humidity exceeded ${THR.humidity.high}% at ${agg.humidity}%` },
    { param: 'Humidity',    value: agg.humidity,    unit: '%',   thr: THR.humidity.medium, sev: 'medium',   msg: `Humidity warning at ${agg.humidity}%` },
    { param: 'Moisture',    value: agg.moisture,    unit: '%',   thr: THR.moisture.high,   sev: 'high',     msg: `Moisture critical at ${agg.moisture.toFixed(1)}%` },
    { param: 'Moisture',    value: agg.moisture,    unit: '%',   thr: THR.moisture.medium, sev: 'medium',   msg: `Moisture rising at ${agg.moisture.toFixed(1)}%` },
    { param: 'CO2',         value: agg.co2,         unit: 'ppm', thr: THR.co2.medium,      sev: 'medium',   msg: `CO₂ elevated at ${agg.co2} ppm` },
    { param: 'AQI',         value: agg.aqi,         unit: '',    thr: THR.aqi.medium,      sev: 'medium',   msg: `Air quality index at ${agg.aqi}` },
  ];
}

async function syncAlertsForUser(
  uid: string,
  agg: WarehouseAggregate,
  batch: admin.firestore.WriteBatch,
): Promise<void> {
  const checks = buildChecks(agg);
  const now    = Date.now();
  const today  = new Date().toISOString().slice(0, 10);

  for (const c of checks) {
    const baseId  = `${agg.warehouseId}_${c.param.toLowerCase().replace(/[^a-z0-9]/g, '')}_${c.sev}`;
    const dayId   = `${baseId}_${today}`;
    const activeRef  = db.collection(`accounts/${uid}/alerts`).doc(dayId);
    const historyRef = db.collection(`accounts/${uid}/alertHistory`).doc(dayId);

    if (c.value > c.thr) {
      const payload = {
        id:          dayId,
        warehouseId: agg.warehouseId,
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
      batch.set(activeRef,  payload,                                            { merge: true });
      batch.set(historyRef, { ...payload, triggeredAt: now, resolvedAt: null }, { merge: true });
    } else if (c.value < c.thr * 0.95) {
      batch.set(activeRef,  { resolved: true, status: 'resolved', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      batch.set(historyRef, { resolved: true, status: 'resolved', resolvedAt: now, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  }
}

// ─── Process one user ─────────────────────────────────────────────────────────

async function processUser(uid: string): Promise<void> {
  const sensorSnap = await db.collection(`accounts/${uid}/sensors`).where('status', '==', 'active').get();
  if (sensorSnap.empty) return;

  // Load current readings in one getAll call
  const readingRefs = sensorSnap.docs.map(d => db.doc(`accounts/${uid}/sensorReadings/${d.id}`));
  const readingSnaps = await db.getAll(...readingRefs);
  const prevReadings: Record<string, Partial<SensorReading>> = {};
  for (const snap of readingSnaps) {
    if (snap.exists) prevReadings[snap.id] = snap.data() as SensorReading;
  }

  // Load previous warehouse aggregates for trend/capacity continuity
  const aggSnap = await db.collection(`accounts/${uid}/warehouseReadings`).get();
  const prevAggregates: Record<string, Partial<WarehouseAggregate>> = {};
  aggSnap.docs.forEach(d => { prevAggregates[d.id] = d.data() as WarehouseAggregate; });

  // Apply physics tick to each sensor
  const updatedReadings: SensorReading[] = [];
  for (const sDoc of sensorSnap.docs) {
    const sensor = sDoc.data() as SensorDoc;
    const next   = tickSensor(sensor, sDoc.id, prevReadings[sDoc.id] ?? {});
    updatedReadings.push(next);
  }

  // Write all sensor readings in batches (Firestore limit: 500 ops)
  const BATCH_SIZE = 400;
  for (let i = 0; i < updatedReadings.length; i += BATCH_SIZE) {
    const slice = updatedReadings.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const r of slice) {
      batch.set(db.doc(`accounts/${uid}/sensorReadings/${r.sensorId}`), {
        ...r,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // Compute warehouse aggregates then write them + alerts together
  const aggregates = computeWarehouseAggregates(updatedReadings, prevAggregates);
  const aggBatch   = db.batch();
  const alertTasks: Array<Promise<void>> = [];

  for (const [whId, agg] of Object.entries(aggregates)) {
    aggBatch.set(db.doc(`accounts/${uid}/warehouseReadings/${whId}`), agg);
    alertTasks.push(syncAlertsForUser(uid, agg, aggBatch));
  }

  await Promise.all(alertTasks);
  await aggBatch.commit();
}

// ─── Scheduled function ───────────────────────────────────────────────────────

export const simulateSensorData = onSchedule(
  { schedule: 'every 10 minutes', region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const usersSnap = await db.collection('users').where('approvalStatus', '==', 'approved').get();

    if (usersSnap.empty) {
      console.log('[simulateSensorData] No approved users.');
      return;
    }

    let processed = 0;
    let failed    = 0;

    const uids  = usersSnap.docs.map(d => d.id);
    const BATCH = 5;
    for (let i = 0; i < uids.length; i += BATCH) {
      const slice   = uids.slice(i, i + BATCH);
      const results = await Promise.allSettled(slice.map(uid => processUser(uid)));
      for (const r of results) {
        if (r.status === 'fulfilled') processed++;
        else { failed++; console.error('[simulateSensorData]', r.reason); }
      }
    }

    console.log(`[simulateSensorData] processed=${processed} failed=${failed} total=${uids.length}`);
  },
);
