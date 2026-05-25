/**
 * Scheduled Cloud Function — runs once a day at 00:05 UTC.
 *
 * For every approved user, reads the current per-sensor readings under
 * `accounts/{uid}/sensorReadings` and appends a warehouse-aggregated snapshot
 * to `accounts/{uid}/sensorHistory/{YYYY-MM-DD}`.
 *
 * History documents are permanent — never deleted.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type SensorType = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';

interface SensorReadingDoc {
  sensorId:    string;
  zoneId:      string;
  warehouseId: string;
  type:        SensorType;
  value:       number;
  values?:     { temperature?: number; humidity?: number; moisture?: number; co2?: number; aqi?: number };
}

interface WarehouseSnapshot {
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
}

async function snapshotUser(uid: string, dateKey: string): Promise<void> {
  const readingsSnap = await db.collection(`accounts/${uid}/sensorReadings`).get();
  if (readingsSnap.empty) return;

  const readings = readingsSnap.docs.map(d => d.data() as SensorReadingDoc);

  // Use cached warehouse aggregates for derived fields (spoilageRisk, health, capacity, status)
  const aggSnap = await db.collection(`accounts/${uid}/warehouseReadings`).get();
  const aggByWh: Record<string, admin.firestore.DocumentData> = {};
  aggSnap.docs.forEach(d => { aggByWh[d.id] = d.data(); });

  // Group sensor readings by warehouseId
  const byWarehouse: Record<string, SensorReadingDoc[]> = {};
  for (const r of readings) {
    (byWarehouse[r.warehouseId] ??= []).push(r);
  }

  const warehouses: WarehouseSnapshot[] = [];

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

    const cached = aggByWh[whId] ?? {};
    warehouses.push({
      warehouseId:  whId,
      temperature:  avg('temperature'),
      humidity:     avg('humidity'),
      moisture:     avg('moisture'),
      co2:          avg('co2'),
      aqi:          avg('aqi'),
      capacity:     cached.capacity     ?? 65,
      spoilageRisk: cached.spoilageRisk ?? 0,
      health:       cached.health       ?? 100,
      status:       (cached.status as WarehouseSnapshot['status']) ?? 'good',
    });
  }

  if (!warehouses.length) return;

  const n   = warehouses.length;
  const avg = (k: keyof WarehouseSnapshot): number =>
    +(warehouses.reduce((s, w) => s + (typeof w[k] === 'number' ? (w[k] as number) : 0), 0) / n).toFixed(2);

  await db.doc(`accounts/${uid}/sensorHistory/${dateKey}`).set({
    date:            dateKey,
    warehouses,
    avgTemperature:  avg('temperature'),
    avgHumidity:     avg('humidity'),
    avgMoisture:     avg('moisture'),
    avgCo2:          avg('co2'),
    avgAqi:          avg('aqi'),
    avgCapacity:     avg('capacity'),
    avgSpoilageRisk: avg('spoilageRisk'),
    avgHealth:       avg('health'),
    createdAt:       admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

export const dailySensorHistory = onSchedule(
  { schedule: '5 0 * * *', timeZone: 'UTC', region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const dateKey   = new Date().toISOString().slice(0, 10);
    const usersSnap = await db.collection('users').where('approvalStatus', '==', 'approved').get();
    if (usersSnap.empty) return;

    const uids  = usersSnap.docs.map(d => d.id);
    let saved   = 0;
    let failed  = 0;

    for (let i = 0; i < uids.length; i += 5) {
      const slice   = uids.slice(i, i + 5);
      const results = await Promise.allSettled(slice.map(uid => snapshotUser(uid, dateKey)));
      for (const r of results) {
        if (r.status === 'fulfilled') saved++;
        else { failed++; console.error('[dailySensorHistory]', r.reason); }
      }
    }
    console.log(`[dailySensorHistory] date=${dateKey} saved=${saved} failed=${failed} total=${uids.length}`);
  },
);
