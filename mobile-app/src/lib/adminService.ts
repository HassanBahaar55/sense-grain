import firestore from '@react-native-firebase/firestore';

import {col} from './accountDb';
import type {
  AdminUserDetail,
  ManagedWarehouse,
  ManagedZone,
  ManagedSensor,
  ResourceRequest,
  UserProfile,
} from './accountDb';

export type {AdminUserDetail, ResourceRequest, UserProfile};

// ─── User list ────────────────────────────────────────────────────────────────

export function subscribeToAllUsers(cb: (users: UserProfile[]) => void): () => void {
  return firestore()
    .collection('users')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snap => cb(snap.docs.map(d => ({uid: d.id, ...d.data()} as UserProfile))),
      () => cb([]),
    );
}

// ─── Resource requests ────────────────────────────────────────────────────────

export function subscribeToResourceRequests(cb: (reqs: ResourceRequest[]) => void): () => void {
  return firestore()
    .collection('resourceRequests')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snap => cb(snap.docs.map(d => ({id: d.id, ...d.data()} as ResourceRequest))),
      () => cb([]),
    );
}

// ─── User detail ──────────────────────────────────────────────────────────────

export async function fetchUserDetail(uid: string): Promise<AdminUserDetail> {
  const [userSnap, whSnap, zSnap, sSnap] = await Promise.all([
    firestore().doc(`users/${uid}`).get(),
    firestore().collection(col.warehouses(uid)).get(),
    firestore().collection(col.zones(uid)).get(),
    firestore().collection(col.sensors(uid)).get(),
  ]);
  const tickIntervalSeconds = (userSnap.data()?.tickIntervalSeconds as number) ?? 600;
  return {
    uid,
    tickIntervalSeconds,
    warehouses: whSnap.docs.map(d => ({id: d.id, ...d.data()} as ManagedWarehouse)),
    zones:      zSnap.docs.map(d  => ({id: d.id, ...d.data()} as ManagedZone)),
    sensors:    sSnap.docs.map(d  => ({id: d.id, ...d.data()} as ManagedSensor)),
  };
}

// ─── User approval ────────────────────────────────────────────────────────────

export async function approveUser(uid: string): Promise<void> {
  await firestore().doc(`users/${uid}`).update({
    approvalStatus: 'approved',
    approvedAt: Date.now(),
  });
  await firestore().doc(`userRequests/${uid}`).update({
    status: 'approved',
  }).catch(() => undefined);
}

export async function rejectUser(uid: string, reason: string): Promise<void> {
  await firestore().doc(`users/${uid}`).update({
    approvalStatus: 'rejected',
    rejectedReason: reason,
  });
  await firestore().doc(`userRequests/${uid}`).update({
    status: 'rejected',
    rejectedReason: reason,
  }).catch(() => undefined);
}

// ─── Sensor resource request ──────────────────────────────────────────────────

export async function approveResourceRequest(
  requestId: string,
  uid: string,
  sensorId: string,
): Promise<void> {
  const now = Date.now();
  await Promise.all([
    firestore().doc(`resourceRequests/${requestId}`).update({status: 'approved', reviewedAt: now}),
    firestore().doc(`${col.sensors(uid)}/${sensorId}`).update({status: 'active'}),
  ]);
}

export async function rejectResourceRequest(
  requestId: string,
  uid: string,
  sensorId: string,
  reason: string,
): Promise<void> {
  const now = Date.now();
  await Promise.all([
    firestore().doc(`resourceRequests/${requestId}`).update({
      status: 'rejected', rejectedReason: reason, reviewedAt: now,
    }),
    firestore().doc(`${col.sensors(uid)}/${sensorId}`).update({status: 'rejected'}),
  ]);
}

// ─── Warehouse resource request ───────────────────────────────────────────────

export async function approveWarehouseRequest(req: ResourceRequest): Promise<void> {
  const now = Date.now();
  const whRef = await firestore().collection(col.warehouses(req.uid)).add({
    name:      req.warehouseName ?? 'Unnamed Warehouse',
    capacity:  req.warehouseCapacity ?? 0,
    location:  req.warehouseLocation ?? '',
    status:    'active',
    createdAt: now,
  });
  const whId = whRef.id;

  for (const zone of req.zones ?? []) {
    const zRef = await firestore().collection(col.zones(req.uid)).add({
      warehouseId: whId,
      name:        zone.name,
      status:      'active',
      createdAt:   now,
    });
    for (const sensor of zone.sensors) {
      await firestore().collection(col.sensors(req.uid)).add({
        zoneId:      zRef.id,
        warehouseId: whId,
        name:        sensor.name,
        type:        sensor.type,
        status:      'active',
        createdAt:   now,
      });
    }
  }

  await firestore().doc(`resourceRequests/${req.id}`).update({
    status: 'approved', reviewedAt: now, warehouseDocId: whId,
  });
}

export async function rejectWarehouseRequest(req: ResourceRequest, reason: string): Promise<void> {
  await firestore().doc(`resourceRequests/${req.id}`).update({
    status: 'rejected', rejectedReason: reason, reviewedAt: Date.now(),
  });
}

// ─── Zone resource request ────────────────────────────────────────────────────

export async function approveZoneRequest(req: ResourceRequest): Promise<void> {
  const now = Date.now();
  const zRef = await firestore().collection(col.zones(req.uid)).add({
    warehouseId: req.warehouseId ?? '',
    name:        req.zoneName ?? 'Unnamed Zone',
    status:      'active',
    createdAt:   now,
  });
  await firestore().doc(`resourceRequests/${req.id}`).update({
    status: 'approved', reviewedAt: now, zoneDocId: zRef.id,
  });
}

export async function rejectZoneRequest(req: ResourceRequest, reason: string): Promise<void> {
  await firestore().doc(`resourceRequests/${req.id}`).update({
    status: 'rejected', rejectedReason: reason, reviewedAt: Date.now(),
  });
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

async function batchDeleteCollection(path: string): Promise<void> {
  const snap = await firestore().collection(path).get();
  if (snap.empty) return;
  const batch = firestore().batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ─── Admin delete ─────────────────────────────────────────────────────────────

export async function adminDeleteSensor(uid: string, sensorId: string): Promise<void> {
  await firestore().doc(`${col.sensors(uid)}/${sensorId}`).delete();
  const snap = await firestore()
    .collection('resourceRequests')
    .where('uid', '==', uid)
    .where('sensorId', '==', sensorId)
    .get();
  if (!snap.empty) {
    const batch = firestore().batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function adminToggleSensor(uid: string, sensorId: string, active: boolean): Promise<void> {
  await firestore().doc(`${col.sensors(uid)}/${sensorId}`).update({
    status: active ? 'active' : 'inactive',
  });
}

export async function adminDeleteZone(uid: string, zoneId: string): Promise<void> {
  const sSnap = await firestore()
    .collection(col.sensors(uid))
    .where('zoneId', '==', zoneId)
    .get();
  const batch = firestore().batch();
  sSnap.docs.forEach(s => batch.delete(s.ref));
  batch.delete(firestore().doc(`${col.zones(uid)}/${zoneId}`));
  await batch.commit();
}

export async function adminDeleteWarehouse(uid: string, warehouseId: string): Promise<void> {
  const zSnap = await firestore()
    .collection(col.zones(uid))
    .where('warehouseId', '==', warehouseId)
    .get();
  const batch = firestore().batch();
  for (const z of zSnap.docs) {
    const sSnap = await firestore()
      .collection(col.sensors(uid))
      .where('zoneId', '==', z.id)
      .get();
    sSnap.docs.forEach(s => batch.delete(s.ref));
    batch.delete(z.ref);
  }
  batch.delete(firestore().doc(`${col.warehouses(uid)}/${warehouseId}`));
  await batch.commit();
}

export async function adminDeleteUser(uid: string): Promise<void> {
  const subcols = [
    col.warehouses(uid), col.zones(uid), col.sensors(uid),
    col.sensorReadings(uid), col.warehouseReadings(uid),
    col.alerts(uid), col.alertHistory(uid),
    col.sensorHistory(uid), col.reports(uid), col.reportsMeta(uid),
    col.meta(uid),
  ];
  await Promise.all(subcols.map(p => batchDeleteCollection(p)));

  const reqSnap = await firestore()
    .collection('resourceRequests')
    .where('uid', '==', uid)
    .get();
  if (!reqSnap.empty) {
    const batch = firestore().batch();
    reqSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await Promise.all([
    firestore().doc(`users/${uid}`).delete(),
    firestore().doc(`userRequests/${uid}`).delete().catch(() => undefined),
  ]);
}

export async function setUserTickInterval(uid: string, intervalSeconds: number): Promise<void> {
  await firestore().doc(`users/${uid}`).update({tickIntervalSeconds: intervalSeconds});
}
