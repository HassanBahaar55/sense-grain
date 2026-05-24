'use client';

/**
 * Admin-only Firestore operations.
 * All functions assume the caller is the admin — Firebase rules enforce this server-side.
 */

import {
  getFirestore, collection, doc, getDocs, deleteDoc, updateDoc,
  query, where, onSnapshot, writeBatch, orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminWarehouse {
  id:        string;
  name:      string;
  capacity:  number;
  location:  string;
  status:    string;
  createdAt: number;
}

export interface AdminZone {
  id:          string;
  warehouseId: string;
  name:        string;
  status:      string;
  createdAt:   number;
}

export interface AdminSensor {
  id:          string;
  zoneId:      string;
  warehouseId: string;
  name:        string;
  type:        string;
  status:      string;
  createdAt:   number;
}

export interface AdminUserDetail {
  uid:        string;
  warehouses: AdminWarehouse[];
  zones:      AdminZone[];
  sensors:    AdminSensor[];
}

export interface ResourceRequest {
  id:              string;
  uid:             string;
  userEmail:       string;
  userName:        string;
  type:            'sensor_activation';
  status:          'pending' | 'approved' | 'rejected';
  sensorId:        string;
  sensorName:      string;
  sensorType:      string;
  zoneId:          string;
  warehouseId:     string;
  createdAt:       number;
  reviewedAt?:     number;
  rejectedReason?: string;
}

// ─── Read user detail ─────────────────────────────────────────────────────────

export async function fetchUserDetail(uid: string): Promise<AdminUserDetail> {
  const [whSnap, zSnap, sSnap] = await Promise.all([
    getDocs(collection(db, col.warehouses(uid))),
    getDocs(collection(db, col.zones(uid))),
    getDocs(collection(db, col.sensors(uid))),
  ]);
  return {
    uid,
    warehouses: whSnap.docs.map(d => ({ id: d.id, ...d.data() } as AdminWarehouse)),
    zones:      zSnap.docs.map(d  => ({ id: d.id, ...d.data() } as AdminZone)),
    sensors:    sSnap.docs.map(d  => ({ id: d.id, ...d.data() } as AdminSensor)),
  };
}

// ─── Resource request subscriptions ──────────────────────────────────────────

export function subscribeToResourceRequests(
  cb: (requests: ResourceRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'resourceRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ResourceRequest)));
  });
}

// ─── Approve / reject sensor activation ──────────────────────────────────────

export async function approveResourceRequest(
  requestId: string, uid: string, sensorId: string,
): Promise<void> {
  const now = Date.now();
  await Promise.all([
    updateDoc(doc(db, 'resourceRequests', requestId), { status: 'approved', reviewedAt: now }),
    updateDoc(doc(db, col.sensors(uid), sensorId),    { status: 'active'  }),
  ]);
}

export async function rejectResourceRequest(
  requestId: string, uid: string, sensorId: string, reason: string,
): Promise<void> {
  const now = Date.now();
  await Promise.all([
    updateDoc(doc(db, 'resourceRequests', requestId), {
      status: 'rejected', rejectedReason: reason, reviewedAt: now,
    }),
    updateDoc(doc(db, col.sensors(uid), sensorId), { status: 'rejected' }),
  ]);
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

async function batchDeleteCollection(collPath: string): Promise<void> {
  const snap = await getDocs(collection(db, collPath));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ─── Admin delete operations ──────────────────────────────────────────────────

export async function adminDeleteSensor(uid: string, sensorId: string): Promise<void> {
  await deleteDoc(doc(db, col.sensors(uid), sensorId));
  // Remove any associated resource request
  const snap = await getDocs(
    query(collection(db, 'resourceRequests'),
      where('uid', '==', uid), where('sensorId', '==', sensorId)),
  );
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function adminToggleSensor(uid: string, sensorId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, col.sensors(uid), sensorId), {
    status: active ? 'active' : 'inactive',
  });
}

export async function adminDeleteZone(uid: string, zoneId: string): Promise<void> {
  const sSnap = await getDocs(
    query(collection(db, col.sensors(uid)), where('zoneId', '==', zoneId)),
  );
  const batch = writeBatch(db);
  sSnap.docs.forEach(s => batch.delete(s.ref));
  batch.delete(doc(db, col.zones(uid), zoneId));
  await batch.commit();
}

export async function adminDeleteWarehouse(uid: string, warehouseId: string): Promise<void> {
  const zSnap = await getDocs(
    query(collection(db, col.zones(uid)), where('warehouseId', '==', warehouseId)),
  );
  const batch = writeBatch(db);
  for (const z of zSnap.docs) {
    const sSnap = await getDocs(
      query(collection(db, col.sensors(uid)), where('zoneId', '==', z.id)),
    );
    sSnap.docs.forEach(s => batch.delete(s.ref));
    batch.delete(z.ref);
  }
  batch.delete(doc(db, col.warehouses(uid), warehouseId));
  await batch.commit();
}

export async function adminDeleteUser(uid: string): Promise<void> {
  const subcols = [
    col.warehouses(uid), col.zones(uid), col.sensors(uid),
    col.warehouseReadings(uid), col.alerts(uid), col.alertHistory(uid),
    col.sensorHistory(uid), col.reports(uid), col.reportsMeta(uid),
    col.meta(uid),
  ];

  await Promise.all(subcols.map(p => batchDeleteCollection(p)));

  // Remove resource requests for this user
  const reqSnap = await getDocs(
    query(collection(db, 'resourceRequests'), where('uid', '==', uid)),
  );
  if (!reqSnap.empty) {
    const batch = writeBatch(db);
    reqSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  await Promise.all([
    deleteDoc(doc(db, 'users', uid)),
    deleteDoc(doc(db, 'userRequests', uid)),
  ]);
}
