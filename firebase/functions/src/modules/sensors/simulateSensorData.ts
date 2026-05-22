/**
 * Scheduled Cloud Function — runs every 1 minute.
 * Reads the previous warehouse state from Firestore, applies one physics
 * tick (same model as the former browser liveEngine), and writes the new
 * state back.  Both web and mobile apps listen with onSnapshot and receive
 * the update instantly — no polling needed.
 *
 * Firestore layout
 *   warehouseReadings/{warehouseId}   ← current state (overwritten each tick)
 *   alerts/{alertId}                  ← active alerts (set/merged per warehouse+param)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─── Warehouse base configs ───────────────────────────────────────────────────

const WH_CONFIGS = [
  { id: 'WH-A', baseTemp: 26.0, baseHum: 58, baseMoist: 11.2, baseCO2: 490, baseAQI: 35, baseCap: 72, drift: 0.0   },
  { id: 'WH-B', baseTemp: 28.5, baseHum: 64, baseMoist: 12.5, baseCO2: 530, baseAQI: 42, baseCap: 67, drift: 0.1   },
  { id: 'WH-C', baseTemp: 26.5, baseHum: 56, baseMoist: 10.8, baseCO2: 505, baseAQI: 38, baseCap: 81, drift: -0.05 },
  { id: 'WH-D', baseTemp: 29.8, baseHum: 69, baseMoist: 14.1, baseCO2: 575, baseAQI: 48, baseCap: 61, drift: 0.15  },
  { id: 'WH-E', baseTemp: 27.0, baseHum: 59, baseMoist: 11.5, baseCO2: 510, baseAQI: 36, baseCap: 70, drift: 0.02  },
  { id: 'WH-F', baseTemp: 29.2, baseHum: 66, baseMoist: 13.3, baseCO2: 545, baseAQI: 44, baseCap: 73, drift: 0.08  },
  { id: 'WH-G', baseTemp: 26.2, baseHum: 55, baseMoist: 11.0, baseCO2: 485, baseAQI: 32, baseCap: 52, drift: -0.02 },
];

// ─── Alert thresholds ─────────────────────────────────────────────────────────

const THR = {
  temp:     { medium: 29, high: 32  },
  humidity: { medium: 65, high: 72  },
  moisture: { medium: 13, high: 15  },
  co2:      { medium: 550, high: 650 },
  aqi:      { medium: 50, high: 80  },
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

// ─── Reading type ─────────────────────────────────────────────────────────────

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

// ─── Physics tick ─────────────────────────────────────────────────────────────

function applyTick(
  cfg: typeof WH_CONFIGS[number],
  prev: Partial<WarehouseState>,
): WarehouseState {
  const tickCount = (prev.tickCount ?? 0) + 1;
  const circ = circadian();

  const prevTemp = prev.temperature ?? cfg.baseTemp;

  // Temperature
  const tempTarget = cfg.baseTemp + circ + cfg.drift * tickCount * 0.01;
  const temperature = clamp(
    +(prevTemp + gauss(0, 0.12) + (tempTarget - prevTemp) * 0.04).toFixed(1),
    cfg.baseTemp - 5, cfg.baseTemp + 9,
  );

  // Humidity — inversely correlated with temp rise
  const tempRise = temperature - prevTemp;
  const humidity = clamp(
    Math.round((prev.humidity ?? cfg.baseHum) + gauss(0, 0.4) - tempRise * 0.6 + (cfg.baseHum - (prev.humidity ?? cfg.baseHum)) * 0.03),
    40, 94,
  );

  // Moisture — very slow drift
  const moisture = clamp(
    +((prev.moisture ?? cfg.baseMoist) + gauss(0, 0.025) + (cfg.baseMoist - (prev.moisture ?? cfg.baseMoist)) * 0.015).toFixed(1),
    9, 16.5,
  );

  // CO₂ — capacity contribution
  const capacity = tickCount % 10 === 0
    ? clamp((prev.capacity ?? cfg.baseCap) + Math.round(gauss(0, 0.3)), 25, 98)
    : (prev.capacity ?? cfg.baseCap);

  const capContrib = (capacity - 60) * 0.04;
  const co2 = clamp(
    Math.round((prev.co2 ?? cfg.baseCO2) + gauss(0, 2.5) + capContrib + (cfg.baseCO2 - (prev.co2 ?? cfg.baseCO2)) * 0.02),
    400, 850,
  );

  // AQI
  const co2Factor  = Math.max(0, co2 - cfg.baseCO2) * 0.05;
  const tempFactor = Math.max(0, temperature - 28) * 1.1;
  const aqi = clamp(Math.round(cfg.baseAQI + co2Factor + tempFactor + gauss(0, 1)), 20, 120);

  // Derived: spoilageRisk + health
  const tfRisk   = Math.max(0, (temperature - 25) / 10) * 40;
  const hfRisk   = Math.max(0, (humidity - 55) / 15) * 28;
  const mfRisk   = Math.max(0, (moisture - 10) / 5) * 22;
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

async function syncAlerts(
  batch: admin.firestore.WriteBatch,
  state: WarehouseState,
): Promise<void> {
  const checks: Array<{
    param: string; value: number; unit: string;
    thr: number; sev: 'critical' | 'high' | 'medium'; msg: string;
  }> = [
    { param: 'Temperature', value: state.temperature, unit: '°C',  thr: THR.temp.high,      sev: 'critical', msg: `Temperature critical at ${state.temperature.toFixed(1)}°C` },
    { param: 'Temperature', value: state.temperature, unit: '°C',  thr: THR.temp.medium,    sev: 'medium',   msg: `Temperature elevated at ${state.temperature.toFixed(1)}°C` },
    { param: 'Humidity',    value: state.humidity,    unit: '%',   thr: THR.humidity.high,  sev: 'high',     msg: `Humidity exceeded ${THR.humidity.high}% at ${state.humidity}%` },
    { param: 'Humidity',    value: state.humidity,    unit: '%',   thr: THR.humidity.medium, sev: 'medium',  msg: `Humidity warning at ${state.humidity}%` },
    { param: 'Moisture',    value: state.moisture,    unit: '%',   thr: THR.moisture.high,  sev: 'high',     msg: `Moisture critical at ${state.moisture.toFixed(1)}%` },
    { param: 'Moisture',    value: state.moisture,    unit: '%',   thr: THR.moisture.medium, sev: 'medium',  msg: `Moisture rising at ${state.moisture.toFixed(1)}%` },
    { param: 'CO2',         value: state.co2,         unit: 'ppm', thr: THR.co2.medium,     sev: 'medium',   msg: `CO₂ elevated at ${state.co2} ppm` },
    { param: 'AQI',         value: state.aqi,         unit: '',    thr: THR.aqi.medium,     sev: 'medium',   msg: `Air quality index at ${state.aqi}` },
  ];

  for (const c of checks) {
    const alertId = `${state.warehouseId}_${c.param}_${c.sev}`;
    const ref = db.collection('alerts').doc(alertId);

    if (c.value > c.thr) {
      batch.set(ref, {
        id: alertId,
        warehouseId: state.warehouseId,
        param: c.param,
        value: c.value,
        unit: c.unit,
        threshold: c.thr,
        severity: c.sev,
        message: c.msg,
        resolved: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (c.value < c.thr * 0.95) {
      batch.set(ref, { resolved: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  }
}

// ─── Exported scheduled function ──────────────────────────────────────────────

export const simulateSensorData = onSchedule(
  { schedule: 'every 1 minutes', region: 'us-central1' },
  async () => {
    const batch = db.batch();

    for (const cfg of WH_CONFIGS) {
      // Read previous state (gives physics continuity across invocations)
      const snap = await db.collection('warehouseReadings').doc(cfg.id).get();
      const prev = snap.exists ? (snap.data() as Partial<WarehouseState>) : {};

      const next = applyTick(cfg, prev);

      // Overwrite latest state
      batch.set(db.collection('warehouseReadings').doc(cfg.id), next);

      // Manage alerts
      await syncAlerts(batch, next);
    }

    await batch.commit();
  },
);
