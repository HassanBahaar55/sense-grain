'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SpoilageRiskChart } from '@/components/charts/SpoilageRiskChart';
import { RiskDonutChart } from '@/components/charts/RiskDonutChart';
import { SparklineChart } from '@/components/charts/SparklineChart';
import {
  warehouseUnits,
  keyParameters,
  activeAlerts,
  spoilageRiskForecast,
  riskDistribution,
  recommendations,
  type WarehouseStatus,
  type ParameterStatus,
  type AlertSeverity,
  type RecommendationPriority,
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const statusConfig: Record<WarehouseStatus, { stripe: string; badge: string; text: string; bg: string }> = {
  good:     { stripe: 'bg-green-400', badge: 'bg-green-50 text-green-700', text: 'Good',     bg: 'bg-white' },
  medium:   { stripe: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700', text: 'Medium',   bg: 'bg-white' },
  high:     { stripe: 'bg-red-400',   badge: 'bg-red-50 text-red-600',     text: 'High',     bg: 'bg-white' },
  inactive: { stripe: 'bg-gray-200',  badge: 'bg-gray-100 text-gray-400',  text: 'Offline',  bg: 'bg-gray-50/60' },
};

const paramStatusConfig: Record<ParameterStatus, string> = {
  good:     'bg-green-50 text-green-700 ring-green-100',
  warning:  'bg-amber-50 text-amber-700 ring-amber-100',
  critical: 'bg-red-50 text-red-600 ring-red-100',
};

const alertConfig: Record<AlertSeverity, { stripe: string; bg: string; badge: string; dot: string; label: string }> = {
  high:   { stripe: 'bg-red-400',   bg: 'bg-red-50/60 ring-red-100',    badge: 'bg-red-100 text-red-600',    dot: 'bg-red-400',   label: 'High' },
  medium: { stripe: 'bg-amber-400', bg: 'bg-amber-50/60 ring-amber-100', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', label: 'Medium' },
};

const recConfig: Record<RecommendationPriority, { bar: string; badge: string; label: string }> = {
  critical: { bar: 'bg-red-400',   badge: 'bg-red-100 text-red-600',     label: 'Critical' },
  high:     { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700',  label: 'High' },
  medium:   { bar: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-600',     label: 'Medium' },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-black/[0.05] dark:ring-white/[0.08] shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

function ViewAllButton({ label = 'View all' }: { label?: string }) {
  return (
    <button className="text-xs font-semibold text-[#1f5135] hover:text-[#174028] transition-colors duration-150 flex-shrink-0">
      {label}
    </button>
  );
}

// ─── Overview metric cards ────────────────────────────────────────────────────

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BellAlertIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <circle cx="12" cy="3" r="1" fill="currentColor" strokeWidth="0" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function TrendingUpIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  className?: string;
}

function MetricCard({ label, value, subtitle, trend, trendUp, icon, iconBg, iconColor, valueColor, className }: MetricCardProps) {
  return (
    <Card className={cn('p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-default', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {trend && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0',
            trendUp ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50',
          )}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <p className={cn('text-[26px] font-bold tracking-tight leading-none mb-1', valueColor ?? 'text-gray-900 dark:text-gray-100')}>
        {value}
      </p>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[12px] text-gray-500">{subtitle}</p>
    </Card>
  );
}

// ─── Warehouse tile ───────────────────────────────────────────────────────────

function WarehouseTile({ wh }: { wh: typeof warehouseUnits[number] }) {
  const cfg = statusConfig[wh.status];
  return (
    <div className={cn(
      'rounded-xl ring-1 ring-black/[0.06] overflow-hidden',
      'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group',
      cfg.bg,
    )}>
      {/* Status stripe */}
      <div className={cn('h-[3px]', cfg.stripe)} />
      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100">{wh.id}</span>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full leading-none', cfg.badge)}>
            {cfg.text}
          </span>
        </div>
        {wh.temp !== null ? (
          <div className="space-y-1.5">
            {[
              { label: 'Temp', val: `${wh.temp}°C` },
              { label: 'Humidity', val: `${wh.humidity}%` },
              { label: 'Moisture', val: `${wh.moisture}%` },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400">{label}</span>
                <span className="text-[11px] font-semibold text-gray-700">{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto mb-1 opacity-20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <span className="text-[10px] text-gray-300 font-medium">No Signal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Dashboard"
        subtitle="Grain storage monitoring — real-time overview"
      />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── Overview Metrics ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard
            label="Overall Health"
            value="Good"
            subtitle="7 of 8 units healthy"
            trend="2.1%"
            trendUp
            icon={<ActivityIcon />}
            iconBg="bg-green-50 group-hover:bg-green-100"
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <MetricCard
            label="Total Warehouses"
            value="8"
            subtitle="7 Active · 1 Inactive"
            icon={<BuildingIcon />}
            iconBg="bg-blue-50 group-hover:bg-blue-100"
            iconColor="text-blue-600"
          />
          <MetricCard
            label="Active Alerts"
            value="3"
            subtitle="1 High · 2 Medium"
            trend="1 new"
            trendUp={false}
            icon={<BellAlertIcon />}
            iconBg="bg-red-50 group-hover:bg-red-100"
            iconColor="text-red-500"
            valueColor="text-red-500"
          />
          <MetricCard
            label="Avg Spoilage Risk"
            value="Medium"
            subtitle="Closely monitored"
            trend="Trending"
            trendUp={false}
            icon={<WarningIcon />}
            iconBg="bg-amber-50 group-hover:bg-amber-100"
            iconColor="text-amber-600"
            valueColor="text-amber-600"
          />
          <MetricCard
            label="Data Points 24h"
            value="48.5K"
            subtitle="vs 43.1K yesterday"
            trend="12.5%"
            trendUp
            icon={<TrendingUpIcon />}
            iconBg="bg-purple-50 group-hover:bg-purple-100"
            iconColor="text-purple-600"
            className="col-span-2 xl:col-span-1"
          />
        </section>

        {/* ── Live Overview + Key Parameters ───────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Live Overview */}
          <Card className="xl:col-span-2 p-5">
            <SectionHeader
              title="Live Overview"
              subtitle="Real-time status across all warehouse units"
              action={
                <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-400">
                  {[
                    { label: 'Good',     cls: 'bg-green-400' },
                    { label: 'Medium',   cls: 'bg-amber-400' },
                    { label: 'High',     cls: 'bg-red-400' },
                    { label: 'Offline',  cls: 'bg-gray-300' },
                  ].map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', s.cls)} />
                      {s.label}
                    </span>
                  ))}
                </div>
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {warehouseUnits.map((wh) => <WarehouseTile key={wh.id} wh={wh} />)}
            </div>
          </Card>

          {/* Key Parameters */}
          <Card className="p-5">
            <SectionHeader
              title="Key Parameters"
              subtitle="Current averages — all units"
            />
            <div className="space-y-3.5">
              {keyParameters.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-gray-500 truncate">{p.label}</span>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ml-2 flex-shrink-0',
                        paramStatusConfig[p.status],
                      )}>
                        {p.statusLabel}
                      </span>
                    </div>
                    <span className="text-[17px] font-bold text-gray-900 leading-none">
                      {p.value}
                      <span className="text-[12px] font-semibold text-gray-400 ml-0.5">{p.unit}</span>
                    </span>
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <SparklineChart values={p.sparkline} color={p.color} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Alerts + Forecast + Risk Distribution ────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Alerts Overview */}
          <Card className="p-5">
            <SectionHeader
              title="Alerts Overview"
              subtitle={`${activeAlerts.length} active alerts requiring attention`}
              action={<ViewAllButton />}
            />
            <div className="space-y-3">
              {activeAlerts.map((alert) => {
                const cfg = alertConfig[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={cn('flex gap-0 rounded-xl ring-1 overflow-hidden transition-shadow duration-150 hover:shadow-sm', cfg.bg)}
                  >
                    <div className={cn('w-1 flex-shrink-0', cfg.stripe)} />
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', cfg.badge)}>
                            {cfg.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">{alert.time}</span>
                      </div>
                      <p className="text-[12px] font-bold text-gray-800 leading-tight mb-0.5">{alert.title}</p>
                      <p className="text-[11px] text-gray-500">{alert.location}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-gray-400">
                          Threshold: <span className="font-semibold text-gray-600">{alert.threshold}</span>
                        </span>
                        <span className={cn('text-[12px] font-bold', alert.severity === 'high' ? 'text-red-600' : 'text-amber-700')}>
                          {alert.value}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="mt-3 w-full text-center text-[11px] font-semibold text-gray-400 hover:text-[#1f5135] transition-colors duration-150 py-1.5 rounded-lg hover:bg-gray-50">
              View all alerts →
            </button>
          </Card>

          {/* Spoilage Risk Forecast */}
          <Card className="p-5">
            <SectionHeader
              title="Spoilage Risk Forecast"
              subtitle="Predicted risk % · May 20–26"
            />
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] font-semibold text-red-300 flex-shrink-0">75%</span>
              <div className="flex-1 h-px bg-red-200/50" />
            </div>
            <SpoilageRiskChart />
            <div className="flex items-center gap-1 mt-0.5 mb-3">
              <span className="text-[9px] font-semibold text-amber-300 flex-shrink-0">50%</span>
              <div className="flex-1 h-px bg-amber-200/40" />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
              {spoilageRiskForecast.series.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                  <span className="w-5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Card>

          {/* Risk Distribution */}
          <Card className="p-5">
            <SectionHeader
              title="Risk Distribution"
              subtitle="Across all 8 warehouses"
            />
            <RiskDonutChart />
            <div className="mt-3 space-y-2.5">
              {riskDistribution.map((d) => {
                const pct = Math.round((d.count / 8) * 100);
                return (
                  <div key={d.label} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-[12px] font-medium text-gray-600 flex-1 min-w-0">{d.label}</span>
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: d.color }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-gray-700 w-4 text-right flex-shrink-0">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* ── Recommendations ───────────────────────────────────────────────── */}
        <section>
          <Card className="p-5">
            <SectionHeader
              title="AI Recommendations"
              subtitle="Automated action items based on current sensor readings"
              action={<ViewAllButton />}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec) => {
                const cfg = recConfig[rec.priority];
                return (
                  <div
                    key={rec.id}
                    className="flex gap-3 p-4 rounded-xl bg-gray-50 ring-1 ring-gray-100 hover:ring-gray-200 hover:shadow-sm transition-all duration-200 group cursor-default"
                  >
                    <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', cfg.bar)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0', cfg.badge)}>
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold flex-shrink-0">{rec.warehouse}</span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-800 leading-snug mb-1.5">{rec.title}</p>
                      <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{rec.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#1f5135] bg-green-50 px-2 py-0.5 rounded-full">
                          {rec.estimatedImpact}
                        </span>
                        <button className="text-[11px] font-bold text-gray-400 hover:text-[#1f5135] transition-colors duration-150">
                          Act →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

      </main>
    </div>
  );
}
