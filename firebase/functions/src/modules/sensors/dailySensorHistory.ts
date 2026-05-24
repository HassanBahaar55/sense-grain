/**
 * Scheduled Cloud Function — runs once a day at 00:05 UTC.
 *
 * For every approved user, takes the current readings under
 * `accounts/{uid}/warehouseReadings` and appends a snapshot to
 * `accounts/{uid}/sensorHistory/{YYYY-MM-DD}`.
 *
 * This gives the analytics/reports pages multi-day history without paying
 * for per-tick writes. History documents are permanent — never deleted.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ReadingSnapshot {
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
  const readingsSnap = await db.collection(`accounts/${uid}/warehouseReadings`).get();
  if (readingsSnap.empty) return;

  const warehouses: ReadingSnapshot[] = readingsSnap.docs.map(d => {
    const r = d.data();
    return {
      warehouseId:  r.warehouseId ?? d.id,
      temperature:  r.temperature ?? 0,
      humidity:     r.humidity ?? 0,
      moisture:     r.moisture ?? 0,
      co2:          r.co2 ?? 0,
      aqi:          r.aqi ?? 0,
      capacity:     r.capacity ?? 0,
      spoilageRisk: r.spoilageRisk ?? 0,
      health:       r.health ?? 0,
      status:       (r.status as ReadingSnapshot['status']) ?? 'good',
    };
  });

  // Average across the user's warehouses for quick aggregate queries
  const n = warehouses.length;
  const avg = (k: keyof ReadingSnapshot) =>
    +(warehouses.reduce((s, w) => s + (typeof w[k] === 'number' ? (w[k] as number) : 0), 0) / n).toFixed(2);

  await db.doc(`accounts/${uid}/sensorHistory/${dateKey}`).set({
    date:       dateKey,
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
    const dateKey = new Date().toISOString().slice(0, 10);
    const usersSnap = await db.collection('users').where('approvalStatus', '==', 'approved').get();
    if (usersSnap.empty) return;

    const uids = usersSnap.docs.map(d => d.id);
    let saved = 0;
    let failed = 0;
    for (let i = 0; i < uids.length; i += 5) {
      const slice = uids.slice(i, i + 5);
      const results = await Promise.allSettled(slice.map(uid => snapshotUser(uid, dateKey)));
      for (const r of results) {
        if (r.status === 'fulfilled') saved++;
        else { failed++; console.error('[dailySensorHistory]', r.reason); }
      }
    }
    console.log(`[dailySensorHistory] date=${dateKey} saved=${saved} failed=${failed} total=${uids.length}`);
  },
);
