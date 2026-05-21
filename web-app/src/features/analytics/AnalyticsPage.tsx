'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EnvironmentalTrendsChart } from '@/components/charts/EnvironmentalTrendsChart';
import { WarehousePerformanceChart } from '@/components/charts/WarehousePerformanceChart';
import { SpoilagePredictionChart } from '@/components/charts/SpoilagePredictionChart';
import {
  analyticsKPIs,
  analyticsTableData,
  aiInsights,
  sensorHealthData,
  envTrendSeries,
  recentAnalyticsEvents,
  topWarehouse,
  worstWarehouse,
  overallStability,
  sensorSummary,
  type TrendDir,
  type RiskLevel,
  type InsightType,
  type EventType,
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const kpiColorMap = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-100'  },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'ring-green-100'  },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-500',    ring: 'ring-red-100'    },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   ring: 'ring-teal-100'   },
};

const riskConfig: Record<RiskLevel, { badge: string; label: string }> = {
  low:      { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',  label: 'Low'      },
  medium:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  label: 'Medium'   },
  high:     { badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',        label: 'High'     },
  inactive: { badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',    label: 'Inactive' },
};

const insightAccentColor: Record<InsightType, string> = {
  warning:      '#f59e0b',
  optimization: '#3b82f6',
  prediction:   '#8b5cf6',
  success:      '#22c55e',
  anomaly:      '#ef4444',
};

const insightMeta: Record<InsightType, { bg: string; icon: React.ReactNode; accent: string; textColor: string }> = {
  warning: {
    bg: 'bg-amber-50',
    accent: 'border-l-amber-400',
    textColor: 'text-amber-700',
    icon: <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  },
  optimization: {
    bg: 'bg-blue-50',
    accent: 'border-l-blue-400',
    textColor: 'text-blue-700',
    icon: <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },
  prediction: {
    bg: 'bg-purple-50',
    accent: 'border-l-purple-400',
    textColor: 'text-purple-700',
    icon: <svg className="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  },
  success: {
    bg: 'bg-green-50',
    accent: 'border-l-green-400',
    textColor: 'text-green-700',
    icon: <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  },
  anomaly: {
    bg: 'bg-red-50',
    accent: 'border-l-red-400',
    textColor: 'text-red-700',
    icon: <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  },
};

const eventMeta: Record<EventType, { dot: string; icon: React.ReactNode }> = {
  ai:      { dot: 'bg-purple-100', icon: <svg className="w-3 h-3 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
  insight: { dot: 'bg-blue-100',   icon: <svg className="w-3 h-3 text-blue-500"   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  sync:    { dot: 'bg-teal-100',   icon: <svg className="w-3 h-3 text-teal-500"   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg> },
  alert:   { dot: 'bg-red-100',    icon: <svg className="w-3 h-3 text-red-500"    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg> },
  success: { dot: 'bg-green-100',  icon: <svg className="w-3 h-3 text-green-600"  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

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

// ─── KPI Icons ────────────────────────────────────────────────────────────────

const kpiIcons: Record<string, React.ReactNode> = {
  'Temp Stability': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>
  ),
  'Humidity Stability': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
  ),
  'Storage Efficiency': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
  ),
  'AI Accuracy': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
  ),
  'Spoilage Risk': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
  'Sensor Health': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  ),
};

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ trend, inverted, delta }: { trend: TrendDir; inverted?: boolean; delta: string }) {
  const isGood    = inverted ? trend === 'down' : (trend === 'up' || trend === 'slight-up');
  const isNeutral = trend === 'stable';
  return (
    <span className={cn(
      'inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
      isNeutral ? 'bg-gray-100 text-gray-500' : isGood ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
    )}>
      {trend === 'up'        && '↑ '}
      {trend === 'down'      && '↓ '}
      {trend === 'stable'    && '→ '}
      {trend === 'slight-up' && '↗ '}
      {delta}
    </span>
  );
}

// ─── Row trend icon ───────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: TrendDir | null }) {
  if (!trend) return <span className="text-gray-300 text-sm font-bold">—</span>;
  if (trend === 'stable') return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
  if (trend === 'slight-up') return (
    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="18" x2="19" y2="8" /><polyline points="12 5 19 8 19 15" /></svg>
  );
  return (
    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="18" x2="19" y2="6" /><polyline points="12 4 19 6 19 13" /></svg>
  );
}

// ─── Sensor health bars ───────────────────────────────────────────────────────

function SensorHealthBars() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {sensorHealthData.map((item) => {
        const pct = item.uptime;
        const barColor =
          pct === 100 ? 'bg-green-500' :
          pct >= 97   ? 'bg-[#1f5135]' :
          pct >= 90   ? 'bg-amber-400' :
          pct > 0     ? 'bg-red-400'   : 'bg-gray-200';
        const valColor =
          pct === 100 ? 'text-green-600' :
          pct >= 95   ? 'text-[#1f5135]' :
          pct > 0     ? 'text-amber-600' : 'text-gray-400';
        return (
          <div key={item.warehouse}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-700">{item.warehouse}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium">{item.online}/{item.total} sensors</span>
                <span className={cn('text-[11px] font-bold tabular-nums', valColor)}>
                  {pct === 0 ? 'Offline' : `${pct.toFixed(1)}%`}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-300', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader
        title="Analytics"
        subtitle="AI-powered operational analytics across all warehouses"
      />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {analyticsKPIs.map((kpi) => {
            const col = kpiColorMap[kpi.colorKey];
            return (
              <Card
                key={kpi.label}
                className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1',
                    col.bg, col.ring,
                  )}>
                    <span className={col.text}>{kpiIcons[kpi.label]}</span>
                  </div>
                  <TrendBadge trend={kpi.trend} inverted={kpi.invertedTrend} delta={kpi.delta} />
                </div>
                <p className="text-[24px] font-bold text-gray-900 leading-none tabular-nums">
                  {kpi.value}
                  <span className="text-[13px] font-semibold text-gray-400 ml-0.5">{kpi.unit}</span>
                </p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1.5 leading-none">{kpi.label}</p>
              </Card>
            );
          })}
        </section>

        {/* ── Environmental Trends + AI Insights ───────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,312px)] gap-5">

          {/* Environmental Trends */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Environmental Trends"
              subtitle="14-day stability index across all warehouses (0–100)"
            />
            <EnvironmentalTrendsChart />
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
              {envTrendSeries.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                  <span className="w-5 h-[2px] rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Card>

          {/* AI Insights */}
          <Card className="p-5 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">AI Insights</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Predictive · Operational</p>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full ring-1 ring-purple-100 flex-shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
                </span>
                AI Active
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {aiInsights.map((insight) => {
                const meta  = insightMeta[insight.type];
                const color = insightAccentColor[insight.type];
                return (
                  <div
                    key={insight.id}
                    className={cn(
                      'rounded-xl p-3 border-l-[3px] transition-all duration-150 hover:shadow-sm hover:-translate-y-px cursor-default',
                      meta.bg, meta.accent,
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center">
                        {meta.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">{insight.title}</p>
                          <span className="text-[9px] font-semibold text-gray-400 flex-shrink-0 tabular-nums">{insight.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-snug">{insight.detail}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-white/70 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${insight.confidence}%`, backgroundColor: color, opacity: 0.7 }}
                            />
                          </div>
                          <span className={cn('text-[9px] font-bold tabular-nums', meta.textColor)}>
                            {insight.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* ── WH Performance + Spoilage Prediction ─────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Warehouse Performance */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Warehouse Performance"
              subtitle="Efficiency · Stability · Utilization (%)"
              action={
                <div className="flex items-center gap-3 flex-shrink-0">
                  {[{ l: 'Efficiency', c: '#1f5135' }, { l: 'Stability', c: '#3b82f6' }, { l: 'Utilization', c: '#f59e0b' }].map((s) => (
                    <span key={s.l} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                      <span className="w-3 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.c, opacity: 0.85 }} />
                      {s.l}
                    </span>
                  ))}
                </div>
              }
            />
            <WarehousePerformanceChart />
          </Card>

          {/* Spoilage Prediction */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Spoilage Prediction"
              subtitle="7-day AI forecast · Spoilage probability by risk category (%)"
              action={
                <div className="flex items-center gap-3 flex-shrink-0">
                  {[{ l: 'Low', c: '#22c55e' }, { l: 'Medium', c: '#f59e0b' }, { l: 'High', c: '#ef4444' }].map((s) => (
                    <span key={s.l} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                      <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: s.c }} />
                      {s.l}
                    </span>
                  ))}
                </div>
              }
            />
            <SpoilagePredictionChart />
            <div className="flex items-center gap-5 mt-2.5 pt-2.5 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-px border-t-2 border-amber-400 border-dashed" />
                <span className="text-[9px] text-gray-400 font-semibold">10% threshold</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-px border-t-2 border-red-400 border-dashed" />
                <span className="text-[9px] text-gray-400 font-semibold">20% critical</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Analytics Table + Right Sidebar ──────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)] gap-5 items-start">

          {/* Left column: table + sensor performance */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Analytics Table */}
            <Card className="p-5 min-w-0 overflow-hidden">
              <SectionHeader
                title="Warehouse Analytics Summary"
                subtitle="AI-computed performance metrics per warehouse"
              />
              <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
                <table className="w-full text-[11px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Warehouse', 'Avg Temp', 'Humidity Score', 'Spoilage Prob.', 'Storage Eff.', 'AI Risk', 'Sensor Health', 'Trend'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analyticsTableData.map((row) => {
                      const rc         = riskConfig[row.aiRisk];
                      const isInactive = row.aiRisk === 'inactive';
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        >
                          {/* Warehouse */}
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-gray-800">{row.name}</p>
                            <p className="text-gray-400 text-[9px] font-mono mt-0.5">{row.id}</p>
                          </td>
                          {/* Avg Temp */}
                          <td className={cn(
                            'px-3 py-2.5 font-bold tabular-nums',
                            row.avgTemp == null ? 'text-gray-300' :
                            row.avgTemp >= 32   ? 'text-red-600'    :
                            row.avgTemp >= 30   ? 'text-orange-600' :
                            row.avgTemp >= 28   ? 'text-amber-600'  : 'text-gray-700',
                          )}>
                            {row.avgTemp != null ? `${row.avgTemp.toFixed(1)} °C` : '—'}
                          </td>
                          {/* Humidity Score */}
                          <td className="px-3 py-2.5">
                            {row.humidityScore != null ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-gray-700 tabular-nums">{row.humidityScore}</span>
                                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      row.humidityScore >= 85 ? 'bg-green-500' :
                                      row.humidityScore >= 70 ? 'bg-[#1f5135]' :
                                      row.humidityScore >= 55 ? 'bg-amber-400' : 'bg-red-400',
                                    )}
                                    style={{ width: `${row.humidityScore}%` }}
                                  />
                                </div>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          {/* Spoilage Prob */}
                          <td className={cn(
                            'px-3 py-2.5 font-bold tabular-nums',
                            row.spoilageProb == null ? 'text-gray-300' :
                            row.spoilageProb >= 15   ? 'text-red-600'   :
                            row.spoilageProb >= 8    ? 'text-amber-600' : 'text-green-700',
                          )}>
                            {row.spoilageProb != null ? `${row.spoilageProb.toFixed(1)}%` : '—'}
                          </td>
                          {/* Storage Efficiency */}
                          <td className="px-3 py-2.5">
                            {row.storageEfficiency != null ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-gray-700 tabular-nums">{row.storageEfficiency}%</span>
                                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-[#1f5135]" style={{ width: `${row.storageEfficiency}%` }} />
                                </div>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          {/* AI Risk */}
                          <td className="px-3 py-2.5">
                            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', rc.badge)}>
                              {rc.label}
                            </span>
                          </td>
                          {/* Sensor Health */}
                          <td className={cn(
                            'px-3 py-2.5 font-bold tabular-nums',
                            row.sensorHealth === 100 ? 'text-green-600'   :
                            row.sensorHealth >= 95   ? 'text-[#1f5135]'  :
                            row.sensorHealth > 0     ? 'text-amber-600'  : 'text-gray-400',
                          )}>
                            {isInactive ? '—' : `${row.sensorHealth}%`}
                          </td>
                          {/* Trend */}
                          <td className="px-3 py-2.5">
                            <TrendIcon trend={row.trend} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Sensor Performance */}
            <Card className="p-5">
              <SectionHeader
                title="Sensor Performance Analytics"
                subtitle="Uptime percentage per warehouse — 7-day average"
                action={
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 flex-shrink-0">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />100%</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1f5135]" />≥97%</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />≥90%</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />Inactive</span>
                  </div>
                }
              />
              <SensorHealthBars />
            </Card>

          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* Top / Worst Warehouse */}
            <Card className="p-5">
              <h2 className="text-[13px] font-bold text-gray-900 mb-3 tracking-tight">Warehouse Highlights</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 ring-1 ring-green-100 hover:shadow-sm transition-shadow duration-150">
                  <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Top Performing</p>
                    <p className="text-[13px] font-bold text-gray-800 mt-0.5">{topWarehouse.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{topWarehouse.detail}</p>
                    <p className="text-[11px] font-bold text-green-700 mt-1">{topWarehouse.score}% efficiency</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 ring-1 ring-red-100 hover:shadow-sm transition-shadow duration-150">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Highest Risk</p>
                    <p className="text-[13px] font-bold text-gray-800 mt-0.5">{worstWarehouse.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{worstWarehouse.detail}</p>
                    <p className="text-[11px] font-bold text-red-600 mt-1">{worstWarehouse.score}% spoilage risk</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Health */}
            <Card className="p-5">
              <h2 className="text-[13px] font-bold text-gray-900 mb-3 tracking-tight">System Health</h2>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-500">Overall Stability</span>
                  <span className="text-[13px] font-bold text-gray-900 tabular-nums">{overallStability}/100</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#1f5135] transition-all duration-300" style={{ width: `${overallStability}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Across all 7 active warehouses</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total',   val: sensorSummary.total,   color: 'text-gray-900',  bg: 'bg-gray-50'  },
                  { label: 'Online',  val: sensorSummary.online,  color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Warning', val: sensorSummary.warning, color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Offline', val: sensorSummary.offline, color: 'text-red-600',   bg: 'bg-red-50'  },
                ].map((item) => (
                  <div key={item.label} className={cn('rounded-xl p-2.5 text-center ring-1 ring-black/[0.04]', item.bg)}>
                    <p className={cn('text-[20px] font-bold tabular-nums', item.color)}>{item.val}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Events */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-gray-900 tracking-tight">Recent Events</h2>
                <span className="text-[10px] text-gray-400 font-semibold">Today</span>
              </div>
              <div className="space-y-0">
                {recentAnalyticsEvents.map((ev) => {
                  const meta = eventMeta[ev.type];
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 -mx-2 px-2 rounded-lg transition-colors duration-100"
                    >
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', meta.dot)}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-600 leading-snug font-medium">{ev.message}</p>
                      </div>
                      <span className="text-[9px] text-gray-400 font-semibold flex-shrink-0 tabular-nums pt-0.5">{ev.time}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>

      </main>
    </div>
  );
}
