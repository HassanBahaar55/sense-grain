'use client';

/**
 * Firestore real-time subscriptions — per-user architecture.
 * All data lives under /accounts/{uid}/... so users never see each other's data.
 */

import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
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

export interface WarehouseMeta {
  id:            string;
  liveEngineId?: string;
  status:        string;
}

type WarehousesCallback = (warehouses: WarehouseMeta[]) => void;
type ReadingsCallback   = (readings: Record<string, LiveSensorReading>) => void;
type AlertsCallback     = (alerts: LiveAlert[]) => void;

/** Subscribe to this user's warehouse list (for liveEngine configuration). */
export function subscribeToWarehouses(uid: string, cb: WarehousesCallback): Unsubscribe {
  return onSnapshot(collection(db, col.warehouses(uid)), (snap) => {
    cb(snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, liveEngineId: data.liveEngineId, status: data.status };
    }));
  });
}

/** Subscribe to this user's live warehouse readings (computed cache from Cloud Functions). */
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

export interface SensorReadingDoc {
  sensorId:    string;
  zoneId:      string;
  warehouseId: string;
  type:        'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';
  value:       number;
  values?:     { temperature?: number; humidity?: number; moisture?: number; co2?: number; aqi?: number };
  unit:        string;
  status:      'normal' | 'warning' | 'critical';
  updatedAt:   { seconds: number; nanoseconds: number } | null;
}

/** Subscribe to this user's per-sensor live readings. */
export function subscribeToSensorReadings(
  uid: string,
  cb: (readings: Record<string, SensorReadingDoc>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, col.sensorReadings(uid)), (snap) => {
    const map: Record<string, SensorReadingDoc> = {};
    snap.docs.forEach(d => { map[d.id] = d.data() as SensorReadingDoc; });
    cb(map);
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

// ─── Alert status writes ──────────────────────────────────────────────────────
// Acknowledge / resolve never delete from alertHistory — the permanent record
// stays in `accounts/{uid}/alertHistory/{id}` forever. The `alerts/` collection
// only holds active alerts (resolved == false), so once status flips to
// resolved the next onSnapshot tick drops it from the active query.

type AlertActionStatus = 'acknowledged' | 'resolved';

export async function setAlertStatusInFirestore(
  uid: string,
  alertId: string,
  status: AlertActionStatus,
): Promise<void> {
  const now      = Date.now();
  const resolved = status === 'resolved';
  const payload  = {
    status,
    resolved,
    ...(resolved ? { resolvedAt: now } : { acknowledgedAt: now }),
    updatedAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(doc(db, col.alerts(uid),        alertId), payload, { merge: true }),
    setDoc(doc(db, col.alertHistory(uid),  alertId), payload, { merge: true }),
  ]);
}

