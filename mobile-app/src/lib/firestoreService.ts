import firestore from '@react-native-firebase/firestore';

import {col} from './accountDb';
import type {
  ManagedWarehouse,
  ManagedZone,
  ManagedSensor,
  WarehouseReading,
  LiveSensorReading,
  LiveAlert,
  SensorHistoryEntry,
  ReportItem,
  WHStatus,
  RiskLevel,
  TrendDir,
} from './accountDb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toWHStatus(s: unknown): WHStatus {
  if (s === 'good' || s === 'medium' || s === 'high') return s;
  return 'inactive';
}

function toRisk(n: unknown): RiskLevel {
  if (typeof n !== 'number') return 'inactive';
  if (n >= 67) return 'high';
  if (n >= 34) return 'medium';
  return 'low';
}

function toTrend(t: unknown): TrendDir {
  if (t === 'up' || t === 'down' || t === 'stable' || t === 'slight-up') return t;
  return null;
}

function formatTimestamp(ts: unknown): string | null {
  if (!ts || typeof ts !== 'number') return null;
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToWarehouses(
  uid: string,
  cb: (rows: ManagedWarehouse[]) => void,
): () => void {
  return firestore()
    .collection(col.warehouses(uid))
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedWarehouse)));
    }, () => cb([]));
}

export function subscribeToZones(
  uid: string,
  cb: (rows: ManagedZone[]) => void,
): () => void {
  return firestore()
    .collection(col.zones(uid))
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedZone)));
    }, () => cb([]));
}

export function subscribeToSensors(
  uid: string,
  cb: (rows: ManagedSensor[]) => void,
): () => void {
  return firestore()
    .collection(col.sensors(uid))
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedSensor)));
    }, () => cb([]));
}

export function subscribeToWarehouseReadings(
  uid: string,
  warehouses: ManagedWarehouse[],
  cb: (rows: WarehouseReading[]) => void,
): () => void {
  const nameMap = new Map(warehouses.map(w => [w.id, w]));

  return firestore()
    .collection(col.warehouseReadings(uid))
    .onSnapshot(snap => {
      const readings: WarehouseReading[] = snap.docs.map(d => {
        const data = d.data();
        const wh = nameMap.get(d.id);
        const capacity = wh?.capacity ?? 0;
        const usedPct = typeof data.capacity === 'number' ? data.capacity : 0;
        const used = Math.round((usedPct / 100) * capacity);
        return {
          id: d.id,
          name: wh?.name ?? d.id,
          status: toWHStatus(data.status),
          risk: toRisk(data.spoilageRisk),
          trend: toTrend(data.trend),
          temp: data.temperature ?? null,
          humidity: data.humidity ?? null,
          moisture: data.moisture ?? null,
          co2: data.co2 ?? null,
          aqi: data.aqi ?? null,
          capacity,
          used,
          usedPct,
          lastUpdate: formatTimestamp(data.updatedAt),
        };
      });

      // Add placeholder tiles for managed warehouses with no live reading
      const liveIds = new Set(readings.map(r => r.id));
      const placeholders: WarehouseReading[] = warehouses
        .filter(w => !liveIds.has(w.id))
        .map(w => ({
          id: w.id,
          name: w.name,
          status: 'inactive' as WHStatus,
          risk: 'inactive' as RiskLevel,
          trend: null,
          temp: null, humidity: null, moisture: null, co2: null, aqi: null,
          capacity: w.capacity,
          used: 0,
          usedPct: 0,
          lastUpdate: null,
        }));

      cb([...readings, ...placeholders].sort((a, b) => a.id.localeCompare(b.id)));
    }, () => cb([]));
}

export function subscribeToSensorReadings(
  uid: string,
  cb: (rows: LiveSensorReading[]) => void,
): () => void {
  return firestore()
    .collection(col.sensorReadings(uid))
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({sensorId: d.id, ...d.data()} as LiveSensorReading)));
    }, () => cb([]));
}

export function subscribeToAlerts(
  uid: string,
  cb: (rows: LiveAlert[]) => void,
): () => void {
  return firestore()
    .collection(col.alerts(uid))
    .where('resolved', '==', false)
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as LiveAlert)));
    }, () => cb([]));
}

export function subscribeToAlertHistory(
  uid: string,
  cb: (rows: LiveAlert[]) => void,
): () => void {
  return firestore()
    .collection(col.alertHistory(uid))
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as LiveAlert)));
    }, () => cb([]));
}

export function subscribeToSensorHistory(
  uid: string,
  cb: (rows: SensorHistoryEntry[]) => void,
): () => void {
  return firestore()
    .collection(col.sensorHistory(uid))
    .orderBy('date', 'desc')
    .limit(30)
    .onSnapshot(snap => {
      cb(snap.docs.map(d => d.data() as SensorHistoryEntry));
    }, () => cb([]));
}

export function subscribeToReports(
  uid: string,
  cb: (rows: ReportItem[]) => void,
): () => void {
  return firestore()
    .collection(col.reports(uid))
    .orderBy('generatedAt', 'desc')
    .onSnapshot(snap => {
      cb(snap.docs.map(d => ({id: d.id, ...d.data()} as ReportItem)));
    }, () => cb([]));
}

// ─── Alert mutations ──────────────────────────────────────────────────────────

export async function setAlertStatus(
  uid: string,
  alertId: string,
  status: 'active' | 'acknowledged' | 'resolved',
): Promise<void> {
  await firestore()
    .doc(`${col.alerts(uid)}/${alertId}`)
    .update({status, updatedAt: Date.now()});
}

export async function resolveAlert(uid: string, alertId: string): Promise<void> {
  const ref = firestore().doc(`${col.alerts(uid)}/${alertId}`);
  const snap = await ref.get();
  if (!snap.exists()) return;

  const data = snap.data()!;
  const now = Date.now();

  await firestore()
    .doc(`${col.alertHistory(uid)}/${alertId}`)
    .set({...data, id: alertId, resolved: true, status: 'resolved', resolvedAt: now, updatedAt: now});

  await ref.update({resolved: true, status: 'resolved', updatedAt: now});
}

// ─── Report generation ────────────────────────────────────────────────────────

export async function generateReport(
  uid: string,
  displayName: string,
  type: ReportItem['type'],
  warehouse: string,
  period: string,
): Promise<void> {
  const now = new Date();
  await firestore().collection(col.reports(uid)).add({
    type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')} Report`,
    warehouse,
    period,
    generatedAt: now.toISOString(),
    dateGenerated: now.toLocaleDateString(),
    generatedBy: displayName,
    size: '—',
    downloads: 0,
    status: 'processing',
    createdAt: Date.now(),
  });
}
