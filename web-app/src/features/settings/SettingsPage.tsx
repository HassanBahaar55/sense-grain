'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { cn } from '@/lib/utils';
import { useLiveData } from '@/contexts/LiveDataContext';
import {
  useWarehouses, useZones, useSensorsForWarehouse,
  addWarehouse, updateWarehouse, deleteWarehouse,
  addZone, updateZone, deleteZone,
  addSensor, updateSensor, deleteSensor,
  type ManagedWarehouse, type ManagedZone, type ManagedSensor,
  type ManagedStatus, type SensorType, type SensorStatus,
} from '@/lib/storageManagement';

// ─── localStorage keys ────────────────────────────────────────────────────────
const PREF_KEY     = 'sg-preferences';
const TOGGLES_KEY  = 'sg-app-toggles';
const NOTIF_KEY    = 'sg-notifications';
const SENSOR_KEY   = 'sense-grain-alert-settings'; // shared with AlertsPage
const PROFILE_KEY  = 'sg-profile';
const APPEAR_KEY   = 'sg-appearance';

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'general' | 'notifications' | 'sensors' | 'security' | 'appearance' | 'infrastructure';
type ThemeChoice = 'light' | 'dark' | 'system';

interface Profile { name: string; email: string; department: string; initials: string; }
interface Preferences { language: string; timezone: string; dateFormat: string; tempUnit: string; }
interface AppearanceState { sidebarCollapsed: boolean; compactTables: boolean; showWarehouseIds: boolean; density: string; language: string; dateFormat: string; numberFormat: string; }

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>
      {children}
    </div>
  );
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer',
        enabled ? 'bg-[#1f5135]' : 'bg-gray-200',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
        enabled ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
  );
}

function RowItem({ icon, iconBg, iconColor, label, desc, children }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  label: string; desc: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.04]', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{subtitle}</p>}
    </div>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-[12px] font-semibold text-gray-600 flex-shrink-0">{label}</span>
      {children}
    </div>
  );
}

function PrefSelect({ value, options, onChange }: { value: string; options: string[]; onChange?: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] focus:ring-1 focus:ring-[#1f5135]/20 transition-colors cursor-pointer"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  );
}

// ─── Overlay modal wrapper ────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ profile, onSave, onClose }: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [dept, setDept] = useState(profile.department);

  const handleSave = () => {
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
    onSave({ name, email, department: dept, initials });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-900">Edit Profile</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[24px] font-bold text-white shadow-md">
              {profile.initials}
            </div>
          </div>
          {[
            { label: 'Full Name', value: name, set: setName, placeholder: 'Enter your name' },
            { label: 'Email Address', value: email, set: setEmail, placeholder: 'Enter email' },
            { label: 'Department', value: dept, set: setDept, placeholder: 'Enter department' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all shadow-sm"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = () => {
    setErr('');
    if (!cur) return setErr('Enter your current password.');
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== conf) return setErr('Passwords do not match.');
    setDone(true);
    setTimeout(onClose, 1800);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-900">Change Password</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        {done ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-[13px] font-bold text-gray-800">Password Updated</p>
            <p className="text-[11px] text-gray-400">Your password has been changed successfully.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {[
              { label: 'Current Password', value: cur, set: setCur },
              { label: 'New Password', value: next, set: setNext },
              { label: 'Confirm New Password', value: conf, set: setConf },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors"
                />
              </div>
            ))}
            {err && <p className="text-[11px] text-red-500 font-semibold">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all shadow-sm">Update Password</button>
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── 2FA Modal ────────────────────────────────────────────────────────────────

function TwoFAModal({ enabled, onClose, onToggle }: { enabled: boolean; onClose: () => void; onToggle: () => void; }) {
  const [confirmed, setConfirmed] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const handleConfirm = () => {
    if (code.length < 6) return setErr('Enter the 6-digit code from your authenticator app.');
    setConfirmed(true);
    setTimeout(() => { onToggle(); onClose(); }, 1500);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-900">{enabled ? 'Disable' : 'Enable'} Two-Factor Authentication</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        {confirmed ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-[13px] font-bold text-gray-800">2FA {enabled ? 'Disabled' : 'Enabled'}</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {!enabled && (
              <>
                <p className="text-[11px] text-gray-500 leading-relaxed">Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code below.</p>
                {/* Simulated QR code */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-gray-900 rounded-xl p-3 grid grid-cols-7 gap-[2px]">
                    {Array.from({ length: 49 }).map((_, i) => {
                      const on = [0,1,2,3,4,5,6,7,14,21,28,35,42,43,44,45,46,47,48,8,13,22,27,36,41,
                                  9,11,13,24,26,37,39,16,17,18,30,31,32].includes(i);
                      return <div key={i} className={cn('rounded-[1px]', on ? 'bg-white' : 'bg-gray-900')} />;
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-center text-gray-400 font-mono">Secret: JBSW Y3DP EHPK 3PXP</p>
              </>
            )}
            {enabled && <p className="text-[11px] text-gray-500 leading-relaxed">Enter your current authenticator code to confirm disabling 2FA.</p>}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Authenticator Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[14px] font-bold text-gray-800 text-center tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors"
              />
            </div>
            {err && <p className="text-[11px] text-red-500 font-semibold">{err}</p>}
            <div className="flex gap-2">
              <button onClick={handleConfirm} className={cn('flex-1 h-9 rounded-xl text-white text-[12px] font-semibold active:scale-[0.97] transition-all shadow-sm', enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1f5135] hover:bg-[#174028]')}>
                {enabled ? 'Disable 2FA' : 'Verify & Enable'}
              </button>
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── Active Sessions Modal ────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  { id: 'cur', device: 'Chrome · Windows 10', location: 'Karachi, PK', time: 'Active now', icon: '💻', current: true },
  { id: 's2',  device: 'Safari · iPhone 15',  location: 'Lahore, PK',  time: 'Yesterday, 11:30 PM', icon: '📱', current: false },
  { id: 's3',  device: 'Firefox · MacBook',   location: 'Islamabad, PK', time: '3 days ago',        icon: '💻', current: false },
];

function ActiveSessionsModal({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const terminate = (id: string) => {
    setTerminating(id);
    setTimeout(() => {
      setSessions((s) => s.filter((x) => x.id !== id));
      setTerminating(null);
    }, 900);
  };

  const terminateAll = () => {
    setTerminating('all');
    setTimeout(() => { setSessions((s) => s.filter((x) => x.current)); setTerminating(null); setDone(true); }, 1200);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-900">Active Sessions</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {done && <p className="text-[11px] text-green-600 font-semibold text-center">All other sessions terminated.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 ring-1 ring-black/[0.04]">
              <span className="text-[20px]">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold text-gray-800 truncate">{s.device}</p>
                  {s.current && <span className="text-[9px] font-bold bg-green-50 text-green-700 ring-1 ring-green-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Current</span>}
                </div>
                <p className="text-[10px] text-gray-400">{s.location} · {s.time}</p>
              </div>
              {!s.current && (
                <button
                  onClick={() => terminate(s.id)}
                  disabled={terminating === s.id}
                  className="flex-shrink-0 h-7 px-2.5 rounded-lg border border-red-200 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                >
                  {terminating === s.id ? '...' : 'End'}
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            {sessions.filter((s) => !s.current).length > 0 && (
              <button onClick={terminateAll} disabled={terminating === 'all'} className="flex-1 h-8 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all">
                {terminating === 'all' ? 'Terminating…' : 'End All Other Sessions'}
              </button>
            )}
            <button onClick={onClose} className="h-8 px-4 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Close</button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Login History Modal ──────────────────────────────────────────────────────

const MOCK_HISTORY = [
  { id: 1, device: 'Chrome · Windows 10', location: 'Karachi, PK',   time: 'Today, 09:14 AM',       status: 'success' },
  { id: 2, device: 'Safari · iPhone 15',  location: 'Lahore, PK',    time: 'Yesterday, 11:30 PM',   status: 'success' },
  { id: 3, device: 'Chrome · Windows 10', location: 'Karachi, PK',   time: 'May 20, 08:45 AM',      status: 'success' },
  { id: 4, device: 'Chrome · Windows 10', location: 'Karachi, PK',   time: 'May 18, 03:21 PM',      status: 'failed'  },
  { id: 5, device: 'Firefox · MacBook',   location: 'Islamabad, PK', time: 'May 17, 10:00 AM',      status: 'success' },
  { id: 6, device: 'Chrome · Windows 10', location: 'Karachi, PK',   time: 'May 15, 09:00 AM',      status: 'success' },
];

function LoginHistoryModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-[14px] font-bold text-gray-900">Login History</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-2 overflow-y-auto">
          {MOCK_HISTORY.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 ring-1 ring-black/[0.04]">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', h.status === 'success' ? 'bg-green-500' : 'bg-red-500')} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-800 truncate">{h.device}</p>
                <p className="text-[10px] text-gray-400">{h.location} · {h.time}</p>
              </div>
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                h.status === 'success' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200')}>
                {h.status === 'success' ? 'Success' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex-shrink-0">
          <button onClick={onClose} className="w-full h-8 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Close</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ title, desc, confirmLabel, confirmCls, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string; confirmCls?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const [done, setDone] = useState(false);
  const handle = () => { setDone(true); setTimeout(() => { onConfirm(); onCancel(); }, 1500); };
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        <div className="p-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="text-[13px] font-bold text-gray-800">Done</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handle} className={cn('flex-1 h-9 rounded-xl text-white text-[12px] font-semibold active:scale-[0.97] transition-all shadow-sm', confirmCls ?? 'bg-red-500 hover:bg-red-600')}>{confirmLabel}</button>
                <button onClick={onCancel} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all">Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Theme switcher ───────────────────────────────────────────────────────────

const THEME_OPTIONS: { id: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  {
    id: 'light', label: 'Light',
    icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  },
  {
    id: 'dark', label: 'Dark',
    icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  },
  {
    id: 'system', label: 'System',
    icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  },
];

function applyTheme(choice: ThemeChoice) {
  if (typeof document === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = choice === 'dark' || (choice === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldBeDark);
  try { localStorage.setItem('sg-theme', choice); } catch { /* noop */ }
}

// ─── Sensor threshold card ────────────────────────────────────────────────────

interface SensorThreshold {
  id: string; label: string; operator: string;
  value: number; unit: string;
  min: number; max: number; step: number;
  alertEnabled: boolean;
  iconBg: string; iconColor: string; badgeCls: string;
  icon: React.ReactNode;
}

const DEFAULT_THRESHOLDS: SensorThreshold[] = [
  {
    id: 'temp', label: 'Temperature', operator: '>',
    value: 32, unit: '°C', min: 25, max: 45, step: 0.5, alertEnabled: true,
    iconBg: 'bg-amber-50', iconColor: 'text-amber-600', badgeCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>,
  },
  {
    id: 'humidity', label: 'Humidity', operator: '>',
    value: 70, unit: '%', min: 50, max: 95, step: 1, alertEnabled: true,
    iconBg: 'bg-blue-50', iconColor: 'text-blue-500', badgeCls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>,
  },
  {
    id: 'moisture', label: 'Moisture', operator: '>',
    value: 14, unit: '%', min: 10, max: 20, step: 0.5, alertEnabled: true,
    iconBg: 'bg-teal-50', iconColor: 'text-teal-600', badgeCls: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    id: 'co2', label: 'CO₂ Level', operator: '>',
    value: 600, unit: 'ppm', min: 400, max: 1200, step: 10, alertEnabled: true,
    iconBg: 'bg-purple-50', iconColor: 'text-purple-600', badgeCls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>,
  },
  {
    id: 'aqi', label: 'Air Quality (AQI)', operator: '>',
    value: 100, unit: 'AQI', min: 50, max: 300, step: 5, alertEnabled: false,
    iconBg: 'bg-orange-50', iconColor: 'text-orange-500', badgeCls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>,
  },
  {
    id: 'capacity', label: 'Storage Capacity', operator: '>',
    value: 90, unit: '%', min: 70, max: 99, step: 1, alertEnabled: true,
    iconBg: 'bg-green-50', iconColor: 'text-[#1f5135]', badgeCls: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  },
];

function loadThresholds(): SensorThreshold[] {
  try {
    const raw = localStorage.getItem(SENSOR_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as { thresholds?: Record<string, number> };
    if (!parsed.thresholds) return DEFAULT_THRESHOLDS;
    return DEFAULT_THRESHOLDS.map((t) => {
      const v = parsed.thresholds![t.id];
      return v !== undefined ? { ...t, value: v } : t;
    });
  } catch { return DEFAULT_THRESHOLDS; }
}

function SensorCard({ item, onChange }: {
  item: SensorThreshold;
  onChange: (id: string, value: number, enabled: boolean) => void;
}) {
  const handleToggle = () => onChange(item.id, item.value, !item.alertEnabled);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    if (!isNaN(n)) onChange(item.id, n, item.alertEnabled);
  };

  return (
    <div className="p-4 rounded-2xl ring-1 ring-black/[0.05] bg-white hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.04]', item.iconBg)}>
            <span className={item.iconColor}>{item.icon}</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-gray-800 leading-tight">{item.label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Trigger threshold</p>
          </div>
        </div>
        <Toggle enabled={item.alertEnabled} onChange={handleToggle} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 flex-shrink-0">Alert when {item.operator}</span>
        <input
          type="number"
          value={item.value}
          onChange={handleChange}
          min={item.min}
          max={item.max}
          step={item.step}
          disabled={!item.alertEnabled}
          className={cn(
            'w-20 h-8 px-2 rounded-lg border text-[13px] font-bold text-gray-900 tabular-nums text-center',
            'focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135]',
            'transition-colors duration-150 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            item.alertEnabled
              ? 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-text'
              : 'border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed',
          )}
        />
        <span className="text-[11px] font-semibold text-gray-500 flex-shrink-0">{item.unit}</span>
        <div className="ml-auto flex-shrink-0">
          {item.alertEnabled
            ? <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', item.badgeCls)}>Active</span>
            : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Muted</span>}
        </div>
      </div>
    </div>
  );
}

// ─── APP_TOGGLES definition ───────────────────────────────────────────────────

const APP_TOGGLES = [
  { id: 'autoRefresh',      label: 'Auto Refresh Data',   desc: 'Refresh dashboard data every 60 seconds automatically.',  on: true,  iconBg: 'bg-green-50',  iconColor: 'text-[#1f5135]', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg> },
  { id: 'predictiveAlerts', label: 'Predictive Alerts',   desc: 'AI-powered risk predictions before threshold breach.',     on: true,  iconBg: 'bg-purple-50', iconColor: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: 'emailReports',     label: 'Daily Email Reports', desc: 'Receive a morning summary report to your email.',          on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
  { id: 'soundAlerts',      label: 'Sound Alerts',        desc: 'Play a chime for critical notifications.',                 on: false, iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> },
];

const DEFAULT_PREFS: Preferences = { language: 'English', timezone: '(GMT+05:00) Asia/Karachi', dateFormat: 'May 21, 2026', tempUnit: '°C' };
const DEFAULT_PROFILE: Profile = { name: 'Admin User', email: 'admin@sensegrain.com', department: 'Operations', initials: 'A' };

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const [profile, setProfile] = useState<Profile>(() => lsGet(PROFILE_KEY, DEFAULT_PROFILE));
  const [prefs, setPrefs] = useState<Preferences>(() => lsGet(PREF_KEY, DEFAULT_PREFS));
  const [appToggles, setAppToggles] = useState<Record<string, boolean>>(
    () => lsGet(TOGGLES_KEY, Object.fromEntries(APP_TOGGLES.map((t) => [t.id, t.on])))
  );
  const [saved, setSaved] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleSave = () => {
    lsSet(PREF_KEY, prefs);
    lsSet(TOGGLES_KEY, appToggles);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 1500);
  };

  const handleToggle = (id: string) => {
    setAppToggles((p) => {
      const next = { ...p, [id]: !p[id] };
      lsSet(TOGGLES_KEY, next);
      return next;
    });
  };

  const handleProfileSave = (p: Profile) => {
    setProfile(p);
    lsSet(PROFILE_KEY, p);
  };

  return (
    <>
      {showEditProfile && (
        <EditProfileModal profile={profile} onSave={handleProfileSave} onClose={() => setShowEditProfile(false)} />
      )}
      <div className="space-y-5">
        {/* Profile */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[22px] font-bold text-white shadow-md flex-shrink-0">
              {profile.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-bold text-gray-900">{profile.name}</span>
                <span className="text-[9px] font-bold text-[#1f5135] bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">Super Admin</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{profile.email} · {profile.department}</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Last login: Today at 09:14 AM</p>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit Profile
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Preferences */}
          <Card className="p-5">
            <SectionHead title="Preferences" subtitle="Regional and display settings" />
            <div className="divide-y divide-gray-50">
              <PrefRow label="Language">
                <PrefSelect value={prefs.language} options={['English', 'Urdu', 'Arabic', 'French', 'Spanish']} onChange={(v) => setPrefs((p) => ({ ...p, language: v }))} />
              </PrefRow>
              <PrefRow label="Time Zone">
                <PrefSelect value={prefs.timezone} options={['(GMT+00:00) UTC', '(GMT+05:00) Asia/Karachi', '(GMT+05:30) Asia/Kolkata', '(GMT+08:00) Asia/Shanghai']} onChange={(v) => setPrefs((p) => ({ ...p, timezone: v }))} />
              </PrefRow>
              <PrefRow label="Date Format">
                <PrefSelect value={prefs.dateFormat} options={['May 21, 2026', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} onChange={(v) => setPrefs((p) => ({ ...p, dateFormat: v }))} />
              </PrefRow>
              <PrefRow label="Temperature">
                <PrefSelect value={prefs.tempUnit} options={['°C', '°F', 'K']} onChange={(v) => setPrefs((p) => ({ ...p, tempUnit: v }))} />
              </PrefRow>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
              <button
                onClick={handleSave}
                className={cn(
                  'flex-1 h-8 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]',
                  saved ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-[#1f5135] text-white hover:bg-[#174028] shadow-sm',
                )}
              >
                {saved ? '✓ Saved' : 'Save Preferences'}
              </button>
              <button
                onClick={handleReset}
                className={cn(
                  'h-8 px-3.5 rounded-xl border text-[12px] font-semibold transition-all duration-150 active:scale-[0.97]',
                  resetFlash ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                )}
              >
                {resetFlash ? '↺ Reset' : 'Reset'}
              </button>
            </div>
          </Card>

          {/* App toggles */}
          <Card className="p-5">
            <SectionHead title="Application" subtitle="System behaviour and automation" />
            {APP_TOGGLES.map((t) => (
              <RowItem key={t.id} icon={t.icon} iconBg={t.iconBg} iconColor={t.iconColor} label={t.label} desc={t.desc}>
                <Toggle enabled={appToggles[t.id]} onChange={() => handleToggle(t.id)} />
              </RowItem>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

const CHANNELS = [
  { id: 'email',  label: 'Email Alerts',        desc: 'Critical alerts to admin@sensegrain.com',     on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
  { id: 'sms',    label: 'SMS Alerts',           desc: 'Text messages for critical sensor events',    on: false, iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .19.92z" /></svg> },
  { id: 'push',   label: 'Push Notifications',   desc: 'Browser push alerts while dashboard is open', on: true,  iconBg: 'bg-purple-50', iconColor: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
  { id: 'inapp',  label: 'In-App Notifications', desc: 'Badge and panel alerts inside the app',        on: true,  iconBg: 'bg-teal-50',   iconColor: 'text-teal-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
];

const ALERT_PREFS = [
  { id: 'critical', label: 'Critical Alerts',  desc: 'Temperature spikes, spoilage risk, offline sensors',     on: true,  iconBg: 'bg-red-50',    iconColor: 'text-red-500',    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg> },
  { id: 'high',     label: 'High Severity',    desc: 'Alerts requiring prompt attention within 1 hour',        on: true,  iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
  { id: 'medium',   label: 'Medium Severity',  desc: 'Moderate issues to monitor and review',                  on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: 'info',     label: 'System Info',      desc: 'Routine status updates and system messages',              on: false, iconBg: 'bg-gray-100',  iconColor: 'text-gray-500',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  { id: 'digest',   label: 'Weekly Digest',    desc: 'Summary email every Monday at 08:00 AM',                 on: true,  iconBg: 'bg-green-50',  iconColor: 'text-[#1f5135]',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
];

function NotificationsTab() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    () => lsGet(NOTIF_KEY + '-channels', Object.fromEntries(CHANNELS.map((c) => [c.id, c.on])))
  );
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    () => lsGet(NOTIF_KEY + '-prefs', Object.fromEntries(ALERT_PREFS.map((p) => [p.id, p.on])))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    lsSet(NOTIF_KEY + '-channels', channels);
    lsSet(NOTIF_KEY + '-prefs', prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleChannel = (id: string) => setChannels((p) => ({ ...p, [id]: !p[id] }));
  const togglePref = (id: string) => setPrefs((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHead title="Notification Channels" subtitle="Choose how you receive alerts" />
          {CHANNELS.map((c) => (
            <RowItem key={c.id} icon={c.icon} iconBg={c.iconBg} iconColor={c.iconColor} label={c.label} desc={c.desc}>
              <Toggle enabled={channels[c.id]} onChange={() => toggleChannel(c.id)} />
            </RowItem>
          ))}
        </Card>
        <Card className="p-5">
          <SectionHead title="Alert Preferences" subtitle="Which severity levels trigger notifications" />
          {ALERT_PREFS.map((a) => (
            <RowItem key={a.id} icon={a.icon} iconBg={a.iconBg} iconColor={a.iconColor} label={a.label} desc={a.desc}>
              <Toggle enabled={prefs[a.id]} onChange={() => togglePref(a.id)} />
            </RowItem>
          ))}
        </Card>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 h-8 px-5 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]',
            saved ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-[#1f5135] text-white hover:bg-[#174028] shadow-sm',
          )}
        >
          {saved ? (
            <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Saved</>
          ) : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Sensors & Thresholds ────────────────────────────────────────────────

function SensorsTab() {
  const [thresholds, setThresholds] = useState<SensorThreshold[]>(() => loadThresholds());
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback((id: string, value: number, enabled: boolean) => {
    setThresholds((prev) => prev.map((t) => t.id === id ? { ...t, value, alertEnabled: enabled } : t));
    setSaved(false);
  }, []);

  const handleSaveAll = () => {
    const existingRaw = localStorage.getItem(SENSOR_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const thresholdMap: Record<string, number> = {};
    thresholds.forEach((t) => { thresholdMap[t.id] = t.value; });
    lsSet(SENSOR_KEY, { ...existing, thresholds: thresholdMap });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Sensors & Thresholds</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Set alert trigger values for each sensor parameter</p>
        </div>
        <button
          onClick={handleSaveAll}
          className={cn(
            'flex items-center gap-2 h-8 px-4 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]',
            saved ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-[#1f5135] text-white hover:bg-[#174028] shadow-sm',
          )}
        >
          {saved ? (
            <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Saved</>
          ) : 'Save All Changes'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {thresholds.map((t) => (
          <SensorCard key={t.id} item={t} onChange={handleChange} />
        ))}
      </div>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-700">Thresholds apply globally</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">These values are synced with the Alerts page. Changes saved here update alert thresholds across all warehouses.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [twoFa, setTwoFa] = useState(() => lsGet<boolean>('sg-2fa', true));
  const [modal, setModal] = useState<'password' | '2fa' | 'sessions' | 'history' | 'revokeKeys' | 'signOutAll' | null>(null);

  const toggle2fa = () => {
    const next = !twoFa;
    setTwoFa(next);
    lsSet('sg-2fa', next);
  };

  const actions = [
    {
      label: 'Change Password',
      desc: 'Update your account password regularly for security',
      iconBg: 'bg-green-50', iconColor: 'text-[#1f5135]',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
      badge: null as string | null, action: 'Change' as string | null,
      onClick: () => setModal('password'),
    },
    {
      label: 'Two-Factor Authentication',
      desc: 'Extra security layer via authenticator app',
      iconBg: 'bg-green-50', iconColor: 'text-green-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
      badge: twoFa ? 'Enabled' : null, action: twoFa ? 'Disable' : 'Enable',
      onClick: () => setModal('2fa'),
    },
    {
      label: 'Active Sessions',
      desc: 'View and terminate active login sessions',
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
      badge: null, action: 'Manage',
      onClick: () => setModal('sessions'),
    },
    {
      label: 'Login History',
      desc: 'Review recent sign-in activity and locations',
      iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      badge: null, action: 'View',
      onClick: () => setModal('history'),
    },
  ];

  return (
    <>
      {modal === 'password'  && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === '2fa'       && <TwoFAModal enabled={twoFa} onClose={() => setModal(null)} onToggle={toggle2fa} />}
      {modal === 'sessions'  && <ActiveSessionsModal onClose={() => setModal(null)} />}
      {modal === 'history'   && <LoginHistoryModal onClose={() => setModal(null)} />}
      {modal === 'revokeKeys' && (
        <ConfirmDialog
          title="Revoke All API Keys"
          desc="All existing API keys will be permanently invalidated. Any integrations using them will stop working immediately."
          confirmLabel="Revoke All Keys"
          onConfirm={() => {}}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'signOutAll' && (
        <ConfirmDialog
          title="Sign Out All Devices"
          desc="You will be signed out from all browsers and devices, including this one. You'll need to log in again."
          confirmLabel="Sign Out All"
          onConfirm={() => {}}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-5">
        <Card className="p-5">
          <SectionHead title="Security Settings" subtitle="Manage password, authentication and session preferences" />
          <div className="divide-y divide-gray-50">
            {actions.map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-3.5">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.04]', item.iconBg)}>
                  <span className={item.iconColor}>{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 leading-tight">{item.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full ring-1 ring-green-200 flex-shrink-0">
                    {item.badge}
                  </span>
                )}
                {item.action && (
                  <button
                    onClick={item.onClick}
                    className={cn(
                      'flex items-center gap-1 h-7 px-3 rounded-xl border text-[11px] font-semibold active:scale-[0.97] transition-all duration-150 flex-shrink-0',
                      item.label === 'Two-Factor Authentication' && twoFa
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-gray-200 text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50',
                    )}
                  >
                    {item.action}
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="p-5">
          <h2 className="text-[13px] font-bold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-[11px] text-gray-400 mb-4">These actions are irreversible. Proceed with caution.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal('revokeKeys')}
              className="h-8 px-4 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all duration-150"
            >
              Revoke All API Keys
            </button>
            <button
              onClick={() => setModal('signOutAll')}
              className="h-8 px-4 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all duration-150"
            >
              Sign Out All Devices
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── Tab: Appearance ──────────────────────────────────────────────────────────

const DEFAULT_APPEARANCE: AppearanceState = {
  sidebarCollapsed: false, compactTables: true, showWarehouseIds: false, density: 'Normal',
  language: 'English', dateFormat: 'May 21, 2026', numberFormat: '1,000.00',
};

function AppearanceTab({ theme, setTheme }: { theme: ThemeChoice; setTheme: (t: ThemeChoice) => void }) {
  const [appear, setAppear] = useState<AppearanceState>(() => lsGet(APPEAR_KEY, DEFAULT_APPEARANCE));

  const update = (key: keyof AppearanceState, value: boolean | string) => {
    setAppear((p) => {
      const next = { ...p, [key]: value };
      lsSet(APPEAR_KEY, next);
      return next;
    });
  };

  return (
    <div className="space-y-5 max-w-xl">
      <Card className="p-5">
        <SectionHead title="Theme" subtitle="Choose your preferred appearance mode" />
        <div className="flex p-1 bg-gray-100 rounded-2xl gap-1 w-fit">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 select-none',
                theme === t.id ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.07]' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 leading-snug">
          {theme === 'system' ? 'Automatically matches your OS dark/light mode preference.'
            : theme === 'dark' ? 'Dark mode is active — reduces eye strain in low-light environments.'
            : 'Light mode is active — optimized for bright environments.'}
        </p>
      </Card>

      <Card className="p-5">
        <SectionHead title="Display" subtitle="Layout and density preferences" />
        <div className="divide-y divide-gray-50">
          <PrefRow label="Sidebar collapsed by default">
            <Toggle enabled={appear.sidebarCollapsed} onChange={() => update('sidebarCollapsed', !appear.sidebarCollapsed)} />
          </PrefRow>
          <PrefRow label="Compact data tables">
            <Toggle enabled={appear.compactTables} onChange={() => update('compactTables', !appear.compactTables)} />
          </PrefRow>
          <PrefRow label="Show warehouse IDs">
            <Toggle enabled={appear.showWarehouseIds} onChange={() => update('showWarehouseIds', !appear.showWarehouseIds)} />
          </PrefRow>
          <PrefRow label="Data density">
            <PrefSelect value={appear.density} options={['Compact', 'Normal', 'Comfortable']} onChange={(v) => update('density', v)} />
          </PrefRow>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHead title="Region" subtitle="Locale and formatting" />
        <div className="divide-y divide-gray-50">
          <PrefRow label="Language">
            <PrefSelect value={appear.language} options={['English', 'Urdu', 'Arabic', 'French']} onChange={(v) => update('language', v)} />
          </PrefRow>
          <PrefRow label="Date Format">
            <PrefSelect value={appear.dateFormat} options={['May 21, 2026', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} onChange={(v) => update('dateFormat', v)} />
          </PrefRow>
          <PrefRow label="Number Format">
            <PrefSelect value={appear.numberFormat} options={['1,000.00', '1.000,00']} onChange={(v) => update('numberFormat', v)} />
          </PrefRow>
        </div>
      </Card>
    </div>
  );
}

// ─── Infrastructure Tab ───────────────────────────────────────────────────────

const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  temperature: 'Temperature', humidity: 'Humidity', moisture: 'Moisture',
  co2: 'CO₂', aqi: 'AQI', multi: 'Multi-param',
};
const SENSOR_STATUS_CFG: Record<SensorStatus, { dot: string; label: string; text: string }> = {
  active:           { dot: 'bg-green-500',  label: 'Active',           text: 'text-green-600'  },
  inactive:         { dot: 'bg-gray-300',   label: 'Offline',          text: 'text-gray-400'   },
  faulty:           { dot: 'bg-red-500',    label: 'Faulty',           text: 'text-red-500'    },
  pending_approval: { dot: 'bg-amber-400',  label: 'Awaiting Approval', text: 'text-amber-600' },
  rejected:         { dot: 'bg-red-400',    label: 'Rejected',         text: 'text-red-500'    },
};

const INPUT_CLS  = 'w-full px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors placeholder:text-gray-400';
const SELECT_CLS = cn(INPUT_CLS, 'cursor-pointer');

// ── Infra modal shell ──
function InfraModal({ title, subtitle, onClose, children, footer, wide = false }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className={cn('w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden flex flex-col max-h-[90vh]', wide ? 'max-w-xl' : 'max-w-md')}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors ml-3">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
        {footer && <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

function InfraField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InfraFooter({ onClose, onSave, saving, label }: {
  onClose: () => void; onSave: () => void; saving: boolean; label: string;
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all">Cancel</button>
      <button onClick={onSave} disabled={saving} className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] disabled:opacity-50 active:scale-[0.97] transition-all shadow-sm">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}

// ── Add Warehouse Wizard ──────────────────────────────────────────────────────
// Step 1: Warehouse details
// Step 2: Define zones (names, how many)
// Step 3: Add sensors per zone + review

type WizardStep = 1 | 2 | 3;
interface WizardZone { name: string; }

function AddWarehouseWizard({ onClose }: { onClose: () => void }) {
  const { uid } = useLiveData();
  const [step, setStep]     = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [createErr, setCreateErr] = useState('');

  // Step 1 fields
  const [whName,     setWhName]     = useState('');
  const [whCap,      setWhCap]      = useState('1000');
  const [whLoc,      setWhLoc]      = useState('');
  const [whStatus,   setWhStatus]   = useState<ManagedStatus>('active');
  const [whLiveId,   setWhLiveId]   = useState('');

  // Step 2 fields — zones
  const [zones, setZones] = useState<WizardZone[]>([{ name: 'Zone 1' }, { name: 'Zone 2' }, { name: 'Zone 3' }]);

  const addZoneEntry   = () => setZones(z => [...z, { name: `Zone ${z.length + 1}` }]);
  const removeZone     = (i: number) => setZones(z => z.filter((_, idx) => idx !== i));
  const updateZoneName = (i: number, v: string) => setZones(z => z.map((z2, idx) => idx === i ? { name: v } : z2));

  const canGoStep2 = whName.trim().length > 0;
  const canGoStep3 = zones.length > 0 && zones.every(z => z.name.trim().length > 0);

  async function create() {
    if (!uid) return;
    setCreateErr('');
    setSaving(true);
    try {
      // Build warehouse payload — never pass undefined to Firestore
      const whPayload: {
        name: string; capacity: number; location: string;
        status: ManagedStatus; liveEngineId?: string;
      } = {
        name:     whName.trim(),
        capacity: Number(whCap) || 1000,
        location: whLoc.trim(),
        status:   whStatus,
      };
      if (whLiveId.trim()) whPayload.liveEngineId = whLiveId.trim();

      // 1. Create warehouse
      const whRef = await addWarehouse(uid, whPayload);
      const whId  = whRef.id;

      // 2. Create zones (no sensors — user adds them manually per zone)
      for (const z of zones) {
        if (!z.name.trim()) continue;
        await addZone(uid, { warehouseId: whId, name: z.name.trim(), status: whStatus });
      }
      onClose();
    } catch (err) {
      console.error('[AddWarehouseWizard]', err);
      setCreateErr('Failed to create warehouse. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const stepLabels = ['Warehouse Details', 'Define Zones', 'Sensors & Review'];

  return (
    <InfraModal
      title="Add Warehouse"
      subtitle={`Step ${step} of 3 — ${stepLabels[step - 1]}`}
      onClose={onClose}
      wide
      footer={
        <div className="flex gap-2">
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as WizardStep)} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              ← Back
            </button>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as WizardStep)}
              disabled={step === 1 ? !canGoStep2 : !canGoStep3}
              className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] disabled:opacity-40 active:scale-[0.97] transition-all shadow-sm"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={create}
              disabled={saving}
              className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] disabled:opacity-50 active:scale-[0.97] transition-all shadow-sm"
            >
              {saving ? 'Creating…' : `Create ${zones.length > 0 ? `(${zones.length} zones)` : ''}`}
            </button>
          )}
        </div>
      }
    >
      {/* Progress bar */}
      <div className="flex gap-1 -mt-1">
        {[1, 2, 3].map(s => (
          <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', s <= step ? 'bg-[#1f5135]' : 'bg-gray-200')} />
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <InfraField label="Warehouse Name *">
            <input className={INPUT_CLS} value={whName} onChange={e => setWhName(e.target.value)} placeholder="e.g. Warehouse A" autoFocus />
          </InfraField>
          <div className="grid grid-cols-2 gap-3">
            <InfraField label="Capacity (Tons)">
              <input className={INPUT_CLS} type="number" min="0" value={whCap} onChange={e => setWhCap(e.target.value)} />
            </InfraField>
            <InfraField label="Status">
              <select className={SELECT_CLS} value={whStatus} onChange={e => setWhStatus(e.target.value as ManagedStatus)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </InfraField>
          </div>
          <InfraField label="Location">
            <input className={INPUT_CLS} value={whLoc} onChange={e => setWhLoc(e.target.value)} placeholder="e.g. Block A, North Wing" />
          </InfraField>
          <InfraField label="Live Engine ID (optional)">
            <input className={INPUT_CLS} value={whLiveId} onChange={e => setWhLiveId(e.target.value)} placeholder="e.g. WH-I (for live readings)" />
            <p className="text-[10px] text-gray-400 mt-1">Maps this warehouse to a live sensor feed (WH-A … WH-G are pre-assigned)</p>
          </InfraField>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-[12px] text-gray-500 -mt-1">Name each zone. You can edit or add more zones later from Settings.</p>
          {/* Quick preset */}
          <div className="flex gap-2 flex-wrap">
            {[3, 5, 7].map(n => (
              <button
                key={n}
                onClick={() => setZones(Array.from({ length: n }, (_, i) => ({ name: `Zone ${i + 1}` })))}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#1f5135]/30 text-[#1f5135] hover:bg-green-50 transition-colors"
              >
                {n} zones
              </button>
            ))}
            <button
              onClick={() => setZones([...Array.from({ length: 4 }, (_, i) => ({ name: `Zone ${i + 1}` })), { name: 'Ambient' }])}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#1f5135]/30 text-[#1f5135] hover:bg-green-50 transition-colors"
            >
              4 + Ambient
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {zones.map((z, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                <input
                  className={cn(INPUT_CLS, 'flex-1')}
                  value={z.name}
                  onChange={e => updateZoneName(i, e.target.value)}
                  placeholder={`Zone name ${i + 1}`}
                />
                <button
                  onClick={() => removeZone(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addZoneEntry}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#1f5135] hover:bg-green-50 py-2 rounded-xl border-2 border-dashed border-[#1f5135]/30 hover:border-[#1f5135]/50 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add another zone
          </button>
        </div>
      )}

      {/* Step 3 — review */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Review summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-[12px]">
            <p className="font-bold text-gray-700 text-[13px]">Review</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <span className="text-gray-400">Warehouse</span>
              <span className="font-semibold text-gray-800 truncate">{whName}</span>
              <span className="text-gray-400">Capacity</span>
              <span className="font-semibold text-gray-800">{Number(whCap).toLocaleString()} Tons</span>
              {whLoc && <><span className="text-gray-400">Location</span><span className="font-semibold text-gray-800">{whLoc}</span></>}
              {whLiveId && <><span className="text-gray-400">Live ID</span><span className="font-semibold text-gray-800">{whLiveId}</span></>}
              <span className="text-gray-400">Status</span>
              <span className={cn('font-semibold', whStatus === 'active' ? 'text-green-600' : 'text-gray-400')}>{whStatus}</span>
              <span className="text-gray-400">Zones</span>
              <span className="font-semibold text-gray-800">{zones.length} ({zones.map(z => z.name).join(', ')})</span>
              <span className="text-gray-400">Sensors</span>
              <span className="font-semibold text-gray-500">0 — add manually per zone after creation</span>
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p className="text-[11px] text-blue-700 leading-snug">After creating the warehouse, expand each zone in the Infrastructure tab and use <strong>+ Add Sensor</strong> to install sensors manually.</p>
          </div>

          {createErr && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[11px] text-red-700 font-medium leading-snug">{createErr}</p>
            </div>
          )}
        </div>
      )}
    </InfraModal>
  );
}

// ── Edit Warehouse Modal ────────────────────────────────────────────────────

function EditWarehouseModal({ wh, onClose }: { wh: ManagedWarehouse; onClose: () => void }) {
  const { uid } = useLiveData();
  const [name,   setName]   = useState(wh.name);
  const [cap,    setCap]    = useState(String(wh.capacity));
  const [loc,    setLoc]    = useState(wh.location);
  const [status, setStatus] = useState<ManagedStatus>(wh.status);
  const [liveId, setLiveId] = useState(wh.liveEngineId ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !uid) return;
    setSaving(true);
    await updateWarehouse(uid, wh.id, { name: name.trim(), capacity: Number(cap) || 1000, location: loc.trim(), status, liveEngineId: liveId.trim() || undefined });
    setSaving(false);
    onClose();
  };

  return (
    <InfraModal title="Edit Warehouse" onClose={onClose} footer={<InfraFooter onClose={onClose} onSave={save} saving={saving} label="Save Changes" />}>
      <InfraField label="Name *"><input className={INPUT_CLS} value={name} onChange={e => setName(e.target.value)} /></InfraField>
      <div className="grid grid-cols-2 gap-3">
        <InfraField label="Capacity (Tons)"><input className={INPUT_CLS} type="number" min="0" value={cap} onChange={e => setCap(e.target.value)} /></InfraField>
        <InfraField label="Status">
          <select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as ManagedStatus)}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </InfraField>
      </div>
      <InfraField label="Location"><input className={INPUT_CLS} value={loc} onChange={e => setLoc(e.target.value)} /></InfraField>
      <InfraField label="Live Engine ID"><input className={INPUT_CLS} value={liveId} onChange={e => setLiveId(e.target.value)} placeholder="e.g. WH-A" /></InfraField>
    </InfraModal>
  );
}

// ── Zone modal ──────────────────────────────────────────────────────────────

function ZoneFormModal({ zone, warehouseId, onClose }: { zone?: ManagedZone; warehouseId: string; onClose: () => void }) {
  const { uid } = useLiveData();
  const [name,   setName]   = useState(zone?.name   ?? '');
  const [status, setStatus] = useState<ManagedStatus>(zone?.status ?? 'active');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !uid) return;
    setSaving(true);
    if (zone) await updateZone(uid, zone.id, { name: name.trim(), status });
    else      await addZone(uid, { warehouseId, name: name.trim(), status });
    setSaving(false);
    onClose();
  };

  return (
    <InfraModal title={zone ? 'Edit Zone' : 'Add Zone'} onClose={onClose} footer={<InfraFooter onClose={onClose} onSave={save} saving={saving} label={zone ? 'Save' : 'Add Zone'} />}>
      <InfraField label="Zone Name *"><input className={INPUT_CLS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zone 1, Ambient" autoFocus /></InfraField>
      <InfraField label="Status">
        <select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as ManagedStatus)}>
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </InfraField>
    </InfraModal>
  );
}

// ── Sensor modal ────────────────────────────────────────────────────────────

function SensorFormModal({ sensor, zoneId, warehouseId, onClose }: {
  sensor?: ManagedSensor; zoneId: string; warehouseId: string; onClose: () => void;
}) {
  const { uid } = useLiveData();
  const [name,   setName]   = useState(sensor?.name   ?? '');
  const [type,   setType]   = useState<SensorType>(sensor?.type   ?? 'temperature');
  const [status, setStatus] = useState<SensorStatus>(sensor?.status ?? 'active');
  const [saving, setSaving] = useState(false);

  const isNew            = !sensor;
  const isPendingOrRejected = sensor?.status === 'pending_approval' || sensor?.status === 'rejected';

  const save = async () => {
    if (!name.trim() || !uid) return;
    setSaving(true);
    if (sensor) await updateSensor(uid, sensor.id, { name: name.trim(), type, status });
    else        await addSensor(uid, { zoneId, warehouseId, name: name.trim(), type, status: 'pending_approval' });
    setSaving(false);
    onClose();
  };

  return (
    <InfraModal title={sensor ? 'Edit Sensor' : 'Add Sensor'} onClose={onClose} footer={<InfraFooter onClose={onClose} onSave={save} saving={saving} label={sensor ? 'Save' : 'Submit Request'} />}>
      <InfraField label="Sensor Name *"><input className={INPUT_CLS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Temperature Sensor 1" autoFocus /></InfraField>
      <InfraField label="Type">
        <select className={SELECT_CLS} value={type} onChange={e => setType(e.target.value as SensorType)} disabled={isPendingOrRejected}>
          {(Object.keys(SENSOR_TYPE_LABELS) as SensorType[]).map(t => (
            <option key={t} value={t}>{SENSOR_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </InfraField>
      {isNew ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mt-1">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-[11px] text-amber-700 leading-snug">
            Sensor activation requires <strong>admin approval</strong>. A request will be sent automatically. You can track its status in the Infrastructure tab.
          </p>
        </div>
      ) : isPendingOrRejected ? (
        <InfraField label="Status">
          <span className={cn('text-[11px] font-semibold px-2.5 py-1.5 rounded-lg inline-block',
            sensor?.status === 'pending_approval' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700',
          )}>
            {sensor?.status === 'pending_approval' ? 'Awaiting Admin Approval' : 'Rejected by Admin'}
          </span>
        </InfraField>
      ) : (
        <InfraField label="Status">
          <select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as SensorStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="faulty">Faulty</option>
          </select>
        </InfraField>
      )}
    </InfraModal>
  );
}

// ── Delete confirm ──────────────────────────────────────────────────────────

function InfraDeleteConfirm({ title, desc, onConfirm, onClose }: {
  title: string; desc: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setBusy(true);
    await onConfirm();
    setDone(true);
    setTimeout(onClose, 900);
  };

  return (
    <InfraModal title={title} onClose={onClose} footer={
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
        <button onClick={handle} disabled={busy} className="flex-1 h-9 rounded-xl bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 disabled:opacity-50 transition-all">
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    }>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-[12px] font-semibold text-gray-600">Deleted successfully</p>
        </div>
      ) : (
        <p className="text-[12.5px] text-gray-500 leading-relaxed">{desc} <strong className="text-gray-700">This cannot be undone.</strong></p>
      )}
    </InfraModal>
  );
}

// ── Zone row with sensors ────────────────────────────────────────────────────

function ZoneRow({ zone, warehouseId }: { zone: ManagedZone; warehouseId: string }) {
  const { uid } = useLiveData();
  const sensors = useSensorsForWarehouse(warehouseId);
  const zoneSensors = sensors.filter(s => s.zoneId === zone.id);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<
    | { type: 'editZone' }
    | { type: 'deleteZone' }
    | { type: 'addSensor' }
    | { type: 'editSensor'; sensor: ManagedSensor }
    | { type: 'deleteSensor'; sensor: ManagedSensor }
    | null
  >(null);

  return (
    <>
      {modal?.type === 'editZone'   && <ZoneFormModal zone={zone} warehouseId={warehouseId} onClose={() => setModal(null)} />}
      {modal?.type === 'deleteZone' && (
        <InfraDeleteConfirm
          title={`Delete ${zone.name}?`}
          desc={`All ${zoneSensors.length} sensor(s) in this zone will also be permanently removed.`}
          onConfirm={async () => { if (uid) await deleteZone(uid, zone.id); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'addSensor'  && <SensorFormModal zoneId={zone.id} warehouseId={warehouseId} onClose={() => setModal(null)} />}
      {modal?.type === 'editSensor' && (
        <SensorFormModal sensor={modal.sensor} zoneId={zone.id} warehouseId={warehouseId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteSensor' && (
        <InfraDeleteConfirm
          title={`Remove ${modal.sensor.name}?`}
          desc="The sensor and its readings link will be permanently deleted."
          onConfirm={async () => { if (uid) await deleteSensor(uid, modal.sensor.id); }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Zone header row */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50/80 hover:bg-gray-100/60 transition-colors">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-2 flex-1 text-left min-w-0"
          >
            <svg className={cn('w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform', expanded && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span className="text-[12px] font-semibold text-gray-800 truncate">{zone.name}</span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
              zone.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
            )}>{zone.status}</span>
            <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 pr-2">{zoneSensors.length} sensors</span>
          </button>
          <button
            onClick={() => setModal({ type: 'addSensor' })}
            className="w-6 h-6 rounded-lg bg-[#1f5135] flex items-center justify-center hover:bg-[#174028] transition-colors flex-shrink-0"
            title="Add sensor"
          >
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button
            onClick={() => setModal({ type: 'editZone' })}
            className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
            title="Edit zone"
          >
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            onClick={() => setModal({ type: 'deleteZone' })}
            className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
            title="Delete zone"
          >
            <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>

        {/* Sensors list */}
        {expanded && (
          <div className="divide-y divide-gray-50">
            {zoneSensors.length === 0 ? (
              <div className="px-4 py-3 text-center">
                <p className="text-[11px] text-gray-400">No sensors yet</p>
                <button onClick={() => setModal({ type: 'addSensor' })} className="text-[11px] font-semibold text-[#1f5135] hover:underline mt-1">+ Add sensor</button>
              </div>
            ) : (
              zoneSensors.map(s => {
                const cfg = SENSOR_STATUS_CFG[s.status];
                return (
                  <div key={s.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 group">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400">{SENSOR_TYPE_LABELS[s.type]} · <span className={cfg.text}>{cfg.label}</span></p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ type: 'editSensor', sensor: s })} className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors" title="Edit">
                        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setModal({ type: 'deleteSensor', sensor: s })} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors" title="Remove">
                        <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Warehouse accordion card ─────────────────────────────────────────────────

function WarehouseCard({ wh }: { wh: ManagedWarehouse }) {
  const { uid } = useLiveData();
  const [expanded, setExpanded] = useState(false);
  const { zones } = useZones(expanded ? wh.id : null);
  const [modal, setModal] = useState<
    | { type: 'edit' }
    | { type: 'delete' }
    | { type: 'addZone' }
    | null
  >(null);

  return (
    <>
      {modal?.type === 'edit'    && <EditWarehouseModal wh={wh} onClose={() => setModal(null)} />}
      {modal?.type === 'delete'  && (
        <InfraDeleteConfirm
          title={`Delete ${wh.name}?`}
          desc="All zones and sensors inside will be permanently removed."
          onConfirm={async () => { if (uid) await deleteWarehouse(uid, wh.id); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'addZone' && <ZoneFormModal warehouseId={wh.id} onClose={() => setModal(null)} />}

      <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm overflow-hidden">
        {/* Warehouse header */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-3 flex-1 text-left min-w-0">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              wh.status === 'active' ? 'bg-[#1f5135]/10' : 'bg-gray-100',
            )}>
              <svg className={cn('w-4 h-4', wh.status === 'active' ? 'text-[#1f5135]' : 'text-gray-400')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-gray-900 truncate">{wh.name}</span>
                {wh.liveEngineId && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{wh.liveEngineId}</span>}
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  wh.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
                )}>{wh.status}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{wh.location || 'No location'} · {wh.capacity.toLocaleString()} tons</p>
            </div>
            <svg className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', expanded && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setModal({ type: 'edit' })} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="Edit warehouse">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => setModal({ type: 'delete' })} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors" title="Delete warehouse">
              <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>

        {/* Zones section */}
        {expanded && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2 bg-gray-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Zones</span>
              <button
                onClick={() => setModal({ type: 'addZone' })}
                className="flex items-center gap-1 h-6 px-2.5 rounded-lg bg-[#1f5135] text-white text-[10px] font-bold hover:bg-[#174028] transition-colors"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Zone
              </button>
            </div>
            {zones.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-4">No zones yet — add your first zone</p>
            ) : (
              <div className="space-y-1.5">
                {zones.map(z => (
                  <ZoneRow key={z.id} zone={z} warehouseId={wh.id} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Infrastructure Tab ──────────────────────────────────────────────────────

function InfrastructureTab() {
  const { warehouses, loading } = useWarehouses();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      {wizardOpen && <AddWarehouseWizard onClose={() => setWizardOpen(false)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">Storage Infrastructure</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${warehouses.length} warehouse${warehouses.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Warehouse
          </button>
        </div>

        {/* Warehouse list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#1f5135]/30 border-t-[#1f5135] rounded-full animate-spin" />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <p className="text-[14px] font-semibold text-gray-400 mb-4">No warehouses yet</p>
            <button onClick={() => setWizardOpen(true)} className="px-5 py-2.5 rounded-xl bg-[#1f5135] text-white text-[12px] font-bold hover:bg-[#174028] transition-colors">
              Add your first warehouse
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {warehouses.map(wh => (
              <WarehouseCard key={wh.id} wh={wh} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',        label: 'General'        },
  { id: 'notifications',  label: 'Notifications'  },
  { id: 'sensors',        label: 'Sensors'        },
  { id: 'security',       label: 'Security'       },
  { id: 'appearance',     label: 'Appearance'     },
  { id: 'infrastructure', label: 'Infrastructure' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [theme, setThemeState] = useState<ThemeChoice>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sg-theme') as ThemeChoice | null;
      if (stored) setThemeState(stored);
    } catch { /* noop */ }
  }, []);

  const handleThemeChange = (t: ThemeChoice) => {
    setThemeState(t);
    applyTheme(t);
  };

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader title="Settings" subtitle="Account, preferences and system configuration" />

      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-shrink-0 px-4 py-3.5 text-[12px] font-semibold border-b-2 transition-all duration-150 whitespace-nowrap',
                tab === t.id
                  ? 'border-[#1f5135] text-[#1f5135]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <div className="p-5 sm:p-6 min-w-0">
          {tab === 'general'        && <GeneralTab />}
          {tab === 'notifications'  && <NotificationsTab />}
          {tab === 'sensors'        && <SensorsTab />}
          {tab === 'security'       && <SecurityTab />}
          {tab === 'appearance'     && <AppearanceTab theme={theme} setTheme={handleThemeChange} />}
          {tab === 'infrastructure' && <InfrastructureTab />}
        </div>
      </main>
    </div>
  );
}
