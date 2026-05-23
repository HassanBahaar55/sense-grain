'use client';

/**
 * Per-user storage management (warehouses, zones, sensors).
 * All data lives under /accounts/{uid}/... — never shared between users.
 */

import { useState, useEffect } from 'react';
import {
  getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch, getDocs, getDoc,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';
import { useAuth } from '@/contexts/AuthContext';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManagedStatus = 'active' | 'inactive';
export type SensorType    = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';
export type SensorStatus  = 'active' | 'inactive' | 'faulty';

export interface ManagedWarehouse {
  id:            string;
  name:          string;
  capacity:      number;        // tons
  location:      string;
  status:        ManagedStatus;
  liveEngineId?: string;        // maps to WH-A…WH-D (or user's own ID) for live readings
  createdAt:     number;
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
  createdAt:   number;
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

// ─── CRUD (all per-user) ──────────────────────────────────────────────────────

export async function addWarehouse(uid: string, data: Omit<ManagedWarehouse, 'id' | 'createdAt'>) {
  return addDoc(collection(db, col.warehouses(uid)), { ...data, createdAt: Date.now() });
}

export async function updateWarehouse(uid: string, id: string, data: Partial<Omit<ManagedWarehouse, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, col.warehouses(uid), id), data);
}

export async function deleteWarehouse(uid: string, id: string) {
  const batch = writeBatch(db);
  const zonesSnap = await getDocs(query(collection(db, col.zones(uid)), where('warehouseId', '==', id)));
  for (const z of zonesSnap.docs) {
    const sSnap = await getDocs(query(collection(db, col.sensors(uid)), where('zoneId', '==', z.id)));
    sSnap.forEach(s => batch.delete(s.ref));
    batch.delete(z.ref);
  }
  batch.delete(doc(db, col.warehouses(uid), id));
  await batch.commit();
}

export async function addZone(uid: string, data: Omit<ManagedZone, 'id' | 'createdAt'>) {
  return addDoc(collection(db, col.zones(uid)), { ...data, createdAt: Date.now() });
}

export async function updateZone(uid: string, id: string, data: Partial<Omit<ManagedZone, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, col.zones(uid), id), data);
}

export async function deleteZone(uid: string, id: string) {
  const batch = writeBatch(db);
  const sSnap = await getDocs(query(collection(db, col.sensors(uid)), where('zoneId', '==', id)));
  sSnap.forEach(s => batch.delete(s.ref));
  batch.delete(doc(db, col.zones(uid), id));
  await batch.commit();
}

export async function addSensor(uid: string, data: Omit<ManagedSensor, 'id' | 'createdAt'>) {
  return addDoc(collection(db, col.sensors(uid)), { ...data, createdAt: Date.now() });
}

export async function updateSensor(uid: string, id: string, data: Partial<Omit<ManagedSensor, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, col.sensors(uid), id), data);
}

export async function deleteSensor(uid: string, id: string) {
  return deleteDoc(doc(db, col.sensors(uid), id));
}
