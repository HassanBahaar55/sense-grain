'use client';

/**
 * Firestore real-time subscriptions — per-user architecture.
 * All data lives under /accounts/{uid}/... so users never see each other's data.
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
import { col } from '@/lib/accountDb';
import type { LiveSensorReading, LiveAlert } from './liveEngine';

const db = getFirestore(firebaseApp);

// ─── Firestore document shapes ────────────────────────────────────────────────

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
  timestamp:   number;
  updatedAt:   { seconds: number; nanoseconds: number } | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toReading(data: FirestoreWarehouseDoc): LiveSensorReading {
  return {
    warehouseId:  data.warehouseId,
    temperature:  data.temperature,
    humidity:     data.humidity,
    moisture:     data.moisture,
    co2:          data.co2,
    aqi:          data.aqi,
    capacity:     data.capacity,
    spoilageRisk: data.spoilageRisk,
    health:       data.health,
    status:       data.status,
    trend:        data.trend,
    lastUpdate:   data.updatedAt ? data.updatedAt.seconds * 1000 : Date.now(),
  };
}

function toAlert(docId: string, data: FirestoreAlertDoc): LiveAlert {
  return {
    id:          docId,
    warehouseId: data.warehouseId,
    param:       data.param,
    value:       data.value,
    unit:        data.unit,
    threshold:   data.threshold,
    severity:    data.severity,
    message:     data.message,
    timestamp:   data.timestamp ?? (data.updatedAt ? data.updatedAt.seconds * 1000 : Date.now()),
    resolved:    data.resolved,
  };
}

// ─── Per-user subscriptions ───────────────────────────────────────────────────

type ReadingsCallback = (readings: Record<string, LiveSensorReading>) => void;
type AlertsCallback   = (alerts: LiveAlert[]) => void;

/** Subscribe to this user's live warehouse readings. */
export function subscribeToReadings(uid: string, cb: ReadingsCallback): Unsubscribe {
  return onSnapshot(collection(db, col.warehouseReadings(uid)), (snap) => {
    const readings: Record<string, LiveSensorReading> = {};
    snap.forEach((d) => {
      const data = d.data() as FirestoreWarehouseDoc;
      if (data.warehouseId) readings[data.warehouseId] = toReading(data);
    });
    cb(readings);
  });
}

/** Subscribe to this user's active (unresolved) alerts only. */
export function subscribeToAlerts(uid: string, cb: AlertsCallback): Unsubscribe {
  const q = query(collection(db, col.alerts(uid)), where('resolved', '==', false));
  return onSnapshot(q, (snap) => {
    const alerts: LiveAlert[] = [];
    snap.forEach((d) => alerts.push(toAlert(d.id, d.data() as FirestoreAlertDoc)));
    cb(alerts);
  });
}
