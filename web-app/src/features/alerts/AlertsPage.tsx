'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { AlertsTrendChart } from '@/components/charts/AlertsTrendChart';
import { type Alert, type AlertSeverity, type AlertStatus, type AlertParamType } from '@/lib/dataEngine';
import { useFirestoreAlertsData as useAlertsData, useAlertHistory, type AlertHistoryItem } from '@/lib/useFirestoreData';
import { cn } from '@/lib/utils';

// ─── Design tokens ─────────────────────────────────────────────────────────────

const severityConfig: Record<AlertSeverity, { badge: string; dot: string; label: string; row: string; pill: string }> = {
  critical: { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',       dot: 'bg-red-500',    label: 'Critical', row: 'bg-red-50/30',    pill: 'bg-red-500 text-white'    },
  high:     { badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', dot: 'bg-orange-500', label: 'High',     row: 'bg-orange-50/20', pill: 'bg-orange-500 text-white' },
  medium:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  dot: 'bg-amber-400',  label: 'Medium',   row: '',                pill: 'bg-amber-400 text-white'  },
  low:      { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',     dot: 'bg-blue-400',   label: 'Low',      row: '',                pill: 'bg-blue-400 text-white'   },
  info:     { badge: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',    dot: 'bg-gray-400',   label: 'Info',     row: '',                pill: 'bg-gray-400 text-white'   },
};

const statusConfig: Record<AlertStatus, { badge: string; dot: string; label: string }> = {
  active:       { badge: 'bg-red-50 text-red-600',     dot: 'bg-red-500 animate-pulse', label: 'Active'       },
  acknowledged: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400',             label: 'Acknowledged' },
  resolved:     { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500',             label: 'Resolved'     },
  muted:        { badge: 'bg-gray-100 text-gray-500',  dot: 'bg-gray-400',              label: 'Muted'        },
};

// ─── Shared primitives ─────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>
      {children}
    </div>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string; value: number; sub: string;
  iconBg: string; iconColor: string; valueColor?: string;
  icon: React.ReactNode;
}
function SummaryCard({ label, value, sub, iconBg, iconColor, valueColor, icon }: SummaryCardProps) {
  return (
    <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
          <p className={cn('text-[26px] font-bold leading-tight mt-1', valueColor ?? 'text-gray-900')}>{value}</p>
          <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Alert Settings Modal ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'sense-grain-alert-settings';
interface AlertSettings {
  thresholds: { temp: number; humidity: number; moisture: number; co2: number; aqi: number };
  notifications: { inApp: boolean; email: boolean; sms: boolean; criticalOnly: boolean };
  autoResolveHours: number; muteNonCritical: boolean; soundEnabled: boolean;
}
const DEFAULT_SETTINGS: AlertSettings = {
  thresholds: { temp: 32, humidity: 70, moisture: 13, co2: 560, aqi: 50 },
  notifications: { inApp: true, email: true, sms: false, criticalOnly: false },
  autoResolveHours: 24, muteNonCritical: false, soundEnabled: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 flex-shrink-0', checked ? 'bg-[#1f5135]' : 'bg-gray-200')}
    >
      <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
    </button>
  );
}

function AlertSettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AlertSettings>(() => {
    try { const s = localStorage.getItem(SETTINGS_KEY); return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS; }
    catch { return DEFAULT_SETTINGS; }
  });
  const [saved, setSaved] = useState(false);
  function updateThreshold(key: keyof AlertSettings['thresholds'], val: number) { setSettings(s => ({ ...s, thresholds: { ...s.thresholds, [key]: val } })); }
  function updateNotif(key: keyof AlertSettings['notifications'], val: boolean) { setSettings(s => ({ ...s, notifications: { ...s.notifications, [key]: val } })); }
  function handleSave() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 900); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1f5135]/[0.08] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1f5135]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </div>
            <div><h2 className="text-[15px] font-black text-gray-900">Alert Settings</h2><p className="text-[11px] text-gray-400">Configure thresholds and notifications</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Sensor Thresholds</p>
            <div className="space-y-4">
              {([
                { key: 'temp',     label: 'Temperature', unit: '°C',  min: 20, max: 45, step: 0.5 },
                { key: 'humidity', label: 'Humidity',    unit: '%',   min: 40, max: 90, step: 1   },
                { key: 'moisture', label: 'Moisture',    unit: '%',   min: 8,  max: 20, step: 0.5 },
                { key: 'co2',      label: 'CO₂',         unit: ' ppm',min: 400,max: 800,step: 10  },
                { key: 'aqi',      label: 'AQI',         unit: '',    min: 20, max: 100, step: 1  },
              ] as const).map(({ key, label, unit, min, max, step }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-[12px] font-semibold text-gray-700 w-28 flex-shrink-0">{label}</span>
                  <input type="range" min={min} max={max} step={step} value={settings.thresholds[key]} onChange={e => updateThreshold(key, Number(e.target.value))} className="flex-1 h-1.5 rounded-full accent-[#1f5135] cursor-pointer" />
                  <span className="text-[12px] font-bold text-gray-800 w-20 text-right tabular-nums">{settings.thresholds[key]}{unit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100" />
          <div>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Notifications</p>
            <div className="space-y-3">
              {([
                { key: 'inApp',        label: 'In-App Alerts',       desc: 'Show alerts inside the dashboard' },
                { key: 'email',        label: 'Email Notifications',  desc: 'Send alert emails to admin' },
                { key: 'sms',          label: 'SMS Alerts',           desc: 'Text message for critical alerts' },
                { key: 'criticalOnly', label: 'Critical Only',        desc: 'Only notify for critical severity' },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div><p className="text-[12.5px] font-semibold text-gray-800">{label}</p><p className="text-[10.5px] text-gray-400">{desc}</p></div>
                  <Toggle checked={settings.notifications[key]} onChange={v => updateNotif(key, v)} />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100" />
          <div>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Behavior</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[12.5px] font-semibold text-gray-800">Mute Non-Critical</p><p className="text-[10.5px] text-gray-400">Suppress low/medium/info alerts</p></div>
                <Toggle checked={settings.muteNonCritical} onChange={v => setSettings(s => ({ ...s, muteNonCritical: v }))} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[12.5px] font-semibold text-gray-800">Alert Sounds</p><p className="text-[10.5px] text-gray-400">Play sound on new critical alerts</p></div>
                <Toggle checked={settings.soundEnabled} onChange={v => setSettings(s => ({ ...s, soundEnabled: v }))} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[12.5px] font-semibold text-gray-800">Auto-Resolve After</p><p className="text-[10.5px] text-gray-400">Automatically mark as resolved</p></div>
                <select value={settings.autoResolveHours} onChange={e => setSettings(s => ({ ...s, autoResolveHours: Number(e.target.value) }))} className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1f5135]/40">
                  <option value={6}>6 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={0}>Never</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50">
          <button onClick={() => setSettings(DEFAULT_SETTINGS)} className="text-[11.5px] font-semibold text-gray-500 hover:text-gray-700 transition-colors">Reset to defaults</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={handleSave} className={cn('h-9 px-5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center gap-2', saved ? 'bg-green-500 text-white' : 'bg-[#1f5135] hover:bg-[#174028] text-white')}>
              {saved ? <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>Saved</> : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert History Modal ───────────────────────────────────────────────────────

const HISTORY_RANGE_OPTIONS = [
  { label: 'Today',   days: 1  },
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
] as const;

function AlertHistoryModal({ onClose }: { onClose: () => void }) {
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7);
  const [search, setSearch] = useState('');
  const history = useAlertHistory(rangeDays);

  const filtered = useMemo(() => {
    if (!search) return history;
    const q = search.toLowerCase();
    return history.filter(a =>
      a.warehouseId.toLowerCase().includes(q) ||
      a.param.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      a.severity.toLowerCase().includes(q),
    );
  }, [history, search]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDuration(a: AlertHistoryItem) {
    if (!a.resolvedAt) return 'Ongoing';
    const ms = a.resolvedAt - a.triggeredAt;
    const min = Math.round(ms / 60000);
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative w-full sm:max-w-2xl max-h-[90vh] bg-white sm:rounded-2xl shadow-2xl ring-1 ring-black/[0.08] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-black text-gray-900">Alert History</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">All past alerts stored from sensor readings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-3 flex-wrap">
          {/* Range selector */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {HISTORY_RANGE_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRangeDays(days as 1 | 7 | 30)}
                className={cn('h-7 px-3 rounded-md text-[11px] font-bold transition-all', rangeDays === days ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search warehouse, parameter…" value={search} onChange={e => setSearch(e.target.value)} className="w-full h-8 pl-7 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors" />
          </div>
          <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">{filtered.length} records</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <p className="text-[13px] font-semibold text-gray-400">No alert history yet</p>
              <p className="text-[11px] text-gray-400 text-center max-w-xs">History builds up as sensors trigger and resolve alerts. Check back after the system has been running.</p>
            </div>
          ) : (
            filtered.map(a => {
              const sev = severityConfig[a.severity] ?? severityConfig.medium;
              return (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-2', sev.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', sev.badge)}>{sev.label}</span>
                      <span className="text-[11px] font-bold text-gray-800">{a.warehouseId}</span>
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className="text-[10px] text-gray-500">{a.param}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{a.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-gray-400 tabular-nums">{formatTime(a.triggeredAt)}</span>
                      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', a.resolvedAt ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600 animate-pulse')}>
                        {a.resolvedAt ? `Resolved · ${formatDuration(a)}` : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-gray-700 tabular-nums">{a.value}{a.unit}</p>
                    <p className="text-[9px] text-gray-400 tabular-nums">thr: {a.threshold}{a.unit}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">History is stored permanently in Firestore. Alerts accumulate over time.</p>
          <button onClick={onClose} className="h-8 px-4 rounded-xl bg-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-300 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts by Type donut ──────────────────────────────────────────────────────

interface DonutTipEntry { name?: string; value?: number; payload?: { color?: string } }
function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutTipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.payload?.color }} />
        <span className="text-[11px] font-semibold text-gray-700">{d.name}</span>
        <span className="text-[11px] font-bold text-gray-900 ml-1">{d.value}</span>
      </div>
    </div>
  );
}

function AlertsByTypePanel({ alertsByType }: { alertsByType: { label: string; count: number; color: string }[] }) {
  const total = alertsByType.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-bold text-gray-900">Alerts by Type</h2>
      <p className="text-[11px] text-gray-400 mt-0.5 mb-3">All warehouses · This week</p>
      <div className="relative" style={{ height: 116 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={alertsByType} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={36} outerRadius={52} startAngle={90} endAngle={-270} paddingAngle={2} strokeWidth={0}>
              {alertsByType.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <RechartTooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[20px] font-bold text-gray-900 leading-none">{total}</span>
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Total</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {alertsByType.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-gray-500 truncate flex-1">{d.label}</span>
            <span className="text-[10px] font-bold text-gray-700 flex-shrink-0">{d.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Recent Alerts feed ────────────────────────────────────────────────────────

function RecentAlertsPanel({ recentAlertFeed, onViewHistory }: {
  recentAlertFeed: { id: string; severity: AlertSeverity; warehouse: string; zone: string; message: string; time: string }[];
  onViewHistory: () => void;
}) {
  const shown = recentAlertFeed.slice(0, 5);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-gray-900">Recent Alerts</h2>
        <span className="text-[10px] font-semibold text-gray-400">Today</span>
      </div>
      <div className="space-y-0">
        {shown.map((item) => {
          const cfg = severityConfig[item.severity];
          return (
            <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 rounded-lg px-1.5 -mx-1.5 transition-colors">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', cfg.dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-700 leading-none">
                  {item.warehouse}<span className="font-normal text-gray-400 mx-1">·</span>{item.zone}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.message}</p>
              </div>
              <span className="text-[9px] font-semibold text-gray-400 flex-shrink-0 tabular-nums">{item.time}</span>
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-[11px] text-gray-400 py-3 text-center">No recent alerts</p>}
      </div>
      <button
        onClick={onViewHistory}
        className="mt-3 w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-[#1f5135] hover:bg-[#174028] text-white text-[11px] font-semibold transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        View Alert History
      </button>
    </Card>
  );
}

// ─── Filter Panel ──────────────────────────────────────────────────────────────

interface FilterValues {
  severity: string; type: string; status: string;
}

function FilterSelect({
  label, value, options, onChange, active,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  active: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'h-9 pl-3 pr-7 rounded-xl border text-[11px] font-semibold appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20',
          active
            ? 'border-[#1f5135]/40 bg-[#1f5135]/[0.06] text-[#1f5135]'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100',
        )}
      >
        <option value="all">{label}: All</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2 w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  );
}

// ─── Alerts table ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface TableProps {
  alerts: Alert[]; search: string;
  severityF: string; typeF: string; statusF: string;
  page: number; setPage: (p: number) => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onMute: (id: string) => void;
  onViewDetail: (id: string) => void;
}

function AlertsTable({ alerts, search, severityF, typeF, statusF, page, setPage, onAcknowledge, onResolve, onMute, onViewDetail }: TableProps) {
  const filtered = alerts.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.warehouse.toLowerCase().includes(q) && !a.zone.toLowerCase().includes(q)) return false;
    }
    if (severityF !== 'all' && a.severity !== severityF) return false;
    if (typeF !== 'all' && a.type !== typeF) return false;
    if (statusF !== 'all' && a.status !== statusF) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Auto-reset to page 1 when live data causes total pages to shrink
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page, setPage]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Clamp `from` so it never exceeds `to` (prevents "11–10" display bug)
  const from = filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length);
  const to   = Math.min(page * PAGE_SIZE, filtered.length);

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <Card className="p-5 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">
            {statusF === 'all' ? 'All Alerts' : statusF === 'active' ? 'Active Alerts' : statusF === 'resolved' ? 'Resolved Alerts' : statusF === 'acknowledged' ? 'Acknowledged Alerts' : 'Muted Alerts'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Showing {from}–{to} of {filtered.length} alerts</p>
        </div>
        {activeCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {activeCount} Active
          </span>
        )}
      </div>

      <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Severity', 'Alert', 'Warehouse / Zone', 'Parameter', 'Value', 'Threshold', 'Time', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[12px] text-gray-400 font-medium">
                  {filtered.length === 0 && (severityF !== 'all' || typeF !== 'all' || statusF !== 'all' || search)
                    ? 'No alerts match the current filters — try clearing them.'
                    : 'No alerts at this time.'}
                </td>
              </tr>
            ) : (
              paginated.map((a) => {
                const sCfg = severityConfig[a.severity];
                const stCfg = statusConfig[a.status];
                return (
                  <tr key={a.id} className={cn('hover:bg-gray-50/80 transition-colors duration-100 cursor-pointer', sCfg.row)}>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full', sCfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', sCfg.dot)} />{sCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-gray-800 text-[12px]">{a.title}</p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-mono">{a.id}</p>
                    </td>
                    <td className="px-3 py-3"><p className="font-bold text-gray-700">{a.warehouse}</p><p className="text-gray-400 text-[9px] mt-0.5">{a.zone}</p></td>
                    <td className="px-3 py-3 font-semibold text-gray-600">{a.parameter}</td>
                    <td className={cn('px-3 py-3 font-bold tabular-nums', a.severity === 'critical' ? 'text-red-600' : a.severity === 'high' ? 'text-orange-600' : a.severity === 'medium' ? 'text-amber-700' : 'text-gray-700')}>{a.value}</td>
                    <td className="px-3 py-3 text-gray-500 font-semibold tabular-nums">{a.threshold}</td>
                    <td className="px-3 py-3 text-gray-400 font-medium tabular-nums">{a.time}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full', stCfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', stCfg.dot)} />{stCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); onAcknowledge(a.id); }} disabled={a.status !== 'active'} className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-colors', a.status === 'active' ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-200 cursor-not-allowed')} title="Acknowledge">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onResolve(a.id); }} disabled={a.status === 'resolved'} className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-colors', a.status !== 'resolved' ? 'text-green-600 hover:bg-green-50' : 'text-gray-200 cursor-not-allowed')} title="Resolve">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onViewDetail(a.id); }} className="w-6 h-6 rounded-md flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors" title="View details">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-400 font-medium">Page {Math.min(page, totalPages)} of {totalPages}</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={cn('h-7 w-7 rounded-lg text-[11px] font-bold transition-colors', p === page ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100')}>{p}</button>
          ))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
        </div>
      </div>
    </Card>
  );
}

// ─── Alert detail modal ────────────────────────────────────────────────────────

function AlertDetailModal({ alert, onClose, onAcknowledge, onResolve }: {
  alert: Alert; onClose: () => void;
  onAcknowledge: (id: string) => void; onResolve: (id: string) => void;
}) {
  const sCfg = severityConfig[alert.severity];
  const stCfg = statusConfig[alert.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', sCfg.dot)} />
            <div><h3 className="text-[14px] font-bold text-gray-900">{alert.title}</h3><p className="text-[11px] text-gray-400 mt-0.5">{alert.id}</p></div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Severity',  value: <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sCfg.badge)}>{sCfg.label}</span> },
              { label: 'Status',    value: <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', stCfg.badge)}>{stCfg.label}</span> },
              { label: 'Warehouse', value: <span className="text-[11px] font-semibold text-gray-700">{alert.warehouse}</span> },
              { label: 'Zone',      value: <span className="text-[11px] font-semibold text-gray-700">{alert.zone}</span> },
              { label: 'Parameter', value: <span className="text-[11px] font-semibold text-gray-700">{alert.parameter}</span> },
              { label: 'Time',      value: <span className="text-[11px] font-semibold text-gray-700">{alert.time}</span> },
            ].map((row) => (
              <div key={row.label} className="p-2.5 rounded-xl bg-gray-50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">{row.label}</p>
                {row.value}
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Measured Value</p>
            <p className="text-[20px] font-bold text-gray-900 tabular-nums">{alert.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Threshold: {alert.threshold}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 pb-5">
          {alert.status === 'active' && (
            <button onClick={() => { onAcknowledge(alert.id); onClose(); }} className="flex-1 h-8 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 transition-colors border border-amber-200">Acknowledge</button>
          )}
          {alert.status !== 'resolved' && (
            <button onClick={() => { onResolve(alert.id); onClose(); }} className="flex-1 h-8 rounded-xl bg-green-50 text-green-700 text-[11px] font-bold hover:bg-green-100 transition-colors border border-green-200">Mark Resolved</button>
          )}
          <button onClick={onClose} className="flex-1 h-8 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-bold hover:bg-gray-200 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const alertsData = useAlertsData();
  const alerts     = alertsData.alerts;
  const alertsByType    = alertsData.alertsByType;
  const recentAlertFeed = alertsData.recentFeed;

  const tableRef = useRef<HTMLDivElement>(null);

  // Local status overrides (acknowledge / resolve without server round-trip)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>({});
  const [detailAlert, setDetailAlert]   = useState<Alert | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showHistory, setShowHistory]     = useState(false);

  function setAlertStatus(id: string, status: AlertStatus) {
    setStatusOverrides(prev => ({ ...prev, [id]: status }));
  }

  const effectiveAlerts: Alert[] = alerts.map(a => ({
    ...a,
    status: (statusOverrides[a.id] ?? a.status) as AlertStatus,
  }));

  const activeEffective = effectiveAlerts.filter(a => a.status === 'active');
  const effectiveSummary = {
    critical: activeEffective.filter(a => a.severity === 'critical').length,
    warning:  activeEffective.filter(a => ['high', 'medium'].includes(a.severity)).length,
    info:     activeEffective.filter(a => ['low', 'info'].includes(a.severity)).length,
    resolved: effectiveAlerts.filter(a => a.status === 'resolved').length,
  };

  // CSV export
  function handleExport() {
    const rows = effectiveAlerts.map(a =>
      [a.severity, `"${a.title}"`, a.warehouse, a.zone, a.parameter, a.value, a.threshold, a.time, a.status].join(',')
    );
    const csv = ['Severity,Alert,Warehouse,Zone,Parameter,Value,Threshold,Time,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `sense-grain-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccess(true); setTimeout(() => setExportSuccess(false), 2000);
  }

  // Filter state
  const [search, setSearch]   = useState('');
  const [filters, setFilters] = useState<{ severity: string; type: string; status: string }>({ severity: 'all', type: 'all', status: 'all' });
  const [page, setPage]       = useState(1);
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const activeFilterCount = (filters.severity !== 'all' ? 1 : 0) + (filters.type !== 'all' ? 1 : 0) + (filters.status !== 'all' ? 1 : 0);

  function handleFilterChange(key: keyof typeof filters, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  }
  function clearFilters() { setFilters({ severity: 'all', type: 'all', status: 'all' }); setSearch(''); setPage(1); }

  // Compute match count for filter panel info
  const matchCount = useMemo(() => effectiveAlerts.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.warehouse.toLowerCase().includes(search.toLowerCase()) && !a.zone.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.severity !== 'all' && a.severity !== filters.severity) return false;
    if (filters.type     !== 'all' && a.type     !== filters.type) return false;
    if (filters.status   !== 'all' && a.status   !== filters.status) return false;
    return true;
  }).length, [effectiveAlerts, search, filters]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {showSettings && <AlertSettingsModal onClose={() => setShowSettings(false)} />}
      {showHistory  && <AlertHistoryModal  onClose={() => setShowHistory(false)}  />}
      {detailAlert  && (
        <AlertDetailModal
          alert={detailAlert}
          onClose={() => setDetailAlert(null)}
          onAcknowledge={(id) => setAlertStatus(id, 'acknowledged')}
          onResolve={(id) => setAlertStatus(id, 'resolved')}
        />
      )}

      <DashboardHeader title="Alert Management" subtitle="Monitor, triage and resolve sensor alerts across all warehouses" />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Active Now" value={activeEffective.length} sub={activeEffective.length > 0 ? 'Need attention right now' : 'All clear'} iconBg="bg-blue-50" iconColor="text-blue-600" icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>} />
          <SummaryCard label="Critical" value={effectiveSummary.critical} sub={effectiveSummary.critical > 0 ? 'Sensor exceeded safe limit' : 'No critical issues'} iconBg="bg-red-50" iconColor="text-red-500" valueColor={effectiveSummary.critical > 0 ? 'text-red-500' : undefined} icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} />
          <SummaryCard label="Warnings" value={effectiveSummary.warning} sub="Approaching safe threshold" iconBg="bg-amber-50" iconColor="text-amber-500" valueColor={effectiveSummary.warning > 0 ? 'text-amber-600' : undefined} icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>} />
          <SummaryCard label="Resolved" value={effectiveSummary.resolved} sub="Confirmed fixed and closed" iconBg="bg-green-50" iconColor="text-green-600" valueColor={effectiveSummary.resolved > 0 ? 'text-green-600' : undefined} icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
        </section>

        {/* ── Search + Filter bar ─────────────────────────────────────────────── */}
        <Card className="px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder="Search alerts, warehouse, zone…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135]/40 transition-colors"
              />
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />

            {/* Filter dropdowns */}
            <FilterSelect
              label="Severity" value={filters.severity} active={filters.severity !== 'all'}
              onChange={v => handleFilterChange('severity', v)}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high',     label: 'High'     },
                { value: 'medium',   label: 'Medium'   },
                { value: 'low',      label: 'Low'      },
                { value: 'info',     label: 'Info'     },
              ]}
            />
            <FilterSelect
              label="Type" value={filters.type} active={filters.type !== 'all'}
              onChange={v => handleFilterChange('type', v)}
              options={[
                { value: 'temperature', label: 'Temperature' },
                { value: 'humidity',    label: 'Humidity'    },
                { value: 'moisture',    label: 'Moisture'    },
                { value: 'co2',         label: 'CO₂'         },
                { value: 'aqi',         label: 'AQI'         },
                { value: 'system',      label: 'System'      },
              ]}
            />
            <FilterSelect
              label="Status" value={filters.status} active={filters.status !== 'all'}
              onChange={v => handleFilterChange('status', v)}
              options={[
                { value: 'active',       label: 'Active'       },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'resolved',     label: 'Resolved'     },
                { value: 'muted',        label: 'Muted'        },
              ]}
            />

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-200"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Clear
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />

            {/* Export */}
            <button
              onClick={handleExport}
              title={exportSuccess ? 'Downloaded!' : 'Export as CSV'}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[11px] font-semibold transition-all border',
                exportSuccess ? 'bg-green-500 text-white border-green-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200',
              )}
            >
              {exportSuccess
                ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              }
              {exportSuccess ? 'Saved!' : 'Export'}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 text-[11px] font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Settings
            </button>
          </div>
        </Card>

        {/* ── Table + Right Panel ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,272px)] gap-5">
          <div ref={tableRef}>
            <AlertsTable
              alerts={effectiveAlerts}
              search={search}
              severityF={filters.severity}
              typeF={filters.type}
              statusF={filters.status}
              page={page}
              setPage={setPage}
              onAcknowledge={(id) => setAlertStatus(id, 'acknowledged')}
              onResolve={(id) => setAlertStatus(id, 'resolved')}
              onMute={(id) => setAlertStatus(id, 'muted')}
              onViewDetail={(id) => setDetailAlert(effectiveAlerts.find(a => a.id === id) ?? null)}
            />
          </div>
          <div className="flex flex-col gap-4 min-w-0">
            <AlertsByTypePanel alertsByType={alertsByType} />
            <RecentAlertsPanel recentAlertFeed={recentAlertFeed} onViewHistory={() => setShowHistory(true)} />
          </div>
        </section>

        {/* ── Trend Chart ──────────────────────────────────────────────────────── */}
        <Card className="p-5 min-w-0">
          <div className="flex items-start justify-between mb-1 gap-4">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Alerts Trend</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {chartDays === 7 ? 'Past 7 days — daily alert count by severity' : 'Past 30 days — daily alert count by severity'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {([7, 30] as const).map((d) => (
                  <button key={d} onClick={() => setChartDays(d)} className={cn('h-6 px-2.5 rounded-md text-[10px] font-bold transition-all duration-150', chartDays === d ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {d === 7 ? '7D' : '30D'}
                  </button>
                ))}
              </div>
              {[{ label: 'Critical', color: '#ef4444' }, { label: 'Warning', color: '#f59e0b' }, { label: 'Info', color: '#3b82f6' }].map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                  <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mb-4">
            This graph shows how many alerts fired each day, grouped by severity. It helps identify if certain days had spikes (e.g. heatwave, power failure).
          </p>
          <AlertsTrendChart days={chartDays} />
        </Card>

      </main>
    </div>
  );
}
