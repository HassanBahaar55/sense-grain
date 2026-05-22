'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'notifications' | 'sensors' | 'security' | 'appearance';
type ThemeChoice = 'light' | 'dark' | 'system';

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

function RowItem({
  icon, iconBg, iconColor, label, desc, children,
}: {
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

function PrefSelect({ value, options }: { value: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        defaultValue={value}
        className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] focus:ring-1 focus:ring-[#1f5135]/20 transition-colors cursor-pointer"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
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

function SensorCard({
  item,
  onChange,
}: {
  item: SensorThreshold;
  onChange: (id: string, value: number, enabled: boolean) => void;
}) {
  const [val, setVal] = useState(item.value);
  const [enabled, setEnabled] = useState(item.alertEnabled);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    onChange(item.id, val, next);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    if (!isNaN(n)) { setVal(n); onChange(item.id, n, enabled); }
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
        <Toggle enabled={enabled} onChange={handleToggle} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 flex-shrink-0">Alert when {item.operator}</span>
        <input
          type="number"
          value={val}
          onChange={handleChange}
          min={item.min}
          max={item.max}
          step={item.step}
          disabled={!enabled}
          className={cn(
            'w-20 h-8 px-2 rounded-lg border text-[13px] font-bold text-gray-900 tabular-nums text-center',
            'focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135]',
            'transition-colors duration-150 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            enabled
              ? 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-text'
              : 'border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed',
          )}
        />
        <span className="text-[11px] font-semibold text-gray-500 flex-shrink-0">{item.unit}</span>
        <div className="ml-auto flex-shrink-0">
          {enabled
            ? <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', item.badgeCls)}>Active</span>
            : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Muted</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

const APP_TOGGLES = [
  { id: 'autoRefresh',      label: 'Auto Refresh Data',   desc: 'Refresh dashboard data every 60 seconds automatically.',  on: true,  iconBg: 'bg-green-50',  iconColor: 'text-[#1f5135]', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg> },
  { id: 'predictiveAlerts', label: 'Predictive Alerts',   desc: 'AI-powered risk predictions before threshold breach.',     on: true,  iconBg: 'bg-purple-50', iconColor: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: 'emailReports',     label: 'Daily Email Reports', desc: 'Receive a morning summary report to your email.',          on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
  { id: 'soundAlerts',      label: 'Sound Alerts',        desc: 'Play a chime for critical notifications.',                 on: false, iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> },
];

function GeneralTab() {
  const [appToggles, setAppToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(APP_TOGGLES.map((t) => [t.id, t.on]))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[22px] font-bold text-white shadow-md flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold text-gray-900">Admin User</span>
              <span className="text-[9px] font-bold text-[#1f5135] bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">Super Admin</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">admin@sensegrain.com · Operations</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Last login: Today at 09:14 AM</p>
          </div>
          <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit Profile
          </button>
        </div>
      </Card>

      {/* Preferences + App Settings side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Preferences */}
        <Card className="p-5">
          <SectionHead title="Preferences" subtitle="Regional and display settings" />
          <div className="divide-y divide-gray-50">
            <PrefRow label="Language"><PrefSelect value="English" options={['English', 'Urdu', 'Arabic', 'French', 'Spanish']} /></PrefRow>
            <PrefRow label="Time Zone"><PrefSelect value="(GMT+05:00) Asia/Karachi" options={['(GMT+00:00) UTC', '(GMT+05:00) Asia/Karachi', '(GMT+05:30) Asia/Kolkata', '(GMT+08:00) Asia/Shanghai']} /></PrefRow>
            <PrefRow label="Date Format"><PrefSelect value="May 21, 2026" options={['May 21, 2026', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} /></PrefRow>
            <PrefRow label="Temperature"><PrefSelect value="°C" options={['°C', '°F', 'K']} /></PrefRow>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
            <button
              onClick={handleSave}
              className={cn(
                'flex-1 h-8 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]',
                saved
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : 'bg-[#1f5135] text-white hover:bg-[#174028] shadow-sm',
              )}
            >
              {saved ? '✓ Saved' : 'Save Preferences'}
            </button>
            <button className="h-8 px-3.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150">
              Reset
            </button>
          </div>
        </Card>

        {/* App toggles */}
        <Card className="p-5">
          <SectionHead title="Application" subtitle="System behaviour and automation" />
          {APP_TOGGLES.map((t) => (
            <RowItem key={t.id} icon={t.icon} iconBg={t.iconBg} iconColor={t.iconColor} label={t.label} desc={t.desc}>
              <Toggle enabled={appToggles[t.id]} onChange={() => setAppToggles((p) => ({ ...p, [t.id]: !p[t.id] }))} />
            </RowItem>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

const CHANNELS = [
  { id: 'email',  label: 'Email Alerts',        desc: 'Critical alerts to admin@sensegrain.com',  on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
  { id: 'sms',    label: 'SMS Alerts',           desc: 'Text messages for critical sensor events',  on: false, iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .19.92z" /></svg> },
  { id: 'push',   label: 'Push Notifications',   desc: 'Browser push alerts while dashboard is open', on: true,  iconBg: 'bg-purple-50', iconColor: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
  { id: 'inapp',  label: 'In-App Notifications', desc: 'Badge and panel alerts inside the app',       on: true,  iconBg: 'bg-teal-50',   iconColor: 'text-teal-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
];

const ALERT_PREFS = [
  { id: 'critical', label: 'Critical Alerts',  desc: 'Temperature spikes, spoilage risk, offline sensors',    on: true,  iconBg: 'bg-red-50',    iconColor: 'text-red-500',    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg> },
  { id: 'high',     label: 'High Severity',    desc: 'Alerts requiring prompt attention within 1 hour',       on: true,  iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
  { id: 'medium',   label: 'Medium Severity',  desc: 'Moderate issues to monitor and review',                 on: true,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: 'info',     label: 'System Info',      desc: 'Routine status updates and system messages',             on: false, iconBg: 'bg-gray-100',  iconColor: 'text-gray-500',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  { id: 'digest',   label: 'Weekly Digest',    desc: 'Summary email every Monday at 08:00 AM',                on: true,  iconBg: 'bg-green-50',  iconColor: 'text-[#1f5135]',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
];

function NotificationsTab() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CHANNELS.map((c) => [c.id, c.on]))
  );
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ALERT_PREFS.map((p) => [p.id, p.on]))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <SectionHead title="Notification Channels" subtitle="Choose how you receive alerts" />
        {CHANNELS.map((c) => (
          <RowItem key={c.id} icon={c.icon} iconBg={c.iconBg} iconColor={c.iconColor} label={c.label} desc={c.desc}>
            <Toggle enabled={channels[c.id]} onChange={() => setChannels((p) => ({ ...p, [c.id]: !p[c.id] }))} />
          </RowItem>
        ))}
      </Card>
      <Card className="p-5">
        <SectionHead title="Alert Preferences" subtitle="Which severity levels trigger notifications" />
        {ALERT_PREFS.map((a) => (
          <RowItem key={a.id} icon={a.icon} iconBg={a.iconBg} iconColor={a.iconColor} label={a.label} desc={a.desc}>
            <Toggle enabled={prefs[a.id]} onChange={() => setPrefs((p) => ({ ...p, [a.id]: !p[a.id] }))} />
          </RowItem>
        ))}
      </Card>
    </div>
  );
}

// ─── Tab: Sensors & Thresholds ────────────────────────────────────────────────

function SensorsTab() {
  const [thresholds, setThresholds] = useState<SensorThreshold[]>(DEFAULT_THRESHOLDS);
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback((id: string, value: number, enabled: boolean) => {
    setThresholds((prev) => prev.map((t) => t.id === id ? { ...t, value, alertEnabled: enabled } : t));
    setSaved(false);
  }, []);

  const handleSaveAll = () => {
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
            saved
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
              : 'bg-[#1f5135] text-white hover:bg-[#174028] shadow-sm',
          )}
        >
          {saved ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Saved
            </>
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
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">These values are used as defaults across all warehouses. Per-zone overrides can be configured from the Storage page.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [twoFa] = useState(true);

  const actions = [
    {
      label: 'Change Password',
      desc: 'Update your account password regularly for security',
      iconBg: 'bg-green-50', iconColor: 'text-[#1f5135]',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
      badge: null as string | null, action: 'Change' as string | null,
    },
    {
      label: 'Two-Factor Authentication',
      desc: 'Extra security layer via authenticator app',
      iconBg: 'bg-green-50', iconColor: 'text-green-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
      badge: twoFa ? 'Enabled' : null, action: twoFa ? null : 'Enable',
    },
    {
      label: 'Active Sessions',
      desc: 'View and terminate active login sessions',
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
      badge: null, action: 'Manage',
    },
    {
      label: 'Login History',
      desc: 'Review recent sign-in activity and locations',
      iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      badge: null, action: 'View',
    },
  ];

  return (
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
                <button className="flex items-center gap-1 h-7 px-3 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
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
          <button className="h-8 px-4 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all duration-150">
            Revoke All API Keys
          </button>
          <button className="h-8 px-4 rounded-xl border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all duration-150">
            Sign Out All Devices
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Appearance ──────────────────────────────────────────────────────────

function AppearanceTab({ theme, setTheme }: { theme: ThemeChoice; setTheme: (t: ThemeChoice) => void }) {
  return (
    <div className="space-y-5 max-w-xl">
      {/* Theme */}
      <Card className="p-5">
        <SectionHead title="Theme" subtitle="Choose your preferred appearance mode" />

        {/* Compact pill switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl gap-1 w-fit">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 select-none',
                theme === t.id
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.07]'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 leading-snug">
          {theme === 'system'
            ? 'Automatically matches your OS dark/light mode preference.'
            : theme === 'dark'
            ? 'Dark mode is active — reduces eye strain in low-light environments.'
            : 'Light mode is active — optimized for bright environments.'}
        </p>
      </Card>

      {/* Display options */}
      <Card className="p-5">
        <SectionHead title="Display" subtitle="Layout and density preferences" />
        <div className="divide-y divide-gray-50">
          <PrefRow label="Sidebar collapsed by default">
            <Toggle enabled={false} onChange={() => {}} />
          </PrefRow>
          <PrefRow label="Compact data tables">
            <Toggle enabled={true} onChange={() => {}} />
          </PrefRow>
          <PrefRow label="Show warehouse IDs">
            <Toggle enabled={false} onChange={() => {}} />
          </PrefRow>
          <PrefRow label="Data density">
            <PrefSelect value="Normal" options={['Compact', 'Normal', 'Comfortable']} />
          </PrefRow>
        </div>
      </Card>

      {/* Language / Region (quick access) */}
      <Card className="p-5">
        <SectionHead title="Region" subtitle="Locale and formatting" />
        <div className="divide-y divide-gray-50">
          <PrefRow label="Language"><PrefSelect value="English" options={['English', 'Urdu', 'Arabic', 'French']} /></PrefRow>
          <PrefRow label="Date Format"><PrefSelect value="May 21, 2026" options={['May 21, 2026', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} /></PrefRow>
          <PrefRow label="Number Format"><PrefSelect value="1,000.00" options={['1,000.00', '1.000,00']} /></PrefRow>
        </div>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',       label: 'General'       },
  { id: 'notifications', label: 'Notifications' },
  { id: 'sensors',       label: 'Sensors'       },
  { id: 'security',      label: 'Security'      },
  { id: 'appearance',    label: 'Appearance'    },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [theme, setThemeState] = useState<ThemeChoice>('light');

  // Load persisted theme on mount
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

  // System theme listener
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

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
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

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <div className="p-5 sm:p-6 min-w-0">
          {tab === 'general'       && <GeneralTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'sensors'       && <SensorsTab />}
          {tab === 'security'      && <SecurityTab />}
          {tab === 'appearance'    && <AppearanceTab theme={theme} setTheme={handleThemeChange} />}
        </div>
      </main>
    </div>
  );
}
