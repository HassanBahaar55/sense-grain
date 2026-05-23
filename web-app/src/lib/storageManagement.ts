'use client';

import { useState, useEffect } from 'react';
import {
  getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch, getDocs, getDoc,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManagedStatus = 'active' | 'inactive';
export type SensorType    = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';
export type SensorStatus  = 'active' | 'inactive' | 'faulty';

export interface ManagedWarehouse {
  id: string;
  name: string;
  capacity: number;   // tons
  location: string;
  status: ManagedStatus;
  liveEngineId?: string; // maps to WH-A … WH-G for live readings
  createdAt: number;
}

export interface ManagedZone {
  id: string;
  warehouseId: string;
  name: string;
  status: ManagedStatus;
  createdAt: number;
}

export interface ManagedSensor {
  id: string;
  zoneId: string;
  warehouseId: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  createdAt: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storageWarehouses'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedWarehouse));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setWarehouses(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { warehouses, loading };
}

export function useZones(warehouseId: string | null) {
  const [zones, setZones] = useState<ManagedZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!warehouseId) { setZones([]); setLoading(false); return; }
    const q = query(collection(db, 'storageZones'), where('warehouseId', '==', warehouseId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedZone));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setZones(docs);
      setLoading(false);
    });
    return unsub;
  }, [warehouseId]);

  return { zones, loading };
}

export function useSensorsForWarehouse(warehouseId: string | null) {
  const [sensors, setSensors] = useState<ManagedSensor[]>([]);

  useEffect(() => {
    if (!warehouseId) { setSensors([]); return; }
    const q = query(collection(db, 'storageSensors'), where('warehouseId', '==', warehouseId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedSensor));
      docs.sort((a, b) => a.createdAt - b.createdAt);
      setSensors(docs);
    });
    return unsub;
  }, [warehouseId]);

  return sensors;
}

export function useTotalZoneCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    return onSnapshot(collection(db, 'storageZones'), snap => setCount(snap.size));
  }, []);
  return count;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addWarehouse(data: Omit<ManagedWarehouse, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'storageWarehouses'), { ...data, createdAt: Date.now() });
}

export async function updateWarehouse(id: string, data: Partial<Omit<ManagedWarehouse, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, 'storageWarehouses', id), data);
}

export async function deleteWarehouse(id: string) {
  const batch = writeBatch(db);
  const zonesSnap = await getDocs(query(collection(db, 'storageZones'), where('warehouseId', '==', id)));
  for (const z of zonesSnap.docs) {
    const sSnap = await getDocs(query(collection(db, 'storageSensors'), where('zoneId', '==', z.id)));
    sSnap.forEach(s => batch.delete(s.ref));
    batch.delete(z.ref);
  }
  batch.delete(doc(db, 'storageWarehouses', id));
  await batch.commit();
}

export async function addZone(data: Omit<ManagedZone, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'storageZones'), { ...data, createdAt: Date.now() });
}

export async function updateZone(id: string, data: Partial<Omit<ManagedZone, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, 'storageZones', id), data);
}

export async function deleteZone(id: string) {
  const batch = writeBatch(db);
  const sSnap = await getDocs(query(collection(db, 'storageSensors'), where('zoneId', '==', id)));
  sSnap.forEach(s => batch.delete(s.ref));
  batch.delete(doc(db, 'storageZones', id));
  await batch.commit();
}

export async function addSensor(data: Omit<ManagedSensor, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'storageSensors'), { ...data, createdAt: Date.now() });
}

export async function updateSensor(id: string, data: Partial<Omit<ManagedSensor, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, 'storageSensors', id), data);
}

export async function deleteSensor(id: string) {
  return deleteDoc(doc(db, 'storageSensors', id));
}

// ─── Default seed ─────────────────────────────────────────────────────────────

const DEFAULT_WHS = [
  { name: 'Warehouse A', liveEngineId: 'WH-A', capacity: 2000, location: 'Block A', status: 'active'   as const },
  { name: 'Warehouse B', liveEngineId: 'WH-B', capacity: 1800, location: 'Block B', status: 'active'   as const },
  { name: 'Warehouse C', liveEngineId: 'WH-C', capacity: 1750, location: 'Block C', status: 'active'   as const },
  { name: 'Warehouse D', liveEngineId: 'WH-D', capacity: 1600, location: 'Block D', status: 'active'   as const },
  { name: 'Warehouse E', liveEngineId: 'WH-E', capacity: 1500, location: 'Block E', status: 'active'   as const },
  { name: 'Warehouse F', liveEngineId: 'WH-F', capacity: 1400, location: 'Block F', status: 'active'   as const },
  { name: 'Warehouse G', liveEngineId: 'WH-G', capacity: 1200, location: 'Block G', status: 'active'   as const },
  { name: 'Warehouse H', liveEngineId: 'WH-H', capacity: 1200, location: 'Block H', status: 'inactive' as const },
];

const DEFAULT_ACTIVE_ZONES  = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Ambient'];
const DEFAULT_INACTIVE_ZONES = ['Zone 1', 'Zone 2'];
const DEFAULT_SENSORS: Array<{ type: SensorType; name: string }> = [
  { type: 'temperature', name: 'Temperature Sensor' },
  { type: 'humidity',    name: 'Humidity Sensor'    },
  { type: 'moisture',    name: 'Moisture Sensor'    },
];

export async function seedDefaultStorageIfEmpty(): Promise<void> {
  try {
    const metaRef = doc(db, 'meta', 'storageSeeded');
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) return;

    const batch = writeBatch(db);
    let ts = Date.now();

    for (const wh of DEFAULT_WHS) {
      const whRef = doc(collection(db, 'storageWarehouses'));
      batch.set(whRef, { ...wh, createdAt: ts++ });

      const zoneNames = wh.status === 'inactive' ? DEFAULT_INACTIVE_ZONES : DEFAULT_ACTIVE_ZONES;
      for (const zoneName of zoneNames) {
        const zRef = doc(collection(db, 'storageZones'));
        batch.set(zRef, { warehouseId: whRef.id, name: zoneName, status: wh.status, createdAt: ts++ });

        if (wh.status === 'active') {
          for (const s of DEFAULT_SENSORS) {
            const sRef = doc(collection(db, 'storageSensors'));
            batch.set(sRef, { zoneId: zRef.id, warehouseId: whRef.id, ...s, status: 'active', createdAt: ts++ });
          }
        }
      }
    }

    batch.set(metaRef, { seededAt: Date.now() });
    await batch.commit();
  } catch (err) {
    console.warn('[storage] seed skipped:', err);
  }
}
