'use client';

/**
 * One-time Firestore seeder.
 * Runs on first login — checks `meta/seeded` before writing anything.
 * Seeds: sensorHistory (14 days), reports (10 docs), reportsMeta/global.
 * All subsequent data comes from liveEngine ticks (warehouseReadings, alerts)
 * or user actions (new reports).
 */

import {
  getFirestore, doc, getDoc, setDoc, writeBatch,
  serverTimestamp, collection, query, where, orderBy, getDocs, deleteDoc,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import {
  getWarehouseReadings, getReportsData,
  type ReportItem,
} from './dataEngine';

const db = getFirestore(firebaseApp);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random integer in [min, max] based on date string + salt */
function seededVariation(dateStr: string, salt: number, min: number, max: number): number {
  const seed = dateStr.split('-').reduce((acc, p) => acc + parseInt(p, 10) * salt, 0);
  return min + (Math.abs(Math.sin(seed) * 10000) % (max - min + 1) | 0);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Main seeder ──────────────────────────────────────────────────────────────

export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // Check version — bump SEED_VERSION to force a reseed
    const SEED_VERSION = 3;
    const metaRef  = doc(db, 'meta', 'seeded');
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists() && (metaSnap.data()?.version ?? 0) >= SEED_VERSION) return;

    const today = new Date();
    const batch = writeBatch(db);

    // ── 1. sensorHistory — 30 days of daily warehouse snapshots ─────────────
    for (let i = 29; i >= 0; i--) {
      const day = addDays(today, -i);
      const key = dateKey(day);
      const warehouses = getWarehouseReadings(day);
      const active = warehouses.filter(w => w.temp !== null);

      const avgTemp     = active.length ? +(active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length).toFixed(1) : 0;
      const avgHumidity = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 0;
      const avgMoisture = active.length ? +(active.reduce((s, w) => s + (w.moisture ?? 0), 0) / active.length).toFixed(1) : 0;
      const avgCO2      = active.length ? Math.round(active.reduce((s, w) => s + (w.co2 ?? 520), 0) / active.length) : 0;
      const avgAQI      = active.length ? Math.round(active.reduce((s, w) => s + (w.aqi ?? 40), 0) / active.length) : 0;
      const goodCount   = warehouses.filter(w => w.status === 'good').length;
      const warnCount   = warehouses.filter(w => w.status === 'medium').length;
      const critCount   = warehouses.filter(w => w.status === 'high').length;

      batch.set(doc(db, 'sensorHistory', key), {
        date: key,
        averages: { temperature: avgTemp, humidity: avgHumidity, moisture: avgMoisture, co2: avgCO2, aqi: avgAQI },
        warehouseStatus: { good: goodCount, warning: warnCount, critical: critCount },
        // Stability scores per WH (for storage stability chart)
        stability: Object.fromEntries(
          warehouses.filter(w => w.temp !== null).map(wh => {
            const tScore = Math.max(0, 100 - Math.max(0, (wh.temp ?? 25) - 25) * 8);
            const hScore = Math.max(0, 100 - Math.max(0, (wh.humidity ?? 60) - 60) * 4);
            return [wh.id, Math.round(tScore * 0.6 + hScore * 0.4)];
          })
        ),
        // Alert counts with per-day variation so the trend chart is not flat
        alertCounts: {
          Critical: Math.max(0, critCount * 2      + seededVariation(key, 11, 0, 4)),
          Warning:  Math.max(0, warnCount * 3 + critCount + seededVariation(key, 7, 0, 8)),
          Info:     Math.max(0, 6 + goodCount      + seededVariation(key, 3, 0, 6)),
        },
        seededAt: serverTimestamp(),
      });
    }

    // ── 2. Reports — 10 initial generated reports ────────────────────────────
    const { recentReports, stats, reportTypeData, reportTrendData } = getReportsData(today);

    // Store each report as its own document
    for (const report of recentReports) {
      batch.set(doc(db, 'reports', report.id), {
        ...report,
        createdAt: serverTimestamp(),
      });
    }

    // Store report metadata
    batch.set(doc(db, 'reportsMeta', 'global'), {
      stats,
      reportTypeData,
      reportTrendData,
      totalReports: stats[0]?.value ?? 0,
      updatedAt: serverTimestamp(),
    });

    // ── 3. Mark seeding complete ─────────────────────────────────────────────
    batch.set(metaRef, {
      seededAt: serverTimestamp(),
      version: 3,
    });

    await batch.commit();
    console.info('[seeder] Firestore seeded successfully');
  } catch (err) {
    // Non-fatal — app works with local data if seeding fails
    console.warn('[seeder] Seeding skipped or failed:', err);
  }
}

// ─── Append today's snapshot (called by liveEngine once per day) ──────────────

export async function appendTodaySnapshot(
  readings: Record<string, { temperature: number; humidity: number; moisture: number; co2: number; aqi: number; capacity: number; status: string }>,
): Promise<void> {
  try {
    const key = dateKey(new Date());
    const values = Object.values(readings);
    if (!values.length) return;

    const avgTemp     = +(values.reduce((s, r) => s + r.temperature, 0) / values.length).toFixed(1);
    const avgHumidity = Math.round(values.reduce((s, r) => s + r.humidity, 0) / values.length);
    const avgMoisture = +(values.reduce((s, r) => s + r.moisture, 0) / values.length).toFixed(1);
    const avgCO2      = Math.round(values.reduce((s, r) => s + r.co2, 0) / values.length);
    const avgAQI      = Math.round(values.reduce((s, r) => s + r.aqi, 0) / values.length);

    await setDoc(doc(db, 'sensorHistory', key), {
      date: key,
      averages: { temperature: avgTemp, humidity: avgHumidity, moisture: avgMoisture, co2: avgCO2, aqi: avgAQI },
      warehouseStatus: {
        good:     values.filter(r => r.status === 'good').length,
        warning:  values.filter(r => r.status === 'medium').length,
        critical: values.filter(r => r.status === 'high').length,
      },
      stability: Object.fromEntries(
        Object.entries(readings).map(([id, r]) => {
          const tScore = Math.max(0, 100 - Math.max(0, r.temperature - 25) * 8);
          const hScore = Math.max(0, 100 - Math.max(0, r.humidity - 60) * 4);
          return [id, Math.round(tScore * 0.6 + hScore * 0.4)];
        })
      ),
      alertCounts: {
        Critical: values.filter(r => r.status === 'high').length * 2,
        Warning:  values.filter(r => r.status === 'medium').length * 3,
        Info:     8,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch {
    // Non-fatal
  }
}

// ─── Save a new report to Firestore (called when user generates a report) ─────

export async function saveReport(report: ReportItem): Promise<void> {
  await setDoc(doc(db, 'reports', report.id), {
    ...report,
    createdAt: serverTimestamp(),
  });
}

// ─── 7-day auto-cleanup (called on app startup) ───────────────────────────────

export async function cleanupOldAlerts(): Promise<void> {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Delete alertHistory docs older than 7 days
    const historyQ = query(
      collection(db, 'alertHistory'),
      orderBy('triggeredAt'),
      where('triggeredAt', '<', cutoff),
    );
    const historySnap = await getDocs(historyQ);
    await Promise.all(historySnap.docs.map(d => deleteDoc(doc(db, 'alertHistory', d.id))));

    // Delete resolved alerts in the live alerts collection older than 7 days
    // Single-field filter only (avoids composite index requirement)
    const alertsQ = query(
      collection(db, 'alerts'),
      where('timestamp', '<', cutoff),
    );
    const alertsSnap = await getDocs(alertsQ);
    // Only delete if resolved (filter in JS to keep active old alerts safe)
    const toDelete = alertsSnap.docs.filter(d => d.data().resolved === true);
    await Promise.all(toDelete.map(d => deleteDoc(doc(db, 'alerts', d.id))));

    if (historySnap.size + toDelete.length > 0) {
      console.info(`[cleanup] Deleted ${historySnap.size} alertHistory + ${toDelete.length} resolved alerts older than 7 days`);
    }
  } catch {
    // Non-fatal — cleanup will retry on next app startup
  }
}
