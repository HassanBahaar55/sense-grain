'use client';

/**
 * Firestore real-time subscriptions for sensor data.
 * Replaces the browser-side liveEngine — data now comes from Firebase,
 * so web and mobile stay perfectly in sync.
 */

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import type { LiveSensorReading, LiveAlert } from './liveEngine';

const db = getFirestore(firebaseApp);

// ─── Types matching Firestore document shape ───────────────────────────────────

interface FirestoreWarehouseDoc {
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
  updatedAt:    { seconds: number; nanoseconds: number } | null;
}

interface FirestoreAlertDoc {
  id:          string;
  warehouseId: string;
  param:       string;
  value:       number;
  unit:        string;
  threshold:   number;
  severity:    'critical' | 'high' | 'medium';
  message:     string;
  resolved:    boolean;
  updatedAt:   { seconds: number; nanoseconds: number } | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toReading(doc: FirestoreWarehouseDoc): LiveSensorReading {
  return {
    warehouseId:  doc.warehouseId,
    temperature:  doc.temperature,
    humidity:     doc.humidity,
    moisture:     doc.moisture,
    co2:          doc.co2,
    aqi:          doc.aqi,
    capacity:     doc.capacity,
    spoilageRisk: doc.spoilageRisk,
    health:       doc.health,
    status:       doc.status,
    trend:        doc.trend,
    lastUpdate:   doc.updatedAt ? doc.updatedAt.seconds * 1000 : Date.now(),
  };
}

function toAlert(docId: string, doc: FirestoreAlertDoc): LiveAlert {
  return {
    id:          docId,
    warehouseId: doc.warehouseId,
    param:       doc.param,
    value:       doc.value,
    unit:        doc.unit,
    threshold:   doc.threshold,
    severity:    doc.severity,
    message:     doc.message,
    timestamp:   doc.updatedAt ? doc.updatedAt.seconds * 1000 : Date.now(),
    resolved:    doc.resolved,
  };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

type ReadingsCallback = (readings: Record<string, LiveSensorReading>) => void;
type AlertsCallback   = (alerts: LiveAlert[]) => void;

/** Subscribe to all warehouse readings. Returns unsubscribe function. */
export function subscribeToReadings(cb: ReadingsCallback): Unsubscribe {
  return onSnapshot(collection(db, 'warehouseReadings'), (snap) => {
    const readings: Record<string, LiveSensorReading> = {};
    snap.forEach((doc) => {
      const data = doc.data() as FirestoreWarehouseDoc;
      readings[data.warehouseId] = toReading(data);
    });
    cb(readings);
  });
}

/** Subscribe to active (unresolved) alerts only. Returns unsubscribe function. */
export function subscribeToAlerts(cb: AlertsCallback): Unsubscribe {
  const q = query(collection(db, 'alerts'), where('resolved', '==', false));
  return onSnapshot(q, (snap) => {
    const alerts: LiveAlert[] = [];
    snap.forEach((doc) => {
      alerts.push(toAlert(doc.id, doc.data() as FirestoreAlertDoc));
    });
    cb(alerts);
  });
}
