/**
 * Firestore real-time sensor subscriptions for the mobile app.
 * Reads from the same `warehouseReadings` and `alerts` collections that the
 * Cloud Function writes to — keeping mobile and web perfectly in sync.
 *
 * Usage:
 *   import { subscribeToReadings, subscribeToAlerts } from './sensorService';
 *
 *   const unsub = subscribeToReadings(readings => {
 *     // readings is Record<warehouseId, WarehouseReading>
 *   });
 *   // Call unsub() when the component unmounts
 *
 * Prerequisites (run once in the project root):
 *   npm install firebase
 * Then initialise the app before calling these functions — see firebaseApp.ts.
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseApp';

// Initialise Firebase once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WarehouseReading {
  warehouseId:  string;
  temperature:  number;  // °C
  humidity:     number;  // %
  moisture:     number;  // %
  co2:          number;  // ppm
  aqi:          number;
  capacity:     number;  // % used
  spoilageRisk: number;  // 0–100
  health:       number;  // 0–100
  status:       'good' | 'medium' | 'high';
  trend:        'up' | 'down' | 'stable';
  lastUpdate:   number;  // ms epoch
}

export interface SensorAlert {
  id:          string;
  warehouseId: string;
  param:       string;
  value:       number;
  unit:        string;
  threshold:   number;
  severity:    'critical' | 'high' | 'medium';
  message:     string;
  resolved:    boolean;
  timestamp:   number; // ms epoch
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * Subscribe to live warehouse readings from Firestore.
 * Fires immediately with cached data, then on every Cloud Function write (~1 min).
 * Returns an unsubscribe function — call it in your cleanup/useEffect return.
 */
export function subscribeToReadings(
  cb: (readings: Record<string, WarehouseReading>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'warehouseReadings'), (snap) => {
    const readings: Record<string, WarehouseReading> = {};
    snap.forEach((doc) => {
      const d = doc.data();
      readings[d.warehouseId] = {
        warehouseId:  d.warehouseId,
        temperature:  d.temperature,
        humidity:     d.humidity,
        moisture:     d.moisture,
        co2:          d.co2,
        aqi:          d.aqi,
        capacity:     d.capacity,
        spoilageRisk: d.spoilageRisk,
        health:       d.health,
        status:       d.status,
        trend:        d.trend,
        lastUpdate:   d.updatedAt ? d.updatedAt.seconds * 1000 : Date.now(),
      };
    });
    cb(readings);
  });
}

/**
 * Subscribe to live alerts from Firestore.
 * Returns an unsubscribe function.
 */
export function subscribeToAlerts(
  cb: (alerts: SensorAlert[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'alerts'), (snap) => {
    const alerts: SensorAlert[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      alerts.push({
        id:          doc.id,
        warehouseId: d.warehouseId,
        param:       d.param,
        value:       d.value,
        unit:        d.unit,
        threshold:   d.threshold,
        severity:    d.severity,
        message:     d.message,
        resolved:    d.resolved,
        timestamp:   d.updatedAt ? d.updatedAt.seconds * 1000 : Date.now(),
      });
    });
    cb(alerts);
  });
}
