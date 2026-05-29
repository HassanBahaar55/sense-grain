import {useEffect, useState} from 'react';
import firestore from '@react-native-firebase/firestore';

import {col} from './accountDb';
import type {
  ManagedWarehouse,
  ManagedZone,
  ManagedSensor,
  SensorType,
  ResourceRequest,
} from './accountDb';

export type {ManagedWarehouse, ManagedZone, ManagedSensor, SensorType, ResourceRequest};

// ─── Wizard type ──────────────────────────────────────────────────────────────

export interface WizardZoneData {
  name: string;
  sensors: Array<{name: string; type: SensorType}>;
}

// ─── Write operations (submit resource requests) ──────────────────────────────

export async function addWarehouse(
  uid: string,
  userEmail: string,
  userName: string,
  data: {
    name: string;
    capacity: number;
    location: string;
    zones?: WizardZoneData[];
  },
): Promise<void> {
  await firestore().collection('resourceRequests').add({
    uid,
    userEmail,
    userName,
    type: 'warehouse_creation',
    status: 'pending',
    createdAt: Date.now(),
    warehouseName: data.name,
    warehouseCapacity: data.capacity,
    warehouseLocation: data.location,
    zones: data.zones ?? [],
  });
}

export async function addZone(
  uid: string,
  userEmail: string,
  userName: string,
  data: {warehouseId: string; warehouseName: string; name: string},
): Promise<void> {
  await firestore().collection('resourceRequests').add({
    uid,
    userEmail,
    userName,
    type: 'zone_creation',
    status: 'pending',
    createdAt: Date.now(),
    zoneName: data.name,
    warehouseId: data.warehouseId,
    warehouseName: data.warehouseName,
  });
}

export async function addSensor(
  uid: string,
  userEmail: string,
  userName: string,
  data: {
    name: string;
    type: SensorType;
    zoneId: string;
    warehouseId: string;
  },
): Promise<void> {
  const ref = await firestore().collection(col.sensors(uid)).add({
    zoneId: data.zoneId,
    warehouseId: data.warehouseId,
    name: data.name,
    type: data.type,
    status: 'pending_approval',
    createdAt: Date.now(),
  });

  await firestore().collection('resourceRequests').add({
    uid,
    userEmail,
    userName,
    type: 'sensor_activation',
    status: 'pending',
    createdAt: Date.now(),
    sensorId: ref.id,
    sensorName: data.name,
    sensorType: data.type,
    zoneId: data.zoneId,
    warehouseId: data.warehouseId,
  });
}

// ─── Update / Delete operations ──────────────────────────────────────────────

export async function updateWarehouse(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedWarehouse, 'id' | 'createdAt'>>,
): Promise<void> {
  await firestore().doc(`${col.warehouses(uid)}/${id}`).update(data);
}

export async function deleteWarehouse(uid: string, id: string): Promise<void> {
  const db = firestore();
  const batch = db.batch();

  const zonesSnap = await db.collection(col.zones(uid)).where('warehouseId', '==', id).get();
  for (const zoneDoc of zonesSnap.docs) {
    const sensorsSnap = await db.collection(col.sensors(uid)).where('zoneId', '==', zoneDoc.id).get();
    for (const sensorDoc of sensorsSnap.docs) {
      batch.delete(sensorDoc.ref);
      batch.delete(db.doc(`${col.sensorReadings(uid)}/${sensorDoc.id}`));
    }
    batch.delete(zoneDoc.ref);
  }

  const alertsSnap = await db.collection(col.alerts(uid)).where('warehouseId', '==', id).get();
  alertsSnap.forEach(a => batch.delete(a.ref));

  const reportsSnap = await db.collection(col.reports(uid)).where('warehouseId', '==', id).get();
  reportsSnap.forEach(r => batch.delete(r.ref));

  batch.delete(db.doc(`${col.warehouseReadings(uid)}/${id}`));
  batch.delete(db.doc(`${col.warehouses(uid)}/${id}`));
  await batch.commit();
}

export async function updateZone(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedZone, 'id' | 'createdAt'>>,
): Promise<void> {
  await firestore().doc(`${col.zones(uid)}/${id}`).update(data);
}

export async function deleteZone(uid: string, id: string): Promise<void> {
  const db = firestore();
  const batch = db.batch();

  const sensorsSnap = await db.collection(col.sensors(uid)).where('zoneId', '==', id).get();
  for (const sensorDoc of sensorsSnap.docs) {
    batch.delete(sensorDoc.ref);
    batch.delete(db.doc(`${col.sensorReadings(uid)}/${sensorDoc.id}`));
  }

  batch.delete(db.doc(`${col.zones(uid)}/${id}`));
  await batch.commit();
}

export async function updateSensor(
  uid: string,
  id: string,
  data: Partial<Omit<ManagedSensor, 'id' | 'createdAt'>>,
): Promise<void> {
  await firestore().doc(`${col.sensors(uid)}/${id}`).update(data);
}

export async function deleteSensor(uid: string, id: string): Promise<void> {
  const db = firestore();
  const batch = db.batch();
  batch.delete(db.doc(`${col.sensors(uid)}/${id}`));
  batch.delete(db.doc(`${col.sensorReadings(uid)}/${id}`));
  await batch.commit();
}

// ─── Real-time hooks ──────────────────────────────────────────────────────────

export function useWarehouses(uid: string | undefined): ManagedWarehouse[] {
  const [rows, setRows] = useState<ManagedWarehouse[]>([]);
  useEffect(() => {
    if (!uid) {setRows([]); return;}
    const unsub = firestore()
      .collection(col.warehouses(uid))
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => setRows(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedWarehouse))),
        () => setRows([]),
      );
    return unsub;
  }, [uid]);
  return rows;
}

export function useZones(uid: string | undefined): ManagedZone[] {
  const [rows, setRows] = useState<ManagedZone[]>([]);
  useEffect(() => {
    if (!uid) {setRows([]); return;}
    const unsub = firestore()
      .collection(col.zones(uid))
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => setRows(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedZone))),
        () => setRows([]),
      );
    return unsub;
  }, [uid]);
  return rows;
}

export function useSensors(uid: string | undefined): ManagedSensor[] {
  const [rows, setRows] = useState<ManagedSensor[]>([]);
  useEffect(() => {
    if (!uid) {setRows([]); return;}
    const unsub = firestore()
      .collection(col.sensors(uid))
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => setRows(snap.docs.map(d => ({id: d.id, ...d.data()} as ManagedSensor))),
        () => setRows([]),
      );
    return unsub;
  }, [uid]);
  return rows;
}

export function usePendingRequests(uid: string | undefined): ResourceRequest[] {
  const [rows, setRows] = useState<ResourceRequest[]>([]);
  useEffect(() => {
    if (!uid) {setRows([]); return;}
    const unsub = firestore()
      .collection('resourceRequests')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => setRows(snap.docs.map(d => ({id: d.id, ...d.data()} as ResourceRequest))),
        () => setRows([]),
      );
    return unsub;
  }, [uid]);
  return rows;
}
