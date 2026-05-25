'use client';

/**
 * Per-user storage management (warehouses, zones, sensors).
 * All data lives under /accounts/{uid}/... — never shared between users.
 *
 * APPROVAL RULES:
 *   - Warehouse creation: submits a resourceRequest (type: 'warehouse_creation').
 *     Admin approves → calls createApprovedWarehouse() which creates the actual doc.
 *   - Zone creation: submits a resourceRequest (type: 'zone_creation').
 *     Admin approves → calls createApprovedZone() which creates the actual doc.
 *   - Sensor creation: submits a resourceRequest (type: 'sensor_activation').
 *     Admin approves → sensor status becomes 'active' → Cloud Function starts writing readings.
 *   - Nothing creates directly without admin approval.
 */

import { useState, useEffect } from 'react';
import {
  getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch, getDocs, setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';
import { useAuth } from '@/contexts/AuthContext';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManagedStatus = 'active' | 'inactive';
export type SensorType    = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';
export type SensorStatus  = 'active' | 'inactive' | 'faulty' | 'pending_approval' | 'rejected';

export interface ManagedWarehouse {
  id:        string;
  name:      string;
  capacity:  number;      // tons
  location:  string;
  status:    ManagedStatus;
  createdAt: number;
}

export interface ManagedZone {
  id:          string;
  warehouseId: string;
  name:        string;
  status:      ManagedStatus;
  createdAt:   number;
}

export interface ManagedSensor {
  id:          string;
  zoneId:      string;
  warehouseId: string;
  name:        string;
  type:        SensorType;
  status:      SensorStatus;
  baseValue:   number;    // stable baseline for simulation drift
  createdAt:   number;
}

// ─── Pending request type (mirrors resourceRequests collection) ───────────────

export interface PendingWarehouseRequest {
  id:                 string;
  uid:                string;
  type:               'warehouse_creation';
  status:             'pending' | 'approved' | 'rejected';
  warehouseName:      string;
  warehouseCapacity:  number;
  warehouseLocation:  string;
  createdAt:          number;
  rejectedReason?:    string;
}

export interface PendingZoneRequest {
  id:              string;
  uid:             string;
  type:            'zone_creation';
  status:          'pending' | 'approved' | 'rejected';
  warehouseId:     string;
  warehouseName?:  string;
  zoneName:        string;
  createdAt:       number;
  rejectedReason?: string;
}

// ─── Hooks (all per-user) ─────────────────────────────────────────────────────

export function useWarehouses() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!uid) { setWarehouses([]); setLoading(false); return; }
    const unsub = onSnapshot(collection(db, col.warehouses(uid)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedWarehouse));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setWarehouses(docs);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { warehouses, loading };
}

export function useZones(warehouseId: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [zones,   setZones]   = useState<ManagedZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !warehouseId) { setZones([]); setLoading(false); return; }
    const q = query(collection(db, col.zones(uid)), where('warehouseId', '==', warehouseId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedZone));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setZones(docs);
      setLoading(false);
    });
    return unsub;
  }, [uid, warehouseId]);

  return { zones, loading };
}

export function useAllZones() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [zones, setZones] = useState<ManagedZone[]>([]);

  useEffect(() => {
    if (!uid) { setZones([]); return; }
    const unsub = onSnapshot(collection(db, col.zones(uid)), (snap) => {
      setZones(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedZone)));
    });
    return unsub;
  }, [uid]);

  return zones;
}

export function useSensorsForWarehouse(warehouseId: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [sensors, setSensors] = useState<ManagedSensor[]>([]);

  useEffect(() => {
    if (!uid || !warehouseId) { setSensors([]); return; }
    const q = query(collection(db, col.sensors(uid)), where('warehouseId', '==', warehouseId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedSensor));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setSensors(docs);
    });
    return unsub;
  }, [uid, warehouseId]);

  return sensors;
}

export function useTotalZoneCount() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) { setCount(0); return; }
    return onSnapshot(collection(db, col.zones(uid)), snap => setCount(snap.size));
  }, [uid]);

  return count;
}

/** Returns pending warehouse and zone requests for this user */
export function usePendingRequests(uid: string | null) {
  const [warehouseReqs, setWarehouseReqs] = useState<PendingWarehouseRequest[]>([]);
  const [zoneReqs,      setZoneReqs]      = useState<PendingZoneRequest[]>([]);

  useEffect(() => {
    if (!uid) { setWarehouseReqs([]); setZoneReqs([]); return; }

    const whQ = query(
      collection(db, 'resourceRequests'),
      where('uid', '==', uid),
      where('type', '==', 'warehouse_creation'),
    );
    const zQ = query(
      collection(db, 'resourceRequests'),
      where('uid', '==', uid),
      where('type', '==', 'zone_creation'),
    );

    const unsubWh = onSnapshot(whQ, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingWarehouseRequest));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setWarehouseReqs(docs);
    });
    const unsubZ = onSnapshot(zQ, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingZoneRequest));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setZoneReqs(docs);
    });

    return () => { unsubWh(); unsubZ(); };
  }, [uid]);

  return { warehouseReqs, zoneReqs };
}

// ─── Warehouse CRUD ───────────────────────────────────────────────────────────

/**
 * Submits a warehouse creation request for admin approval.
 * Does NOT create the warehouse directly.
 */
export async function addWarehouse(
  uid: string,
  data: { name: string; capacity: number; location: string; status: ManagedStatus },
): Promise<string> {
  const user  = getAuth(firebaseApp).currentUser;
  const reqId = `${uid}_wh_${Date.now()}`;
  await setDoc(doc(db, 'resourceRequests', reqId), {
    id:                 reqId,
    uid,
    userEmail:          user?.email       ?? '',
    userName:           user?.displayName ?? user?.email ?? '',
    type:               'warehouse_creation',
    status:             'pending',
    warehouseName:      data.name,
    warehouseCapacity:  data.capacity,
    warehouseLocation:  data.location,
    warehouseStatus:    data.status,
    createdAt:          Date.now(),
  });
  return reqId;
}

/**
 * Admin-only: creates the actual warehouse document after approving the request.
 */
export async function createApprovedWarehouse(
  uid: string,
  requestId: string,
  data: { name: string; capacity: number; location: string; status: ManagedStatus },
): Promise<string> {
  const whRef = await addDoc(collection(db, col.warehouses(uid)), {
    name:      data.name,
    capacity:  data.capacity,
    location:  data.location,
    status:    data.status,
    createdAt: Date.now(),
  });
  await updateDoc(doc(db, 'resourceRequests', requestId), {
    status:        'approved',
    reviewedAt:    Date.now(),
    warehouseDocId: whRef.id,
  });
  return whRef.id;
}

export async function updateWarehouse(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedWarehouse, 'id' | 'createdAt'>>,
) {
  return updateDoc(doc(db, col.warehouses(uid), id), data);
}

export async function deleteWarehouse(uid: string, id: string) {
  const batch = writeBatch(db);

  const zonesSnap = await getDocs(query(collection(db, col.zones(uid)), where('warehouseId', '==', id)));
  for (const z of zonesSnap.docs) {
    const sSnap = await getDocs(query(collection(db, col.sensors(uid)), where('zoneId', '==', z.id)));
    sSnap.forEach(s => {
      batch.delete(s.ref);
      batch.delete(doc(db, 'resourceRequests', `${uid}_${s.id}`));
      batch.delete(doc(db, col.sensorReadings(uid), s.id));
    });
    batch.delete(z.ref);
  }

  // Remove warehouse resource requests for this warehouse
  const whReqsSnap = await getDocs(
    query(collection(db, 'resourceRequests'), where('uid', '==', uid), where('warehouseDocId', '==', id)),
  );
  whReqsSnap.forEach(r => batch.delete(r.ref));

  // Remove zone resource requests pointing to this warehouse
  const zReqsSnap = await getDocs(
    query(collection(db, 'resourceRequests'), where('uid', '==', uid), where('warehouseId', '==', id), where('type', '==', 'zone_creation')),
  );
  zReqsSnap.forEach(r => batch.delete(r.ref));

  // Remove computed reading cache and active alerts
  batch.delete(doc(db, col.warehouseReadings(uid), id));
  const alertsSnap = await getDocs(query(collection(db, col.alerts(uid)), where('warehouseId', '==', id)));
  alertsSnap.forEach(a => batch.delete(a.ref));

  // Remove reports for this warehouse
  const reportsSnap = await getDocs(query(collection(db, col.reports(uid)), where('warehouseId', '==', id)));
  reportsSnap.forEach(r => batch.delete(r.ref));

  batch.delete(doc(db, col.warehouses(uid), id));
  await batch.commit();
}

// ─── Zone CRUD ────────────────────────────────────────────────────────────────

/**
 * Submits a zone creation request for admin approval.
 * Does NOT create the zone directly.
 */
export async function addZone(
  uid: string,
  data: { warehouseId: string; name: string; status: ManagedStatus; warehouseName?: string },
): Promise<string> {
  const user  = getAuth(firebaseApp).currentUser;
  const reqId = `${uid}_zone_${Date.now()}`;
  await setDoc(doc(db, 'resourceRequests', reqId), {
    id:            reqId,
    uid,
    userEmail:     user?.email       ?? '',
    userName:      user?.displayName ?? user?.email ?? '',
    type:          'zone_creation',
    status:        'pending',
    warehouseId:   data.warehouseId,
    warehouseName: data.warehouseName ?? '',
    zoneName:      data.name,
    zoneStatus:    data.status,
    createdAt:     Date.now(),
  });
  return reqId;
}

/**
 * Admin-only: creates the actual zone document after approving the request.
 */
export async function createApprovedZone(
  uid: string,
  requestId: string,
  data: { warehouseId: string; name: string; status: ManagedStatus },
): Promise<string> {
  const zRef = await addDoc(collection(db, col.zones(uid)), {
    warehouseId: data.warehouseId,
    name:        data.name,
    status:      data.status,
    createdAt:   Date.now(),
  });
  await updateDoc(doc(db, 'resourceRequests', requestId), {
    status:     'approved',
    reviewedAt: Date.now(),
    zoneDocId:  zRef.id,
  });
  return zRef.id;
}

export async function updateZone(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedZone, 'id' | 'createdAt'>>,
) {
  return updateDoc(doc(db, col.zones(uid), id), data);
}

export async function deleteZone(uid: string, id: string) {
  const batch  = writeBatch(db);
  const sSnap  = await getDocs(query(collection(db, col.sensors(uid)), where('zoneId', '==', id)));
  sSnap.forEach(s => {
    batch.delete(s.ref);
    batch.delete(doc(db, 'resourceRequests', `${uid}_${s.id}`));
    batch.delete(doc(db, col.sensorReadings(uid), s.id));
  });

  // Remove zone resource request
  const zReqsSnap = await getDocs(
    query(collection(db, 'resourceRequests'), where('uid', '==', uid), where('zoneDocId', '==', id)),
  );
  zReqsSnap.forEach(r => batch.delete(r.ref));

  batch.delete(doc(db, col.zones(uid), id));
  await batch.commit();
}

// ─── Sensor CRUD ──────────────────────────────────────────────────────────────

/** Default base values per sensor type */
function defaultBaseValue(type: SensorType): number {
  switch (type) {
    case 'temperature': return 26.0;
    case 'humidity':    return 58;
    case 'moisture':    return 11.0;
    case 'co2':         return 500;
    case 'aqi':         return 35;
    case 'multi':       return 26.0;
  }
}

export async function addSensor(uid: string, data: Omit<ManagedSensor, 'id' | 'createdAt' | 'baseValue'>) {
  const user = getAuth(firebaseApp).currentUser;
  const now  = Date.now();

  const ref = await addDoc(collection(db, col.sensors(uid)), {
    ...data,
    status:    'pending_approval',
    baseValue: defaultBaseValue(data.type),
    createdAt: now,
  });

  const requestId = `${uid}_${ref.id}`;
  await setDoc(doc(db, 'resourceRequests', requestId), {
    id:          requestId,
    uid,
    userEmail:   user?.email        ?? '',
    userName:    user?.displayName  ?? user?.email ?? '',
    type:        'sensor_activation',
    status:      'pending',
    sensorId:    ref.id,
    sensorName:  data.name,
    sensorType:  data.type,
    zoneId:      data.zoneId,
    warehouseId: data.warehouseId,
    createdAt:   now,
  });

  return ref;
}

export async function updateSensor(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedSensor, 'id' | 'createdAt'>>,
) {
  return updateDoc(doc(db, col.sensors(uid), id), data);
}

export async function deleteSensor(uid: string, id: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, col.sensors(uid), id));
  batch.delete(doc(db, 'resourceRequests', `${uid}_${id}`));
  batch.delete(doc(db, col.sensorReadings(uid), id));
  await batch.commit();
}
