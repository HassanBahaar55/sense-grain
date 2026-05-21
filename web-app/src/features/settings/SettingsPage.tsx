'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ThemeChoice = 'light' | 'dark' | 'system';
type NavId = 'general' | 'notifications' | 'users' | 'warehouses' | 'integrations' | 'alerts' | 'reports' | 'security' | 'billing' | 'system' | 'audit';

const NAV_ORDER: NavId[] = ['general', 'notifications', 'users', 'warehouses', 'integrations', 'alerts', 'reports', 'security', 'billing', 'system', 'audit'];

// ─── Settings sub-navigation ──────────────────────────────────────────────────

const settingsNav: { id: NavId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'general', label: 'General',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  },
  {
    id: 'notifications', label: 'Notifications',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  },
  {
    id: 'users', label: 'Users & Roles',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    id: 'warehouses', label: 'Warehouses',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    id: 'integrations', label: 'Data & Integrations',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  },
  {
    id: 'alerts', label: 'Alerts & Thresholds',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  },
  {
    id: 'reports', label: 'Reports',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    id: 'security', label: 'Security',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    id: 'billing', label: 'Billing & Subscription',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  },
  {
    id: 'system', label: 'System',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  },
  {
    id: 'audit', label: 'Audit Logs',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  },
];

// ─── Application settings ─────────────────────────────────────────────────────

interface AppSetting {
  id: string; label: string; desc: string; defaultOn: boolean;
  colorBg: string; colorText: string; icon: React.ReactNode; isSelect?: boolean;
}

const appSettingsLeft: AppSetting[] = [
  { id: 'autoRefresh',      label: 'Auto Refresh Data',   desc: 'Automatically refresh dashboard and monitoring data.', defaultOn: true,  colorBg: 'bg-green-50',  colorText: 'text-[#1f5135]', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg> },
  { id: 'predictiveAlerts', label: 'Predictive Alerts',   desc: 'Enable AI predictions for potential risks and alerts.',  defaultOn: true,  colorBg: 'bg-purple-50', colorText: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: 'emailReports',     label: 'Email Reports',        desc: 'Receive daily summary reports to your email.',           defaultOn: true,  colorBg: 'bg-amber-50',  colorText: 'text-amber-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
  { id: 'maintenanceMode',  label: 'Maintenance Mode',     desc: 'Temporarily disable system for maintenance.',           defaultOn: false, colorBg: 'bg-red-50',    colorText: 'text-red-500',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> },
];

const appSettingsRight: AppSetting[] = [
  { id: 'soundNotifications', label: 'Sound Notifications', desc: 'Play sound for important alerts and notifications.', defaultOn: true,  colorBg: 'bg-amber-50',  colorText: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> },
  { id: 'dataBackup',         label: 'Data Backup',         desc: 'Automatically backup system data daily.',             defaultOn: true,  colorBg: 'bg-teal-50',   colorText: 'text-teal-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" /></svg> },
  { id: 'dataRetention',      label: 'Data Retention',      desc: 'Keep historical data for analysis and reporting.',    defaultOn: true,  colorBg: 'bg-green-50',  colorText: 'text-[#1f5135]',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>, isSelect: true },
  { id: 'betaFeatures',       label: 'Beta Features',        desc: 'Enable access to new features before release.',      defaultOn: false, colorBg: 'bg-purple-50', colorText: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l1 7H8L9 3z" /><path d="M8 10c0 0-2 1.5-2 5a6 6 0 0 0 12 0c0-3.5-2-5-2-5" /></svg> },
];

// ─── Thresholds ───────────────────────────────────────────────────────────────

const thresholds = [
  { label: 'Temperature',     value: '> 32 °C',   status: 'Critical', colorBg: 'bg-amber-50',  colorText: 'text-amber-600',  icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg> },
  { label: 'Humidity',        value: '> 70 %',    status: 'Critical', colorBg: 'bg-blue-50',   colorText: 'text-blue-500',   icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg> },
  { label: 'Moisture',        value: '> 14 %',    status: 'Critical', colorBg: 'bg-teal-50',   colorText: 'text-teal-600',   icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { label: 'CO₂ Level',       value: '> 600 ppm', status: 'Critical', colorBg: 'bg-purple-50', colorText: 'text-purple-600', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg> },
  { label: 'Air Quality (AQI)', value: '> 100',   status: 'Critical', colorBg: 'bg-orange-50', colorText: 'text-orange-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg> },
  { label: 'Storage Capacity', value: '> 90 %',   status: 'Critical', colorBg: 'bg-green-50',  colorText: 'text-[#1f5135]',  icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg> },
];

// ─── Security items ───────────────────────────────────────────────────────────

const securityItems = [
  { label: 'Change Password',           desc: 'Update your account password',          action: 'Change' as const,  badge: null as string | null, iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',                                                                    iconColor: 'text-[#1f5135]', iconBg: 'bg-green-50' },
  { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security',         action: null as string | null, badge: 'Enabled',           iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',                                                  iconColor: 'text-green-600', iconBg: 'bg-green-50' },
  { label: 'Active Sessions',           desc: 'Manage your active login sessions',      action: 'Manage' as const,  badge: null as string | null, iconPath: 'M2 3h20v14H2z M8 21h8M12 17v4',                                                                               iconColor: 'text-blue-600',  iconBg: 'bg-blue-50'  },
  { label: 'Login History',             desc: 'View recent login activity',             action: 'View' as const,    badge: null as string | null, iconPath: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2',                                                          iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>{children}</div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{title}</h2>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{subtitle}</p>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={enabled} onClick={onChange}
      className={cn('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer', enabled ? 'bg-[#1f5135]' : 'bg-gray-200')}
    >
      <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200', enabled ? 'translate-x-4' : 'translate-x-0')} />
    </button>
  );
}

function SettingRow({ colorBg, colorText, icon, label, desc, children }: { colorBg: string; colorText: string; icon: React.ReactNode; label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.05]', colorBg)}>
        <span className={colorText}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
      {children}
    </button>
  );
}

// ─── Theme preview cards ──────────────────────────────────────────────────────

function ThemePreview({ type }: { type: ThemeChoice }) {
  if (type === 'light') return (
    <div className="w-full h-[72px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
      <div className="h-4 bg-white border-b border-gray-100 flex items-center gap-1 px-1.5">
        <span className="w-3 h-1.5 rounded-sm bg-[#1f5135] opacity-80" /><span className="flex-1 h-1 bg-gray-100 rounded" /><span className="w-2 h-2 rounded-full bg-gray-200" />
      </div>
      <div className="flex h-full">
        <div className="w-7 bg-gray-100 border-r border-gray-200">{[1,2,3].map((i) => <div key={i} className="mx-1 my-1 h-1 rounded bg-gray-300" />)}</div>
        <div className="flex-1 p-1.5 space-y-1"><div className="h-2 bg-white rounded border border-gray-100" /><div className="grid grid-cols-2 gap-1"><div className="h-5 bg-white rounded border border-gray-100" /><div className="h-5 bg-white rounded border border-gray-100" /></div></div>
      </div>
    </div>
  );
  if (type === 'dark') return (
    <div className="w-full h-[72px] rounded-lg border border-gray-600/20 overflow-hidden bg-[#0f172a]">
      <div className="h-4 bg-[#1e293b] border-b border-white/10 flex items-center gap-1 px-1.5">
        <span className="w-3 h-1.5 rounded-sm bg-green-500 opacity-70" /><span className="flex-1 h-1 bg-white/10 rounded" /><span className="w-2 h-2 rounded-full bg-white/10" />
      </div>
      <div className="flex h-full">
        <div className="w-7 bg-[#0b1d0e] border-r border-white/[0.06]">{[1,2,3].map((i) => <div key={i} className="mx-1 my-1 h-1 rounded bg-green-900/50" />)}</div>
        <div className="flex-1 p-1.5 space-y-1"><div className="h-2 bg-white/5 rounded border border-white/10" /><div className="grid grid-cols-2 gap-1"><div className="h-5 bg-white/5 rounded border border-white/10" /><div className="h-5 bg-white/5 rounded border border-white/10" /></div></div>
      </div>
    </div>
  );
  return (
    <div className="w-full h-[72px] rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex h-full">
        <div className="w-1/2 bg-gray-50"><div className="h-4 bg-white border-b border-gray-100 flex items-center px-1.5"><span className="w-2 h-1 rounded bg-gray-200" /></div><div className="p-1 space-y-1"><div className="h-1 bg-gray-200 rounded w-3/4" /><div className="h-1 bg-gray-100 rounded w-1/2" /></div></div>
        <div className="w-1/2 bg-[#0f172a]"><div className="h-4 bg-[#1e293b] border-b border-white/10 flex items-center px-1.5"><span className="w-2 h-1 rounded bg-green-900/50" /></div><div className="p-1 space-y-1"><div className="h-1 bg-white/10 rounded w-3/4" /><div className="h-1 bg-white/5 rounded w-1/2" /></div></div>
      </div>
    </div>
  );
}

function PrefSelect({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <label className="text-[12px] font-semibold text-gray-600 flex-shrink-0 w-36">{label}</label>
      <div className="relative flex-1 min-w-0">
        <select defaultValue={value} className="w-full appearance-none h-8 pl-3 pr-8 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] focus:ring-1 focus:ring-[#1f5135]/20 transition-colors duration-150 cursor-pointer">
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toggle: toggleSidebar } = useSidebar();
  const [activeNav, setActiveNav]         = useState<NavId>('general');
  const [theme, setTheme]                 = useState<ThemeChoice>('light');
  const [dataRetention, setDataRetention] = useState('90 Days');

  const allSettings = [...appSettingsLeft, ...appSettingsRight];
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(allSettings.map((s) => [s.id, s.defaultOn]))
  );

  // ── Notification toggles ────────────────────────────────────────────────────
  const [notifToggles, setNotifToggles] = useState({
    emailAlerts: true, smsAlerts: false, pushNotifications: true, inAppNotifications: true,
    criticalAlerts: true, highSeverity: true, mediumSeverity: true, infoSystem: false, weeklyDigest: true,
  });

  // ── Warehouse toggles ───────────────────────────────────────────────────────
  const [whToggles, setWhToggles] = useState({ autoEscalation: true, archiveInactive: false });

  // ── Report toggles ──────────────────────────────────────────────────────────
  const [rptToggles, setRptToggles] = useState({ autoDaily: true, includeCharts: true, emailOnGen: true });

  // ── System toggles ──────────────────────────────────────────────────────────
  const [sysToggles, setSysToggles] = useState({ apiRateLimit: true });

  const flip  = (id: string) => setToggles((p) => ({ ...p, [id]: !p[id] }));
  const flipN = (id: keyof typeof notifToggles)   => setNotifToggles((p) => ({ ...p, [id]: !p[id] }));
  const flipW = (id: keyof typeof whToggles)      => setWhToggles((p)    => ({ ...p, [id]: !p[id] }));
  const flipR = (id: keyof typeof rptToggles)     => setRptToggles((p)   => ({ ...p, [id]: !p[id] }));
  const flipS = (id: keyof typeof sysToggles)     => setSysToggles((p)   => ({ ...p, [id]: !p[id] }));

  // ── Scroll detection ────────────────────────────────────────────────────────
  const mainRef     = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Partial<Record<NavId, HTMLElement | null>>>({});

  const setSectionRef = (id: NavId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const scrollToSection = (id: NavId) => {
    setActiveNav(id);
    const el        = sectionRefs.current[id];
    const container = mainRef.current;
    if (!el || !container) return;
    const target = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - 20;
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  };

  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = container.getBoundingClientRect().top + 100;
      let current: NavId = 'general';
      for (const id of NAV_ORDER) {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top <= threshold) current = id;
        else break;
      }
      setActiveNav(current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20 flex-shrink-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all duration-150 flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-tight tracking-tight">Settings</h1>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate hidden sm:block">Manage your account, preferences and system configuration</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 active:scale-[0.97] transition-all duration-150 select-none">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span className="hidden md:block">May 20 – May 21, 2026</span>
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300 active:scale-95 transition-all duration-150">
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">3</span>
          </button>
          <div className="w-px h-5 bg-gray-200 hidden md:block" />
          <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all duration-150 group">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white shadow-sm flex-shrink-0">A</div>
            <span className="hidden md:block text-[12px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Admin</span>
            <svg className="hidden md:block w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Settings sub-nav */}
        <aside className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto py-3 flex-col">
          <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase px-4 mb-2">Settings</p>
          <ul className="space-y-px px-2">
            {settingsNav.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 text-left',
                      isActive ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
                    )}
                  >
                    <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')}>{item.icon}</span>
                    <span className="flex-1 truncate leading-tight">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main scrollable content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="p-6 space-y-6 min-w-0">

            {/* ═══════════════════════════════════════════════════════════════
                GENERAL
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('general')} className="space-y-5">

              {/* Row 1: Profile + Preference + Theme */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,284px)] gap-5">

                {/* Profile Information */}
                <Card className="p-5 min-w-0">
                  <h2 className="text-[14px] font-bold text-gray-900 tracking-tight mb-4">Profile Information</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[22px] font-bold text-white shadow-md flex-shrink-0">A</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-gray-900">Admin User</span>
                        <span className="text-[9px] font-bold text-[#1f5135] bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">Super Admin</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">admin@sensegrain.com</p>
                      <p className="text-[11px] text-gray-400">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 mb-4">
                    {[{ label: 'Email', val: 'admin@sensegrain.com' }, { label: 'Phone', val: '+1 (555) 123-4567' }, { label: 'Department', val: 'Operations' }, { label: 'Last Login', val: 'Today, 09:14 AM' }].map((r) => (
                      <div key={r.label} className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-400 font-semibold w-24 flex-shrink-0">{r.label}</span>
                        <span className="text-gray-700 font-medium truncate">{r.val}</span>
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-[#1f5135] text-[#1f5135] text-[12px] font-semibold hover:bg-green-50 active:scale-[0.97] transition-all duration-150">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit Profile
                  </button>
                </Card>

                {/* Preference */}
                <Card className="p-5 min-w-0">
                  <h2 className="text-[14px] font-bold text-gray-900 tracking-tight mb-1">Preference</h2>
                  <div className="divide-y divide-gray-50">
                    <PrefSelect label="Language"         value="English"                    options={['English', 'Urdu', 'Arabic', 'French', 'Spanish']} />
                    <PrefSelect label="Time Zone"        value="(GMT+05:30) Asia/Kolkata"   options={['(GMT+00:00) UTC', '(GMT+05:00) Asia/Karachi', '(GMT+05:30) Asia/Kolkata', '(GMT+08:00) Asia/Shanghai']} />
                    <PrefSelect label="Date Format"      value="May 21, 2026"               options={['May 21, 2026', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} />
                    <PrefSelect label="Temperature Unit" value="°C"                         options={['°C', '°F', 'K']} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                    <button className="flex-1 h-8 rounded-lg bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all duration-150 shadow-sm">Save Preferences</button>
                    <button className="h-8 px-3.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150">Reset</button>
                  </div>
                </Card>

                {/* Theme */}
                <Card className="p-5 min-w-0">
                  <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Theme</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5 mb-4 leading-snug">Choose your preferred theme for the application.</p>
                  <div className="space-y-3">
                    {(['light', 'dark', 'system'] as ThemeChoice[]).map((t) => (
                      <button key={t} onClick={() => setTheme(t)}
                        className={cn('w-full text-left rounded-xl p-2.5 border transition-all duration-150', theme === t ? 'border-[#1f5135] ring-2 ring-[#1f5135]/15' : 'border-gray-200 hover:border-gray-300')}
                      >
                        <ThemePreview type={t} />
                        <div className="flex items-center gap-2 mt-2">
                          <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0', theme === t ? 'border-[#1f5135]' : 'border-gray-300')}>
                            {theme === t && <div className="w-1.5 h-1.5 rounded-full bg-[#1f5135]" />}
                          </div>
                          <span className={cn('text-[12px] font-semibold capitalize', theme === t ? 'text-[#1f5135]' : 'text-gray-500')}>{t}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Application Settings */}
              <Card className="p-5 min-w-0">
                <div className="mb-4">
                  <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Application Settings</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Configure system behaviour and automation preferences</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
                  <div>
                    {appSettingsLeft.map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={toggles[s.id] ?? s.defaultOn} onChange={() => flip(s.id)} />
                      </SettingRow>
                    ))}
                  </div>
                  <div>
                    {appSettingsRight.map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        {s.isSelect ? (
                          <div className="relative flex-shrink-0">
                            <select value={dataRetention} onChange={(e) => setDataRetention(e.target.value)}
                              className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] transition-colors cursor-pointer">
                              {['30 Days', '60 Days', '90 Days', '180 Days', '1 Year'].map((o) => <option key={o}>{o}</option>)}
                            </select>
                            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        ) : (
                          <Toggle enabled={toggles[s.id] ?? s.defaultOn} onChange={() => flip(s.id)} />
                        )}
                      </SettingRow>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NOTIFICATIONS
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('notifications')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="Notifications" subtitle="Manage how and when you receive system alerts and updates" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
                  {/* Left: Channels */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notification Channels</p>
                    {([
                      { id: 'emailAlerts'         as const, label: 'Email Alerts',           desc: 'Send critical alerts to admin@sensegrain.com',   colorBg: 'bg-amber-50',  colorText: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
                      { id: 'smsAlerts'           as const, label: 'SMS Alerts',             desc: 'Receive text messages for critical events',        colorBg: 'bg-blue-50',   colorText: 'text-blue-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16a2 2 0 0 1 .19.92z" /></svg> },
                      { id: 'pushNotifications'   as const, label: 'Push Notifications',    desc: 'Browser push alerts when dashboard is open',       colorBg: 'bg-purple-50', colorText: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
                      { id: 'inAppNotifications'  as const, label: 'In-App Notifications',  desc: 'Show notification badges inside the application',  colorBg: 'bg-teal-50',   colorText: 'text-teal-600',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
                    ] as { id: keyof typeof notifToggles; label: string; desc: string; colorBg: string; colorText: string; icon: React.ReactNode }[]).map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={notifToggles[s.id]} onChange={() => flipN(s.id)} />
                      </SettingRow>
                    ))}
                  </div>
                  {/* Right: Alert types */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Alert Preferences</p>
                    {([
                      { id: 'criticalAlerts'  as const, label: 'Critical Alerts',    desc: 'Temperature, spoilage and offline sensor alerts',   colorBg: 'bg-red-50',    colorText: 'text-red-500',    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg> },
                      { id: 'highSeverity'    as const, label: 'High Severity',      desc: 'Important alerts requiring prompt attention',       colorBg: 'bg-orange-50', colorText: 'text-orange-500', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
                      { id: 'mediumSeverity'  as const, label: 'Medium Severity',    desc: 'Moderate alerts for monitoring and review',         colorBg: 'bg-amber-50',  colorText: 'text-amber-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
                      { id: 'infoSystem'      as const, label: 'Info & System',      desc: 'Routine system messages and status updates',        colorBg: 'bg-gray-100',  colorText: 'text-gray-500',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
                      { id: 'weeklyDigest'    as const, label: 'Weekly Digest',      desc: 'Summary email every Monday morning at 08:00',       colorBg: 'bg-green-50',  colorText: 'text-[#1f5135]',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
                    ] as { id: keyof typeof notifToggles; label: string; desc: string; colorBg: string; colorText: string; icon: React.ReactNode }[]).map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={notifToggles[s.id]} onChange={() => flipN(s.id)} />
                      </SettingRow>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                USERS & ROLES
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('users')}>
              <Card className="p-5 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <SectionTitle title="Users & Roles" subtitle="Manage team members and their access permissions" />
                  <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#1f5135] text-white text-[11px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all duration-150 shadow-sm flex-shrink-0 ml-4">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add User
                  </button>
                </div>
                <div className="rounded-xl ring-1 ring-gray-200 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['User', 'Role', 'Department', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { name: 'Admin User',     email: 'admin@sensegrain.com',    role: 'Super Admin', roleCls: 'bg-green-50 text-green-700 ring-green-200',   dept: 'Operations',   active: true  },
                        { name: 'Ali Hassan',     email: 'ali@sensegrain.com',      role: 'Operator',    roleCls: 'bg-blue-50 text-blue-700 ring-blue-200',       dept: 'Warehouse Ops',active: true  },
                        { name: 'Sara Khan',      email: 'sara@sensegrain.com',     role: 'Analyst',     roleCls: 'bg-purple-50 text-purple-700 ring-purple-200', dept: 'Analytics',    active: true  },
                        { name: 'System Monitor', email: 'monitor@sensegrain.com',  role: 'Viewer',      roleCls: 'bg-gray-100 text-gray-600 ring-gray-200',      dept: 'IT',           active: false },
                      ].map((u) => (
                        <tr key={u.email} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{u.name[0]}</div>
                              <div><p className="font-semibold text-gray-800">{u.name}</p><p className="text-gray-400 text-[9px]">{u.email}</p></div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full ring-1', u.roleCls)}>{u.role}</span></td>
                          <td className="px-3 py-2.5 text-gray-500">{u.dept}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn('flex items-center gap-1.5 text-[10px] font-semibold', u.active ? 'text-green-700' : 'text-gray-400')}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', u.active ? 'bg-green-500' : 'bg-gray-300')} />
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <button className="h-6 px-2 rounded-md text-[10px] font-semibold text-gray-500 hover:text-[#1f5135] hover:bg-green-50 transition-colors">Edit</button>
                              <button className="h-6 px-2 rounded-md text-[10px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                WAREHOUSES
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('warehouses')}>
              <Card className="p-5 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <SectionTitle title="Warehouses" subtitle="Default settings applied to all warehouse monitoring zones" />
                  <button className="flex items-center gap-1 h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-all flex-shrink-0 ml-4">
                    Manage Warehouses
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
                  <div>
                    {[
                      { label: 'Sensor Polling Interval', value: '1 min',      options: ['30 sec', '1 min', '5 min', '10 min'] },
                      { label: 'Offline Alert Delay',     value: '5 min',      options: ['Immediate', '5 min', '15 min', '30 min'] },
                      { label: 'Default Temperature Unit', value: '°C',        options: ['°C', '°F'] },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
                        <p className="text-[12px] font-semibold text-gray-700">{s.label}</p>
                        <div className="relative flex-shrink-0">
                          <select defaultValue={s.value} className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] transition-colors cursor-pointer">
                            {s.options.map((o) => <option key={o}>{o}</option>)}
                          </select>
                          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    {([
                      { id: 'autoEscalation' as const,  label: 'Auto Alert Escalation',    desc: 'Escalate unresolved alerts after 30 minutes',   colorBg: 'bg-red-50',   colorText: 'text-red-500',   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" /></svg> },
                      { id: 'archiveInactive' as const, label: 'Archive Inactive Sensors', desc: 'Auto-archive sensors offline for more than 7 days', colorBg: 'bg-gray-100', colorText: 'text-gray-500', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg> },
                    ] as { id: keyof typeof whToggles; label: string; desc: string; colorBg: string; colorText: string; icon: React.ReactNode }[]).map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={whToggles[s.id]} onChange={() => flipW(s.id)} />
                      </SettingRow>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                DATA & INTEGRATIONS
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('integrations')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="Data & Integrations" subtitle="API access, connected services and data export settings" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* API Key */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">API Access</p>
                    <div className="p-3.5 rounded-xl bg-gray-50 ring-1 ring-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-700">API Key</span>
                        <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[11px] font-mono text-gray-500 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 truncate">sg_live_••••••••••••••••••••••••3a8f</code>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#1f5135] hover:border-[#1f5135] hover:bg-green-50 transition-all">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </button>
                      </div>
                      <button className="mt-2.5 text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors">Regenerate Key</button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 ring-1 ring-gray-200">
                      <p className="text-[11px] font-bold text-gray-700 mb-2">Webhook Endpoint</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] font-mono text-gray-500 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 truncate">https://sensegrain.com/webhooks/v2/ev</code>
                        <button className="h-7 px-2.5 text-[10px] font-semibold text-gray-500 border border-gray-200 rounded-lg hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-all">Test</button>
                      </div>
                    </div>
                  </div>
                  {/* Connected services */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connected Services</p>
                    {[
                      { name: 'MQTT Broker',   desc: 'Real-time sensor data streaming',  status: 'Connected',    statusCls: 'text-green-700 bg-green-50 ring-green-200'  },
                      { name: 'REST API',      desc: 'External data access endpoint',     status: 'Active',       statusCls: 'text-green-700 bg-green-50 ring-green-200'  },
                      { name: 'CSV Export',    desc: 'Scheduled data export to CSV',      status: 'Enabled',      statusCls: 'text-blue-700 bg-blue-50 ring-blue-200'     },
                      { name: 'JSON Feed',     desc: 'Live JSON data endpoint',           status: 'Active',       statusCls: 'text-green-700 bg-green-50 ring-green-200'  },
                      { name: 'Excel Export',  desc: 'Monthly XLSX report export',        status: 'Disabled',     statusCls: 'text-gray-500 bg-gray-100 ring-gray-200'    },
                    ].map((svc) => (
                      <div key={svc.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-gray-800">{svc.name}</p>
                          <p className="text-[10px] text-gray-400">{svc.desc}</p>
                        </div>
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0', svc.statusCls)}>{svc.status}</span>
                        <OutlineBtn>Configure</OutlineBtn>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                ALERTS & THRESHOLDS
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('alerts')}>
              <Card className="p-5 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Default Thresholds</h2>
                      <button className="text-gray-300 hover:text-gray-500 transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Set default threshold values for all new warehouses and zones.</p>
                  </div>
                  <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1f5135] text-[#1f5135] text-[11px] font-semibold hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
                    Manage Thresholds
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {thresholds.map((t) => (
                    <div key={t.label} className="flex items-start gap-3 p-3.5 rounded-xl ring-1 ring-black/[0.05] bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-150">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.05]', t.colorBg)}>
                        <span className={t.colorText}>{t.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">{t.label}</p>
                        <p className="text-[15px] font-bold text-gray-900 mt-1 leading-tight tabular-nums">{t.value}</p>
                        <span className="inline-block text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full ring-1 ring-red-200 mt-1">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                REPORTS
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('reports')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="Reports" subtitle="Configure default report generation and delivery preferences" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
                  <div>
                    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50">
                      <p className="text-[12px] font-semibold text-gray-700">Default Export Format</p>
                      <div className="flex items-center gap-2">
                        {['PDF', 'CSV', 'XLSX'].map((f) => (
                          <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="format" defaultChecked={f === 'PDF'} className="accent-[#1f5135] w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold text-gray-600">{f}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50">
                      <p className="text-[12px] font-semibold text-gray-700">Report Retention</p>
                      <div className="relative">
                        <select defaultValue="90 Days" className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] transition-colors cursor-pointer">
                          {['30 Days', '60 Days', '90 Days', '180 Days', '1 Year'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    {([
                      { id: 'autoDaily'   as const, label: 'Auto-Generate Daily Summary', desc: 'Create daily reports automatically at 06:00',   colorBg: 'bg-green-50',  colorText: 'text-[#1f5135]', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
                      { id: 'includeCharts' as const, label: 'Include Charts in Reports',  desc: 'Embed visual charts in PDF and XLSX exports',  colorBg: 'bg-blue-50',   colorText: 'text-blue-600',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
                      { id: 'emailOnGen'   as const, label: 'Email on Generation',         desc: 'Send report link to admin when ready',          colorBg: 'bg-amber-50',  colorText: 'text-amber-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
                    ] as { id: keyof typeof rptToggles; label: string; desc: string; colorBg: string; colorText: string; icon: React.ReactNode }[]).map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={rptToggles[s.id]} onChange={() => flipR(s.id)} />
                      </SettingRow>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECURITY
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('security')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="Security Settings" subtitle="Manage password, authentication and session preferences" />
                <div className="divide-y divide-gray-50">
                  {securityItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 py-3.5">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.05]', item.iconBg)}>
                        <svg className={cn('w-4 h-4', item.iconColor)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={item.iconPath} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-800 leading-tight">{item.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      {item.badge && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full ring-1 ring-green-200 flex-shrink-0">{item.badge}</span>}
                      {item.action && (
                        <button className="flex items-center gap-1 h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
                          {item.action}
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                BILLING & SUBSCRIPTION
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('billing')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="Billing & Subscription" subtitle="Manage your plan, usage and payment details" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Plan card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] text-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest">Current Plan</p>
                        <p className="text-[20px] font-bold mt-0.5">Enterprise</p>
                      </div>
                      <span className="text-[10px] font-bold text-green-300 bg-white/10 px-2 py-1 rounded-full ring-1 ring-white/20">Annual</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-white/60">Next Invoice</span><span className="font-semibold">Jun 1, 2026</span></div>
                      <div className="flex justify-between"><span className="text-white/60">Billing Email</span><span className="font-semibold">admin@sensegrain.com</span></div>
                      <div className="flex justify-between"><span className="text-white/60">Plan Cost</span><span className="font-bold text-[14px]">$499 / mo</span></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-[11px] font-semibold transition-colors">Manage Billing</button>
                      <button className="flex-1 h-8 rounded-xl bg-white text-[#1f5135] hover:bg-green-50 text-[11px] font-bold transition-colors">View Invoices</button>
                    </div>
                  </div>
                  {/* Usage meters */}
                  <div className="space-y-3.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usage This Period</p>
                    {[
                      { label: 'Active Sensors',  used: 127, total: 200, color: 'bg-[#1f5135]' },
                      { label: 'Warehouses',       used: 8,   total: 15,  color: 'bg-blue-500'  },
                      { label: 'Storage (GB)',     used: 45,  total: 100, color: 'bg-purple-500' },
                      { label: 'API Calls (K)',    used: 83,  total: 500, color: 'bg-amber-500'  },
                    ].map((m) => {
                      const pct = Math.round((m.used / m.total) * 100);
                      return (
                        <div key={m.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-700">{m.label}</span>
                            <span className="text-[11px] font-bold text-gray-900 tabular-nums">{m.used} / {m.total}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-300', m.color)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SYSTEM
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('system')}>
              <Card className="p-5 min-w-0">
                <SectionTitle title="System" subtitle="Platform configuration, diagnostics and maintenance settings" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                  {/* System info */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">System Information</p>
                    <div className="rounded-xl bg-gray-50 ring-1 ring-gray-200 divide-y divide-gray-100">
                      {[
                        { label: 'Platform Version', val: 'v2.1.0'          },
                        { label: 'Database',          val: 'PostgreSQL 15.6' },
                        { label: 'System Uptime',     val: '99.8% (30d avg)' },
                        { label: 'Last Backup',       val: 'Today, 12:00 AM' },
                        { label: 'Environment',       val: 'Production'       },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-[11px] text-gray-500 font-semibold">{r.label}</span>
                          <span className="text-[11px] font-bold text-gray-800 tabular-nums">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* System settings */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Configuration</p>
                    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50">
                      <p className="text-[12px] font-semibold text-gray-700">Log Level</p>
                      <div className="relative">
                        <select defaultValue="Info" className="appearance-none h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#1f5135] transition-colors cursor-pointer">
                          {['Debug', 'Info', 'Warning', 'Error'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                    {([
                      { id: 'apiRateLimit' as const, label: 'API Rate Limiting', desc: 'Limit API requests to 1000 calls per minute', colorBg: 'bg-purple-50', colorText: 'text-purple-600', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
                    ] as { id: keyof typeof sysToggles; label: string; desc: string; colorBg: string; colorText: string; icon: React.ReactNode }[]).map((s) => (
                      <SettingRow key={s.id} colorBg={s.colorBg} colorText={s.colorText} icon={s.icon} label={s.label} desc={s.desc}>
                        <Toggle enabled={sysToggles[s.id]} onChange={() => flipS(s.id)} />
                      </SettingRow>
                    ))}
                    <div className="flex items-center gap-2 pt-3">
                      <button className="flex-1 h-8 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-all duration-150">Clear Cache</button>
                      <button className="flex-1 h-8 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all duration-150">System Diagnostics</button>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                AUDIT LOGS
            ═══════════════════════════════════════════════════════════════ */}
            <section ref={setSectionRef('audit')}>
              <Card className="p-5 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <SectionTitle title="Audit Logs" subtitle="Track user activity and system events across the platform" />
                  <button className="flex items-center gap-1 h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-all flex-shrink-0 ml-4">
                    View All Logs
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
                <div className="rounded-xl ring-1 ring-gray-200 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['User', 'Action', 'IP Address', 'Timestamp', 'Status'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { user: 'Admin User', action: 'Changed threshold — Temperature > 32°C', ip: '192.168.1.100', time: 'Today, 09:14 AM',   status: 'success' },
                        { user: 'Admin User', action: 'Generated compliance report Q2 2026',    ip: '192.168.1.100', time: 'Today, 08:32 AM',   status: 'success' },
                        { user: 'Ali Hassan', action: 'Logged in to dashboard',                 ip: '192.168.1.105', time: 'Today, 07:55 AM',   status: 'success' },
                        { user: 'System',     action: 'Auto-backup completed successfully',      ip: 'Internal',      time: 'Yesterday, 12:00 AM',status: 'success' },
                        { user: 'Sara Khan',  action: 'Updated profile — email changed',        ip: '192.168.1.108', time: 'Yesterday, 04:20 PM',status: 'success' },
                        { user: 'Unknown',    action: 'Failed login attempt (wrong password)',   ip: '203.0.113.42',  time: 'Yesterday, 11:08 AM',status: 'warning' },
                      ].map((log, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0', log.user === 'Unknown' ? 'bg-red-400' : log.user === 'System' ? 'bg-gray-400' : 'bg-gradient-to-br from-[#1f5135] to-[#2d7a4f]')}>
                                {log.user[0]}
                              </div>
                              <span className="font-semibold text-gray-800">{log.user}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate">{log.action}</td>
                          <td className="px-3 py-2.5 font-mono text-gray-400 text-[10px]">{log.ip}</td>
                          <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{log.time}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full ring-1', log.status === 'success' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}>
                              {log.status === 'success' ? 'Success' : 'Warning'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 pb-1">
              <p className="text-[10px] text-gray-400 font-medium">© 2026 GrainGuard. All rights reserved.</p>
              <p className="text-[10px] text-gray-300 font-semibold tabular-nums">Version 2.1.0</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
