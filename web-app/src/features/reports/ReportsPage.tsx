'use client';

import { useState } from 'react';
import { ReportTrendsChart } from '@/components/charts/ReportTrendsChart';
import { ReportTypesChart } from '@/components/charts/ReportTypesChart';
import {
  reportTrendSeries,
  scheduledReports,
  type ReportType,
} from './mockData';
import { useReportsData } from '@/lib/dataEngine';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const statColorMap = {
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'ring-green-100'  },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100'   },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-100'  },
};

const typeConfig: Record<ReportType, { label: string; badge: string; dot: string }> = {
  'environmental': { label: 'Environmental',  badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   dot: 'bg-[#1f5135]' },
  'compliance':    { label: 'Compliance',     badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',      dot: 'bg-blue-500'  },
  'performance':   { label: 'Performance',    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-500' },
  'alert-summary': { label: 'Alert Summary',  badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         dot: 'bg-red-500'   },
  'custom':        { label: 'Custom',         badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500'},
};

const scheduleTypeIcon: Record<ReportType, React.ReactNode> = {
  'environmental': (
    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  'compliance': (
    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 12 18 15 13" />
    </svg>
  ),
  'performance': (
    <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  'alert-summary': (
    <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'custom': (
    <svg className="w-3.5 h-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const statIcons: Record<string, React.ReactNode> = {
  'Total Reports': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  'Downloaded': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  'Shared': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  'Scheduled Reports': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer',
        enabled ? 'bg-[#1f5135]' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { stats: reportStats, recentReports, reportTypeData, reportTrendData } = useReportsData();
  const [scheduleEnabled, setScheduleEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(scheduledReports.map((s) => [s.id, s.enabled]))
  );

  const toggleSchedule = (id: string) =>
    setScheduleEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-20 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-gray-900 leading-tight tracking-tight">Reports</h1>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
            View, download and share your monitoring reports
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Date range */}
          <button className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 active:scale-[0.97] transition-all duration-150 select-none">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="hidden md:block">May 1 – May 21, 2026</span>
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {/* Filter */}
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 active:scale-[0.97] transition-all duration-150 select-none">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          {/* Notification bell */}
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 active:scale-95 transition-all duration-150">
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">3</span>
          </button>
          <div className="w-px h-5 bg-gray-200 hidden md:block" />
          {/* User */}
          <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all duration-150 group">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white shadow-sm flex-shrink-0">A</div>
            <span className="hidden md:block text-[12px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Admin</span>
            <svg className="hidden md:block w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {/* Generate Report */}
          <button className="hidden lg:flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all duration-150 shadow-sm shadow-green-900/20 select-none">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Generate Report
            <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {reportStats.map((stat) => {
            const col = statColorMap[stat.colorKey];
            return (
              <Card
                key={stat.label}
                className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1', col.bg, col.ring)}>
                    <span className={col.text}>{statIcons[stat.label]}</span>
                  </div>
                  <span className={cn(
                    'inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                    stat.deltaPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
                  )}>
                    {stat.deltaPositive ? '↑ ' : '↓ '}{stat.delta}
                  </span>
                </div>
                <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">{stat.value}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1.5 leading-none">{stat.label}</p>
              </Card>
            );
          })}
        </section>

        {/* ── Report Trends + Report Types ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,316px)] gap-5">

          {/* Report Trends */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Report Activity"
              subtitle="Weekly generated, downloaded & shared report counts"
              action={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 font-semibold">8 weeks</span>
                </div>
              }
            />
            <ReportTrendsChart />
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
              {reportTrendSeries.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                  <span className="w-5 h-[2px] rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Card>

          {/* Report Types */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Report Types"
              subtitle="Distribution across all categories"
            />
            <ReportTypesChart />
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {reportTypeData.map((item) => {
                const total = reportTypeData.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 text-[11px] text-gray-600 font-medium">{item.label}</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.85 }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 tabular-nums w-8 text-right flex-shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

        </section>

        {/* ── Recent Reports Table + Scheduled Panel ────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,288px)] gap-5 items-start">

          {/* Recent Reports Table */}
          <Card className="p-5 min-w-0 overflow-hidden">
            <SectionHeader
              title="Recent Reports"
              subtitle="All generated reports — latest first"
              action={
                <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150 flex-shrink-0">
                  View All
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              }
            />
            <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Report Name', 'Type', 'Warehouse', 'Date Generated', 'Generated By', 'Size', 'Actions'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentReports.map((row) => {
                    const tc = typeConfig[row.type];
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer group">

                        {/* Report Name */}
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <p className="font-semibold text-gray-800 truncate">{row.title}</p>
                          <p className="text-gray-400 text-[9px] font-mono mt-0.5">{row.id}</p>
                        </td>

                        {/* Type badge */}
                        <td className="px-3 py-2.5">
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', tc.badge)}>
                            {tc.label}
                          </span>
                        </td>

                        {/* Warehouse */}
                        <td className="px-3 py-2.5 text-gray-600 font-medium">{row.warehouse}</td>

                        {/* Date */}
                        <td className="px-3 py-2.5 text-gray-500">{row.dateGenerated}</td>

                        {/* Generated By */}
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            'text-[10px] font-medium',
                            row.generatedBy === 'Auto-Scheduler' ? 'text-purple-600' : 'text-gray-600',
                          )}>
                            {row.generatedBy}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="px-3 py-2.5">
                          {row.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Processing
                            </span>
                          ) : (
                            <span className="text-gray-500 tabular-nums">{row.size}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {/* Download */}
                            <button
                              className={cn(
                                'w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150',
                                row.status === 'processing'
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-[#1f5135] hover:bg-green-50',
                              )}
                              disabled={row.status === 'processing'}
                              title="Download"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                            {/* Share */}
                            <button
                              className={cn(
                                'w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150',
                                row.status === 'processing'
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
                              )}
                              disabled={row.status === 'processing'}
                              title="Share"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                            </button>
                            {/* More */}
                            <button className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150" title="More options">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Scheduled Reports */}
          <div className="flex flex-col gap-4 min-w-0">
            <Card className="p-5">
              <SectionHeader
                title="Scheduled Reports"
                subtitle="Automated report generation"
              />
              <div className="space-y-0">
                {scheduledReports.map((sched, idx) => {
                  const enabled = scheduleEnabled[sched.id] ?? sched.enabled;
                  return (
                    <div
                      key={sched.id}
                      className={cn(
                        'flex items-start gap-3 py-3 transition-colors duration-100',
                        idx < scheduledReports.length - 1 && 'border-b border-gray-50',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-black/[0.05]',
                        sched.type === 'environmental'  && 'bg-green-50',
                        sched.type === 'compliance'     && 'bg-blue-50',
                        sched.type === 'performance'    && 'bg-amber-50',
                        sched.type === 'alert-summary'  && 'bg-red-50',
                        sched.type === 'custom'         && 'bg-purple-50',
                      )}>
                        {scheduleTypeIcon[sched.type]}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[11px] font-bold leading-tight',
                          enabled ? 'text-gray-800' : 'text-gray-400',
                        )}>
                          {sched.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sched.schedule}</p>
                        {enabled && (
                          <p className="text-[9px] text-green-700 font-semibold mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Next: {sched.nextRun}
                          </p>
                        )}
                      </div>

                      {/* Toggle */}
                      <Toggle enabled={enabled} onChange={() => toggleSchedule(sched.id)} />
                    </div>
                  );
                })}
              </div>

              {/* Create Schedule button */}
              <button className="mt-4 w-full flex items-center justify-center gap-2 h-8 rounded-xl border border-dashed border-gray-300 text-[11px] font-semibold text-gray-500 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50/50 transition-all duration-150">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Schedule
              </button>
            </Card>

            {/* Quick Actions card */}
            <Card className="p-5">
              <h2 className="text-[13px] font-bold text-gray-900 mb-3 tracking-tight">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Export All as ZIP',      icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', color: 'text-[#1f5135] bg-green-50 hover:bg-green-100'  },
                  { label: 'Share Report Bundle',    icon: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100'      },
                  { label: 'Schedule New Report',    icon: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
                ].map((action) => (
                  <button
                    key={action.label}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-150 text-left',
                      action.color,
                    )}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={action.icon} />
                    </svg>
                    {action.label}
                  </button>
                ))}
              </div>
            </Card>

          </div>

        </section>

      </main>
    </div>
  );
}
