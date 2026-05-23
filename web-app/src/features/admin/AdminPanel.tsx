'use client';

import { useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useUser } from '@/contexts/UserContext';
import { useLiveData } from '@/contexts/LiveDataContext';
import {
  MOCK_USERS, MOCK_ORGS, ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS,
  type MockUser, type MockOrg, type UserRole, type UserStatus,
} from '@/lib/mockUsers';
import { cn } from '@/lib/utils';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>{children}</div>;
}

function Badge({ role }: { role: UserRole }) {
  const c = ROLE_COLORS[role];
  return (
    <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ring-1', c.bg, c.text, c.ring)}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusDot({ status }: { status: UserStatus | 'active' | 'suspended' }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold',
      status === 'active' ? 'text-green-600' : 'text-red-500')}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'active' ? 'bg-green-500' : 'bg-red-400')} />
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface UserFormState { name: string; email: string; role: UserRole; orgId: string; location: string; phone: string; }

function UserFormModal({
  title, initial, onSave, onClose,
}: {
  title: string;
  initial?: Partial<UserFormState>;
  onSave: (data: UserFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserFormState>({
    name: initial?.name ?? '', email: initial?.email ?? '',
    role: initial?.role ?? 'viewer', orgId: initial?.orgId ?? 'org-graintech',
    location: initial?.location ?? '', phone: initial?.phone ?? '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!form.name || !form.email) return;
    setSaved(true);
    setTimeout(() => { onSave(form); onClose(); }, 800);
  };

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof UserFormState; type?: string }) => (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors"
      />
    </div>
  );

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" field="name" />
          <Field label="Email" field="email" type="email" />
          <Field label="Location" field="location" />
          <Field label="Phone" field="phone" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-700 focus:outline-none focus:border-[#1f5135]"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Organization</label>
            <select
              value={form.orgId}
              onChange={e => setForm(p => ({ ...p, orgId: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-700 focus:outline-none focus:border-[#1f5135]"
            >
              {MOCK_ORGS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
        {form.role && (
          <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
            <span className="font-semibold text-gray-600">{ROLE_LABELS[form.role]}:</span>{' '}
            {ROLE_DESCRIPTIONS[form.role]}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className={cn('flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] shadow-sm',
              saved ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-[#1f5135] text-white hover:bg-[#174028]')}
          >
            {saved ? '✓ Saved' : 'Save User'}
          </button>
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ title, desc, confirmLabel, danger, onConfirm, onClose }: {
  title: string; desc: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const handle = () => { setDone(true); setTimeout(() => { onConfirm(); onClose(); }, 1000); };
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="p-5 space-y-4">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[13px] font-bold text-gray-800">Done</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-gray-600 leading-relaxed">{desc}</p>
            <div className="flex gap-2">
              <button onClick={handle} className={cn('flex-1 h-9 rounded-xl text-[12px] font-semibold text-white active:scale-[0.97] transition-all shadow-sm', danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1f5135] hover:bg-[#174028]')}>
                {confirmLabel}
              </button>
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { liveAlerts, isRunning, tick } = useLiveData();
  const activeAlerts = liveAlerts.filter(a => !a.resolved).length;

  const kpis = [
    { label: 'Total Users',       value: MOCK_USERS.length,  icon: '👥', color: 'bg-blue-50 text-blue-600',   ring: 'ring-blue-100'   },
    { label: 'Organizations',     value: MOCK_ORGS.length,   icon: '🏢', color: 'bg-purple-50 text-purple-600', ring: 'ring-purple-100' },
    { label: 'Active Warehouses', value: 26,                 icon: '🏭', color: 'bg-green-50 text-[#1f5135]',  ring: 'ring-green-100'  },
    { label: 'Live Alerts',       value: activeAlerts,       icon: '🔔', color: 'bg-red-50 text-red-600',      ring: 'ring-red-100'    },
  ];

  const services = [
    { name: 'Sensor Engine',     ok: isRunning, detail: isRunning ? `Tick #${tick} · 7s interval` : 'Stopped'     },
    { name: 'Data Engine',       ok: true,      detail: 'Serving all users'                                         },
    { name: 'Firebase Auth',     ok: true,      detail: 'Connected'                                                 },
    { name: 'Alert Processor',   ok: isRunning, detail: `${activeAlerts} active alerts`                             },
    { name: 'Prediction AI',     ok: true,      detail: 'Advanced model · 89% avg confidence'                       },
    { name: 'Report Scheduler',  ok: true,      detail: '6 schedules active'                                        },
  ];

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-[18px] mb-3 ring-1', k.color, k.ring)}>{k.icon}</div>
            <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">{k.value}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent users */}
        <Card className="p-5">
          <SectionHead title="Recent Users" subtitle="Latest registered accounts" />
          <div className="space-y-2">
            {MOCK_USERS.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">{u.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                </div>
                <Badge role={u.role} />
              </div>
            ))}
          </div>
        </Card>

        {/* System health */}
        <Card className="p-5">
          <SectionHead title="System Health" subtitle="Platform service status" />
          <div className="space-y-2.5">
            {services.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="relative flex-shrink-0">
                  <span className={cn('w-2 h-2 rounded-full block', s.ok ? 'bg-green-500' : 'bg-red-400')} />
                  {s.ok && <span className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-50" />}
                </span>
                <span className="text-[12px] font-semibold text-gray-700 flex-1">{s.name}</span>
                <span className="text-[10px] text-gray-400">{s.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', isRunning ? 'bg-green-500' : 'bg-gray-300')} />
            <span className="text-[11px] font-semibold text-gray-500">
              {isRunning ? `Live engine running — tick ${tick}` : 'Engine stopped'}
            </span>
          </div>
        </Card>
      </div>

      {/* Organization summary */}
      <Card className="p-5">
        <SectionHead title="Organizations" subtitle="Registered organizations and their plan" />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Organization','Location','Users','Warehouses','Plan','Status'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_ORGS.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-gray-800">{o.name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{o.location}</td>
                  <td className="py-2.5 pr-4 text-gray-600 tabular-nums">{o.userCount}</td>
                  <td className="py-2.5 pr-4 text-gray-600 tabular-nums">{o.warehouseCount}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
                      o.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' :
                      o.plan === 'professional' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                      'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                    )}>
                      {o.plan.charAt(0).toUpperCase() + o.plan.slice(1)}
                    </span>
                  </td>
                  <td className="py-2.5"><StatusDot status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]         = useState<MockUser[]>(MOCK_USERS);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [modal, setModal]         = useState<'add' | 'edit' | 'suspend' | 'activate' | 'delete' | null>(null);
  const [selected, setSelected]   = useState<MockUser | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.organization.toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleAdd = useCallback((data: { name: string; email: string; role: UserRole; orgId: string; location: string; phone: string }) => {
    const org = MOCK_ORGS.find(o => o.id === data.orgId);
    const newUser: MockUser = {
      id: `user_${Date.now()}`, ...data,
      organization: org?.name ?? data.orgId,
      status: 'active', lastLogin: 'Never', createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      avatar: data.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      dataPrefix: data.orgId.slice(0, 2).toUpperCase() + Date.now().toString().slice(-2),
      warehouses: [], primaryCrop: 'Mixed Grains',
    };
    setUsers(p => [newUser, ...p]);
  }, []);

  const handleEdit = useCallback((data: { name: string; email: string; role: UserRole; orgId: string; location: string; phone: string }) => {
    if (!selected) return;
    const org = MOCK_ORGS.find(o => o.id === data.orgId);
    setUsers(p => p.map(u => u.id === selected.id ? { ...u, ...data, organization: org?.name ?? u.organization } : u));
  }, [selected]);

  const handleSuspend   = useCallback(() => { if (selected) setUsers(p => p.map(u => u.id === selected.id ? { ...u, status: 'suspended' as const } : u)); }, [selected]);
  const handleActivate  = useCallback(() => { if (selected) setUsers(p => p.map(u => u.id === selected.id ? { ...u, status: 'active' as const } : u)); }, [selected]);
  const handleDelete    = useCallback(() => { if (selected) setUsers(p => p.filter(u => u.id !== selected.id)); }, [selected]);

  const openModal = (m: typeof modal, user?: MockUser) => { setSelected(user ?? null); setModal(m); };

  const roleOptions: Array<UserRole | 'all'> = ['all', 'super_admin', 'org_admin', 'operator', 'viewer'];

  return (
    <div className="space-y-4">
      {/* Modals */}
      {modal === 'add'      && <UserFormModal title="Add New User" onSave={handleAdd} onClose={() => setModal(null)} />}
      {modal === 'edit'     && selected && <UserFormModal title="Edit User" initial={selected} onSave={handleEdit} onClose={() => setModal(null)} />}
      {modal === 'suspend'  && selected && <ConfirmModal title="Suspend User" desc={`Suspend ${selected.name}? They will lose access immediately.`} confirmLabel="Suspend" danger onConfirm={handleSuspend} onClose={() => setModal(null)} />}
      {modal === 'activate' && selected && <ConfirmModal title="Activate User" desc={`Re-activate ${selected.name}? They will regain full access.`} confirmLabel="Activate" onConfirm={handleActivate} onClose={() => setModal(null)} />}
      {modal === 'delete'   && selected && <ConfirmModal title="Delete User" desc={`Permanently delete ${selected.name}? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={handleDelete} onClose={() => setModal(null)} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#1f5135]"
          />
        </div>
        <div className="flex gap-1.5">
          {roleOptions.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn('h-7 px-3 rounded-xl text-[10px] font-bold border transition-all',
                roleFilter === r ? 'bg-[#1f5135] text-white border-[#1f5135]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              )}>
              {r === 'all' ? 'All' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <button onClick={() => openModal('add')}
          className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all shadow-sm flex-shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                {['User','Role','Organization','Location','Last Login','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{u.avatar}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate leading-tight">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-600">{u.organization}</td>
                  <td className="px-4 py-3 text-gray-500">{u.location || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.lastLogin}</td>
                  <td className="px-4 py-3"><StatusDot status={u.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal('edit', u)}
                        className="h-6 px-2 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-all">
                        Edit
                      </button>
                      {u.status === 'active'
                        ? <button onClick={() => openModal('suspend', u)}
                            className="h-6 px-2 rounded-lg border border-amber-200 text-[10px] font-semibold text-amber-600 hover:bg-amber-50 transition-all">
                            Suspend
                          </button>
                        : <button onClick={() => openModal('activate', u)}
                            className="h-6 px-2 rounded-lg border border-green-200 text-[10px] font-semibold text-green-700 hover:bg-green-50 transition-all">
                            Activate
                          </button>
                      }
                      {u.role !== 'super_admin' && (
                        <button onClick={() => openModal('delete', u)}
                          className="h-6 px-2 rounded-lg border border-red-200 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-all">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[12px] text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{filtered.length} of {users.length} users</span>
          <span className="text-[10px] text-gray-300">Only Super Admin can add/edit/delete users</span>
        </div>
      </Card>
    </div>
  );
}

// ─── Live Sensor tab ──────────────────────────────────────────────────────────

function LiveSensorTab() {
  const { readings, liveAlerts, tick, isRunning } = useLiveData();
  const activeAlerts = liveAlerts.filter(a => !a.resolved);

  const WHs = ['WH-A','WH-B','WH-C','WH-D','WH-E','WH-F','WH-G'];

  function statusColor(status: string) {
    return status === 'high' ? 'text-red-600 bg-red-50' : status === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-50';
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="relative flex-shrink-0">
          <span className={cn('w-2.5 h-2.5 rounded-full block', isRunning ? 'bg-green-500' : 'bg-gray-400')} />
          {isRunning && <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-60" />}
        </span>
        <span className="text-[13px] font-bold text-gray-800">{isRunning ? 'Live Sensor Stream' : 'Engine Stopped'}</span>
        <span className="text-[11px] text-gray-400 ml-auto">Tick #{tick} · 7s interval</span>
      </div>

      {/* Sensor grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {WHs.map(id => {
          const s = readings[id];
          if (!s) return (
            <Card key={id} className="p-4">
              <div className="text-[12px] font-bold text-gray-400">{id}</div>
              <div className="text-[10px] text-gray-300 mt-1">Loading…</div>
            </Card>
          );
          return (
            <Card key={id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-gray-800">{id}</span>
                <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full capitalize', statusColor(s.status))}>{s.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Temp',     value: `${s.temperature.toFixed(1)}°C` },
                  { label: 'Humidity', value: `${s.humidity}%` },
                  { label: 'Moisture', value: `${s.moisture.toFixed(1)}%` },
                  { label: 'CO₂',      value: `${s.co2}ppm` },
                  { label: 'AQI',      value: `${s.aqi}` },
                  { label: 'Capacity', value: `${s.capacity}%` },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-1.5">
                    <p className="text-[9px] text-gray-400 font-semibold">{m.label}</p>
                    <p className="text-[11px] font-bold text-gray-800 tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[9px] text-gray-400">Spoilage risk</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.spoilageRisk}%`, backgroundColor: s.spoilageRisk > 60 ? '#ef4444' : s.spoilageRisk > 30 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <span className="text-[9px] font-bold text-gray-600 tabular-nums">{s.spoilageRisk}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Live alert feed */}
      <Card className="p-5">
        <SectionHead title="Live Alert Feed" subtitle={`${activeAlerts.length} active · auto-generates on threshold breach`} />
        {activeAlerts.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-4 text-center">All sensors within normal range</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeAlerts.slice().reverse().map(a => (
              <div key={a.id} className={cn('flex items-start gap-3 p-3 rounded-xl',
                a.severity === 'critical' ? 'bg-red-50 ring-1 ring-red-100' :
                a.severity === 'high' ? 'bg-orange-50 ring-1 ring-orange-100' :
                'bg-amber-50 ring-1 ring-amber-100')}>
                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                  a.severity === 'critical' ? 'bg-red-500' : a.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-800">{a.warehouseId} · {a.param}</p>
                  <p className="text-[10px] text-gray-600">{a.message}</p>
                </div>
                <span className="text-[9px] text-gray-400 flex-shrink-0 capitalize">{a.severity}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'users' | 'live';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview'      },
  { id: 'users',    label: 'User Management' },
  { id: 'live',     label: 'Live Sensors'  },
];

export default function AdminPanel() {
  const { currentUser, isAdmin } = useUser();
  const [tab, setTab] = useState<AdminTab>('overview');

  if (!isAdmin) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <DashboardHeader title="Admin Panel" subtitle="Super Admin access only" />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-50 ring-1 ring-red-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h2 className="text-[16px] font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-[12px] text-gray-500 max-w-xs">This area is restricted to Super Administrators only. Your current role: <span className="font-bold text-gray-700">{ROLE_LABELS[currentUser.role]}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader title="Admin Panel" subtitle="Platform management, user control, and system monitoring" />

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('flex-shrink-0 px-4 py-3.5 text-[12px] font-semibold border-b-2 transition-all duration-150 whitespace-nowrap',
                tab === t.id ? 'border-[#1f5135] text-[#1f5135]' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <div className="p-5 sm:p-6 min-w-0">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'users'    && <UsersTab />}
          {tab === 'live'     && <LiveSensorTab />}
        </div>
      </main>
    </div>
  );
}
