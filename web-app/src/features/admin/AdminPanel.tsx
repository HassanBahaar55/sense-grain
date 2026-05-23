'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const db = getFirestore(firebaseApp);

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface UserRequest {
  uid:         string;
  email:       string;
  displayName: string;
  requestedAt: number;
  status:      ApprovalStatus;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  user,
  onConfirm,
  onClose,
}: {
  user: UserRequest;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Reject Account</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-gray-500">
            Rejecting <strong className="text-gray-800">{user.displayName}</strong> ({user.email}).
            Optionally provide a reason.
          </p>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-800 placeholder:text-gray-400 resize-none outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason.trim())}
              className="flex-1 h-9 rounded-xl bg-red-600 text-[12px] font-semibold text-white hover:bg-red-700"
            >
              Confirm Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pending requests tab ─────────────────────────────────────────────────────

function PendingTab() {
  const { requests, loading } = useUserRequests();
  const pending = requests.filter(r => r.status === 'pending');
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
    } finally {
      setProcessingId(null);
    }
  }, []);

  const reject = useCallback(async (uid: string, reason: string) => {
    setProcessingId(uid);
    try {
      await Promise.all([
        updateDoc(doc(db, 'userRequests', uid), { status: 'rejected', rejectedReason: reason, rejectedAt: Date.now() }),
        updateDoc(doc(db, 'users', uid), { approvalStatus: 'rejected', rejectedReason: reason, updatedAt: serverTimestamp() }),
      ]);
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
    }
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[13px] font-semibold text-gray-700">All requests handled</p>
        <p className="text-[11px] text-gray-400 mt-1">No pending approval requests right now.</p>
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
                className="h-8 px-3 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => approve(req.uid)}
                disabled={processingId === req.uid}
                className="h-8 px-3 rounded-xl bg-emerald-600 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {processingId === req.uid ? <Spinner /> : null}
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejectTarget && (
        <RejectModal
          user={rejectTarget}
          onConfirm={(reason) => reject(rejectTarget.uid, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </>
  );
}

// ─── Active users tab ─────────────────────────────────────────────────────────

function UsersTab() {
  const { users, loading } = useUserProfiles();
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('all');

  const filtered = filter === 'all' ? users : users.filter(u => u.approvalStatus === filter);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1">
        {(['all', 'approved', 'pending', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'h-7 px-3 rounded-xl text-[11px] font-semibold transition-colors',
              filter === f
                ? 'bg-[#1f5135] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {f === 'all' ? `All (${users.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${users.filter(u => u.approvalStatus === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[12px] text-gray-400 py-8">No users in this category.</p>
      )}

      {filtered.map(u => (
        <div key={u.uid} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white">
          <Avatar name={u.displayName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{u.displayName}</p>
              <StatusBadge status={u.approvalStatus} />
            </div>
            <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Joined: {fmtDate(u.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { requests, loading: rLoading } = useUserRequests();
  const { users,    loading: uLoading } = useUserProfiles();

  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = users.filter(u => u.approvalStatus === 'approved').length;
  const rejected = users.filter(u => u.approvalStatus === 'rejected').length;

  const stats = [
    { label: 'Total Registered', value: users.length,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Approved Users',   value: approved,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Approval', value: pending,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Rejected',         value: rejected,       color: 'text-red-600',     bg: 'bg-red-50'     },
  ];

  if (rLoading || uLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

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
          {requests.slice(0, 8).map(r => (
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
    </div>
  );
}

// ─── AdminPanel ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'pending',  label: 'Pending Requests' },
  { id: 'users',    label: 'All Users'        },
  { id: 'overview', label: 'Overview'         },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const { requests } = useUserRequests();
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard');
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DashboardHeader title="Admin Portal" subtitle="User management and system overview" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative h-8 px-3.5 rounded-xl text-[12px] font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'bg-[#1f5135] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {tab.label}
                {tab.id === 'pending' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'pending'  && <PendingTab />}
          {activeTab === 'users'    && <UsersTab />}
          {activeTab === 'overview' && <OverviewTab />}
        </Card>
      </div>
    </div>
  );
}
