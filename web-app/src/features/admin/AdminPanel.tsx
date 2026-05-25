'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getFirestore, collection, doc, query, onSnapshot,
  updateDoc, serverTimestamp,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  subscribeToResourceRequests, fetchUserDetail,
  approveResourceRequest, rejectResourceRequest,
  approveWarehouseRequest, rejectWarehouseRequest,
  approveZoneRequest, rejectZoneRequest,
  adminDeleteSensor, adminDeleteWarehouse, adminDeleteUser, adminToggleSensor,
  setUserTickInterval,
  type ResourceRequest, type AdminUserDetail,
} from '@/lib/adminService';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface UserRequest {
  uid:             string;
  email:           string;
  displayName:     string;
  requestedAt:     number;
  status:          ApprovalStatus;
  rejectedReason?: string;
}

interface UserProfile {
  uid:            string;
  email:          string;
  displayName:    string;
  approvalStatus: ApprovalStatus;
  createdAt:      number;
  approvedAt?:    number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useUserRequests() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'userRequests'), snap => {
      const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRequest));
      docs.sort((a, b) => b.requestedAt - a.requestedAt);
      setRequests(docs);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { requests, loading };
}

function useUserProfiles() {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(docs);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { users, loading };
}

function useResourceRequests() {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  useEffect(() => {
    const unsub = subscribeToResourceRequests(reqs => {
      setRequests(reqs);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { requests, loading };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtShort(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>{children}</div>;
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const styles = {
    pending:  'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
  };
  return (
    <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ring-1', styles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ReqStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const s = {
    pending:  'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
  }[status];
  return (
    <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ring-1', s)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-white">{initials(name)}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Reject modal (account) ───────────────────────────────────────────────────

function RejectAccountModal({
  user, onConfirm, onClose,
}: { user: UserRequest; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Reject Account</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-gray-500">Rejecting <strong className="text-gray-800">{user.displayName}</strong> ({user.email}).</p>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-800 placeholder:text-gray-400 resize-none outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onConfirm(reason.trim())} className="flex-1 h-9 rounded-xl bg-red-600 text-[12px] font-semibold text-white hover:bg-red-700">Confirm Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reject modal (sensor request) ───────────────────────────────────────────

function RejectSensorModal({
  req, onConfirm, onClose,
}: { req: ResourceRequest; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Reject Sensor Request</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-gray-500">
            Rejecting sensor <strong className="text-gray-800">{req.sensorName}</strong> for <strong>{req.userName}</strong>.
          </p>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-800 placeholder:text-gray-400 resize-none outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onConfirm(reason.trim())} className="flex-1 h-9 rounded-xl bg-red-600 text-[12px] font-semibold text-white hover:bg-red-700">Confirm Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  title, desc, onConfirm, onClose,
}: { title: string; desc: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    await onConfirm();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-red-600">{title}</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[12px] text-gray-500 leading-relaxed">{desc} <strong className="text-gray-700">This cannot be undone.</strong></p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={busy} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handle} disabled={busy} className="flex-1 h-9 rounded-xl bg-red-600 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {busy ? <Spinner /> : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({
  profile, onClose,
}: { profile: UserProfile; onClose: () => void }) {
  const [detail,        setDetail]        = useState<AdminUserDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [tickInterval,  setTickInterval]  = useState(600);
  const [intervalSaved, setIntervalSaved] = useState(false);
  const [confirm, setConfirm] = useState<{
    type: 'user' | 'warehouse' | 'sensor';
    label: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    fetchUserDetail(profile.uid).then(d => {
      setDetail(d);
      setTickInterval(d.tickIntervalSeconds ?? 600);
      setLoading(false);
    });
  }, [profile.uid]);

  const refresh = () => {
    setLoading(true);
    fetchUserDetail(profile.uid).then(d => { setDetail(d); setLoading(false); });
  };

  async function handleIntervalChange(seconds: number) {
    setTickInterval(seconds);
    setIntervalSaved(false);
    await setUserTickInterval(profile.uid, seconds);
    setIntervalSaved(true);
    setTimeout(() => setIntervalSaved(false), 3000);
  }

  const sensorStatusDot = (status: string) => {
    if (status === 'active')           return 'bg-green-500';
    if (status === 'pending_approval') return 'bg-amber-400';
    if (status === 'rejected')         return 'bg-red-400';
    if (status === 'faulty')           return 'bg-red-500';
    return 'bg-gray-300';
  };

  const sensorStatusLabel = (status: string) => {
    if (status === 'active')           return 'Active';
    if (status === 'pending_approval') return 'Pending';
    if (status === 'rejected')         return 'Rejected';
    if (status === 'faulty')           return 'Faulty';
    return 'Offline';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
        <div
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <Avatar name={profile.displayName} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-gray-900 truncate">{profile.displayName}</p>
              <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>
            </div>
            <StatusBadge status={profile.approvalStatus} />
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 ml-1">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : !detail ? (
              <p className="text-center text-[12px] text-gray-400 py-8">Failed to load user data.</p>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Warehouses', val: detail.warehouses.length, color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    { label: 'Zones',      val: detail.zones.length,      color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Sensors',    val: detail.sensors.length,    color: 'text-emerald-600',bg: 'bg-emerald-50'},
                  ].map(s => (
                    <div key={s.label} className={cn('rounded-xl p-3 text-center', s.bg)}>
                      <p className={cn('text-[20px] font-bold', s.color)}>{s.val}</p>
                      <p className="text-[10px] text-gray-600 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Data update interval */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold text-gray-700">Data Update Interval</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">How often sensors update for this account</p>
                    </div>
                    <select
                      value={tickInterval}
                      onChange={e => handleIntervalChange(Number(e.target.value))}
                      className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20"
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes (default)</option>
                    </select>
                  </div>
                  {intervalSaved && (
                    <p className="text-[10px] text-green-600 font-semibold mt-2">✓ Saved — takes effect within 1 minute</p>
                  )}
                </div>

                {/* Warehouses + their sensors */}
                {detail.warehouses.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[12px] text-gray-400">No warehouses yet.</p>
                    <p className="text-[10px] text-gray-300 mt-1">User has not created any warehouses.</p>
                  </div>
                ) : (
                  detail.warehouses.map(wh => {
                    const whSensors = detail.sensors.filter(s => s.warehouseId === wh.id);
                    const whZones   = detail.zones.filter(z => z.warehouseId === wh.id);
                    return (
                      <div key={wh.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Warehouse header */}
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50">
                          <div className="w-6 h-6 rounded-lg bg-[#1f5135]/10 flex items-center justify-center">
                            <svg className="w-3 h-3 text-[#1f5135]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-gray-800 truncate">{wh.name}</p>
                            <p className="text-[10px] text-gray-400">{wh.location || '—'} · {whZones.length} zones · {whSensors.length} sensors</p>
                          </div>
                          <button
                            onClick={() => setConfirm({
                              type: 'warehouse',
                              label: wh.name,
                              action: async () => { await adminDeleteWarehouse(profile.uid, wh.id); refresh(); },
                            })}
                            className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="Delete warehouse"
                          >
                            <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>

                        {/* Sensors */}
                        {whSensors.length === 0 ? (
                          <div className="px-4 py-2.5 text-center">
                            <p className="text-[10px] text-gray-400">No sensors in this warehouse.</p>
                          </div>
                        ) : (
                          whSensors.map(s => (
                            <div key={s.id} className="flex items-center gap-2.5 px-4 py-2 border-t border-gray-50 group hover:bg-gray-50/60">
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', sensorStatusDot(s.status))} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-gray-800 truncate">{s.name}</p>
                                <p className="text-[10px] text-gray-400">{s.type} · <span className={s.status === 'active' ? 'text-green-600' : 'text-gray-400'}>{sensorStatusLabel(s.status)}</span></p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {s.status === 'active' && (
                                  <button
                                    onClick={() => adminToggleSensor(profile.uid, s.id, false).then(refresh)}
                                    className="h-5 px-2 rounded-md border border-amber-200 text-[9px] font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                    title="Disable sensor"
                                  >
                                    Disable
                                  </button>
                                )}
                                {s.status === 'inactive' && (
                                  <button
                                    onClick={() => adminToggleSensor(profile.uid, s.id, true).then(refresh)}
                                    className="h-5 px-2 rounded-md border border-emerald-200 text-[9px] font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Enable sensor"
                                  >
                                    Enable
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirm({
                                    type: 'sensor',
                                    label: s.name,
                                    action: async () => { await adminDeleteSensor(profile.uid, s.id); refresh(); },
                                  })}
                                  className="w-5 h-5 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors"
                                  title="Delete sensor"
                                >
                                  <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Footer — delete account */}
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => setConfirm({
                type: 'user',
                label: profile.displayName,
                action: async () => { await adminDeleteUser(profile.uid); onClose(); },
              })}
              className="w-full h-9 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete Account &amp; All Data
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-1.5">
              Removes all warehouses, sensors, readings, and alerts from Firestore.
            </p>
          </div>
        </div>
      </div>

      {confirm && (
        <DeleteConfirmModal
          title={`Delete ${confirm.type === 'user' ? 'Account' : confirm.type === 'warehouse' ? 'Warehouse' : 'Sensor'}?`}
          desc={
            confirm.type === 'user'
              ? `All data for "${confirm.label}" will be permanently deleted.`
              : confirm.type === 'warehouse'
              ? `Warehouse "${confirm.label}" and all its zones and sensors will be deleted.`
              : `Sensor "${confirm.label}" will be permanently removed.`
          }
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ─── Tab: Account requests (pending approval) ─────────────────────────────────

function AccountRequestsTab() {
  const { requests, loading } = useUserRequests();
  const pending  = requests.filter(r => r.status === 'pending');
  const rejected = requests.filter(r => r.status === 'rejected');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserRequest | null>(null);

  const approve = useCallback(async (uid: string) => {
    setProcessingId(uid);
    try {
      const now = Date.now();
      await Promise.all([
        updateDoc(doc(db, 'userRequests', uid), { status: 'approved', approvedAt: now }),
        updateDoc(doc(db, 'users', uid), { approvalStatus: 'approved', approvedAt: now, updatedAt: serverTimestamp() }),
      ]);
    } finally { setProcessingId(null); }
  }, []);

  const reject = useCallback(async (uid: string, reason: string) => {
    setProcessingId(uid);
    try {
      await Promise.all([
        updateDoc(doc(db, 'userRequests', uid), { status: 'rejected', rejectedReason: reason, rejectedAt: Date.now() }),
        updateDoc(doc(db, 'users', uid), { approvalStatus: 'rejected', rejectedReason: reason, updatedAt: serverTimestamp() }),
      ]);
    } finally { setProcessingId(null); setRejectTarget(null); }
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[13px] font-semibold text-gray-700">All requests handled</p>
        <p className="text-[11px] text-gray-400 mt-1">No pending account approvals.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pending.map(req => (
          <div key={req.uid} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
            <Avatar name={req.displayName} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{req.displayName}</p>
              <p className="text-[11px] text-gray-500 truncate">{req.email}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Requested: {fmtDate(req.requestedAt)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setRejectTarget(req)}
                disabled={processingId === req.uid}
                className="h-8 px-3 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => approve(req.uid)}
                disabled={processingId === req.uid}
                className="h-8 px-3 rounded-xl bg-emerald-600 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {processingId === req.uid ? <Spinner /> : null}
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejected.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-1">Recently Rejected</p>
          {rejected.map(req => (
            <div key={req.uid} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 opacity-70">
              <Avatar name={req.displayName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12px] font-semibold text-gray-700 truncate">{req.displayName}</p>
                  <span className="text-[9px] font-bold bg-red-50 text-red-600 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full">Rejected</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{req.email}</p>
                {req.rejectedReason && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Reason: {req.rejectedReason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectAccountModal
          user={rejectTarget}
          onConfirm={(reason) => reject(rejectTarget.uid, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </>
  );
}

// ─── Tab: All resource requests (warehouses, zones, sensors) ─────────────────

type ReqTypeFilter = 'all' | 'warehouse_creation' | 'zone_creation' | 'sensor_activation';

function ResourceRequestsTab() {
  const { requests, loading } = useResourceRequests();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter,   setTypeFilter]   = useState<ReqTypeFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ResourceRequest | null>(null);

  const filtered = requests
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => typeFilter === 'all' || r.type === typeFilter);

  const handleApprove = async (req: ResourceRequest) => {
    setProcessingId(req.id);
    try {
      if (req.type === 'sensor_activation') {
        await approveResourceRequest(req.id, req.uid, req.sensorId ?? '');
      } else if (req.type === 'warehouse_creation') {
        await approveWarehouseRequest(req);
      } else if (req.type === 'zone_creation') {
        await approveZoneRequest(req);
      }
    } finally { setProcessingId(null); }
  };

  const handleReject = async (req: ResourceRequest, reason: string) => {
    setProcessingId(req.id);
    try {
      if (req.type === 'sensor_activation') {
        await rejectResourceRequest(req.id, req.uid, req.sensorId ?? '', reason);
      } else if (req.type === 'warehouse_creation') {
        await rejectWarehouseRequest(req, reason);
      } else if (req.type === 'zone_creation') {
        await rejectZoneRequest(req, reason);
      }
    } finally { setProcessingId(null); setRejectTarget(null); }
  };

  const typeLabel = (type: ResourceRequest['type']) => {
    if (type === 'warehouse_creation') return 'Warehouse';
    if (type === 'zone_creation')      return 'Zone';
    return 'Sensor';
  };

  const typeIcon = (type: ResourceRequest['type']) => {
    if (type === 'warehouse_creation') return (
      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
    );
    if (type === 'zone_creation') return (
      <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    );
    return (
      <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.071 4.929l-1.414 1.414M5.343 18.657l-1.414 1.414M4.929 4.929l1.414 1.414M18.657 18.657l1.414-1.414M21 12h-2M5 12H3M12 19v2M12 3V1"/></svg>
    );
  };

  const reqTitle = (req: ResourceRequest) => {
    if (req.type === 'warehouse_creation') return req.warehouseName ?? 'Unnamed Warehouse';
    if (req.type === 'zone_creation')      return req.zoneName ?? 'Unnamed Zone';
    return req.sensorName ?? 'Unnamed Sensor';
  };

  const reqMeta = (req: ResourceRequest) => {
    if (req.type === 'warehouse_creation') {
      const base = `${req.warehouseCapacity ?? '?'} tons · ${req.warehouseLocation || 'No location'}`;
      if (req.zones && req.zones.length > 0) {
        const totalSensors = req.zones.reduce((n, z) => n + z.sensors.length, 0);
        return `${base} · ${req.zones.length} zone${req.zones.length !== 1 ? 's' : ''} · ${totalSensors} sensor${totalSensors !== 1 ? 's' : ''}`;
      }
      return base;
    }
    if (req.type === 'zone_creation') {
      return `Warehouse: ${req.warehouseName || req.warehouseId || '?'}`;
    }
    return `${req.sensorType} · Zone: ${req.zoneId ?? '?'}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <>
      {/* Status filter */}
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length;
          return (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn('h-7 px-3 rounded-xl text-[11px] font-semibold transition-colors',
                statusFilter === f ? 'bg-[#1f5135] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 pb-3 flex-wrap">
        {([
          { val: 'all',                 label: 'All Types' },
          { val: 'warehouse_creation',  label: 'Warehouses' },
          { val: 'zone_creation',       label: 'Zones' },
          { val: 'sensor_activation',   label: 'Sensors' },
        ] as const).map(({ val, label }) => (
          <button key={val} onClick={() => setTypeFilter(val)}
            className={cn('h-6 px-2.5 rounded-lg text-[10px] font-semibold transition-colors',
              typeFilter === val ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-[13px] font-semibold text-gray-700">No requests</p>
          <p className="text-[11px] text-gray-400 mt-1">No {statusFilter === 'all' ? '' : statusFilter} resource requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {typeIcon(req.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-bold text-gray-900">{reqTitle(req)}</p>
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{typeLabel(req.type)}</span>
                    <ReqStatusBadge status={req.status} />
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    <span className="font-medium">{req.userName}</span> · {req.userEmail}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{reqMeta(req)}</p>
                  {req.type === 'warehouse_creation' && req.zones && req.zones.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {req.zones.map((z, i) => (
                        <p key={i} className="text-[10px] text-gray-400">
                          ↳ {z.name}{z.sensors.length > 0 ? ` (${z.sensors.map(s => s.type).join(', ')})` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">Submitted: {fmtShort(req.createdAt)}</p>
                  {req.rejectedReason && (
                    <p className="text-[10px] text-red-500 mt-1">Reason: {req.rejectedReason}</p>
                  )}
                </div>
                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setRejectTarget(req)} disabled={processingId === req.id}
                      className="h-8 px-3 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      Reject
                    </button>
                    <button onClick={() => handleApprove(req)} disabled={processingId === req.id}
                      className="h-8 px-3 rounded-xl bg-emerald-600 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                      {processingId === req.id ? <Spinner /> : null}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectSensorModal
          req={rejectTarget}
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </>
  );
}

// ─── Tab: All users ───────────────────────────────────────────────────────────

const USERS_PAGE_SIZE = 20;

function UsersTab() {
  const { users, loading } = useUserProfiles();
  const [filter,   setFilter]   = useState<ApprovalStatus | 'all'>('all');
  const [search,   setSearch]   = useState('');
  const [visible,  setVisible]  = useState(USERS_PAGE_SIZE);
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const q = search.toLowerCase();
  const filtered = (filter === 'all' ? users : users.filter(u => u.approvalStatus === filter))
    .filter(u => !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  const displayed = filtered.slice(0, visible);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <>
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisible(USERS_PAGE_SIZE); }}
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(''); setVisible(USERS_PAGE_SIZE); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'approved', 'pending', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setVisible(USERS_PAGE_SIZE); }}
              className={cn(
                'h-7 px-3 rounded-xl text-[11px] font-semibold transition-colors',
                filter === f ? 'bg-[#1f5135] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {f === 'all' ? `All (${users.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${users.filter(u => u.approvalStatus === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-[10px] text-gray-400">Showing {Math.min(visible, filtered.length)} of {filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
        )}

        {filtered.length === 0 && (
          <p className="text-center text-[12px] text-gray-400 py-8">{search ? 'No users match your search.' : 'No users in this category.'}</p>
        )}

        {displayed.map(u => (
          <div key={u.uid} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
            <Avatar name={u.displayName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{u.displayName}</p>
                <StatusBadge status={u.approvalStatus} />
              </div>
              <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Joined: {fmtDate(u.createdAt)}</p>
            </div>
            <button
              onClick={() => setSelected(u)}
              className="h-8 px-3 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-colors flex-shrink-0"
            >
              Details
            </button>
          </div>
        ))}

        {visible < filtered.length && (
          <button
            onClick={() => setVisible(v => v + USERS_PAGE_SIZE)}
            className="w-full h-8 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Load more ({filtered.length - visible} remaining)
          </button>
        )}
      </div>

      {selected && (
        <UserDetailModal
          profile={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { requests: accountReqs,  loading: aLoading } = useUserRequests();
  const { users,                   loading: uLoading } = useUserProfiles();
  const { requests: resourceReqs,  loading: sLoading } = useResourceRequests();

  const pendingAccounts  = accountReqs.filter(r => r.status === 'pending').length;
  const pendingResources = resourceReqs.filter(r => r.status === 'pending').length;
  const approved = users.filter(u => u.approvalStatus === 'approved').length;

  const stats = [
    { label: 'Total Users',        value: users.length,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Approved',           value: approved,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Accounts',   value: pendingAccounts,  color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Pending Resources',  value: pendingResources, color: 'text-purple-600',  bg: 'bg-purple-50'  },
  ];

  if (aLoading || uLoading || sLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={cn('rounded-2xl p-4 flex flex-col gap-1', s.bg)}>
            <p className={cn('text-[24px] font-bold', s.color)}>{s.value}</p>
            <p className="text-[11px] text-gray-600 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100">
        <h4 className="text-[12px] font-bold text-gray-900 mb-3">Recent Registrations</h4>
        <div className="space-y-2">
          {accountReqs.slice(0, 8).map(r => (
            <div key={r.uid} className="flex items-center gap-2">
              <Avatar name={r.displayName} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-800 truncate">{r.displayName}</p>
                <p className="text-[10px] text-gray-400 truncate">{r.email}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </div>

      {pendingResources > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <h4 className="text-[12px] font-bold text-amber-800 mb-1">
            {pendingResources} resource {pendingResources === 1 ? 'request' : 'requests'} awaiting approval
          </h4>
          <p className="text-[11px] text-amber-600">Go to the &ldquo;Resource Requests&rdquo; tab to review them.</p>
        </div>
      )}
    </div>
  );
}

// ─── AdminPanel ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview'           },
  { id: 'accounts',  label: 'Account Requests'   },
  { id: 'resources', label: 'Resource Requests'  },
  { id: 'users',     label: 'All Users'          },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { requests: accountReqs  } = useUserRequests();
  const { requests: resourceReqs } = useResourceRequests();
  const pendingAccounts  = accountReqs.filter(r => r.status === 'pending').length;
  const pendingResources = resourceReqs.filter(r => r.status === 'pending').length;

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard');
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader title="Admin Portal" subtitle="User management and sensor approval" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-1 border-b border-gray-100 pb-3 mb-4 flex-wrap">
            {TABS.map(tab => {
              const badge = tab.id === 'accounts'  ? pendingAccounts
                          : tab.id === 'resources' ? pendingResources
                          : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative h-8 px-3.5 rounded-xl text-[12px] font-semibold transition-colors',
                    activeTab === tab.id ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {tab.label}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview'   && <OverviewTab />}
          {activeTab === 'accounts'   && <AccountRequestsTab />}
          {activeTab === 'resources'  && <ResourceRequestsTab />}
          {activeTab === 'users'      && <UsersTab />}
        </Card>
      </div>
    </div>
  );
}
