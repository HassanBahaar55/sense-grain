'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { AlertsTrendChart } from '@/components/charts/AlertsTrendChart';
import { useAlertsData, type Alert, type AlertSeverity, type AlertStatus, type AlertParamType } from '@/lib/dataEngine';

const heatmapDays   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapBlocks = ['00–03', '03–06', '06–09', '09–12', '12–15', '15–18', '18–21', '21–24'];
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const severityConfig: Record<AlertSeverity, { badge: string; dot: string; label: string; row: string }> = {
  critical: { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',      dot: 'bg-red-500',    label: 'Critical', row: 'bg-red-50/30'    },
  high:     { badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', dot: 'bg-orange-500', label: 'High',    row: 'bg-orange-50/20' },
  medium:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  dot: 'bg-amber-400',  label: 'Medium',   row: ''                },
  low:      { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',    dot: 'bg-blue-400',   label: 'Low',      row: ''                },
  info:     { badge: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',   dot: 'bg-gray-400',   label: 'Info',     row: ''                },
};

const statusConfig: Record<AlertStatus, { badge: string; dot: string; label: string }> = {
  active:       { badge: 'bg-red-50 text-red-600',     dot: 'bg-red-500 animate-pulse', label: 'Active'       },
  acknowledged: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400',             label: 'Acknowledged' },
  resolved:     { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500',             label: 'Resolved'     },
  muted:        { badge: 'bg-gray-100 text-gray-500',  dot: 'bg-gray-400',              label: 'Muted'        },
};

function heatColor(n: number) {
  if (n === 0) return 'bg-gray-50 border border-gray-100';
  if (n <= 2)  return 'bg-red-100';
  if (n <= 4)  return 'bg-red-200';
  if (n <= 6)  return 'bg-red-300';
  if (n <= 9)  return 'bg-red-400';
  return 'bg-red-500';
}
function heatText(n: number) {
  return n >= 5 ? 'text-white' : 'text-red-700';
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>
      {children}
    </div>
  );
}

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  sub: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
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

// ─── Alerts by Type donut ─────────────────────────────────────────────────────

interface DonutTipEntry {
  name?: string;
  value?: number;
  payload?: { color?: string };
}

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
            <Pie
              data={alertsByType}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={52}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              strokeWidth={0}
            >
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

// ─── Recent alerts feed ────────────────────────────────────────────────────────

function RecentAlertsPanel({ recentAlertFeed }: { recentAlertFeed: { id: string; severity: AlertSeverity; warehouse: string; zone: string; message: string; time: string }[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-gray-900">Recent Alerts</h2>
        <span className="text-[10px] font-semibold text-gray-400">Today</span>
      </div>
      <div className="space-y-0">
        {recentAlertFeed.map((item) => {
          const cfg = severityConfig[item.severity];
          return (
            <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 group hover:bg-gray-50/60 rounded-lg px-1.5 -mx-1.5 transition-colors">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', cfg.dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-700 leading-none">
                  {item.warehouse}
                  <span className="font-normal text-gray-400 mx-1">·</span>
                  {item.zone}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.message}</p>
              </div>
              <span className="text-[9px] font-semibold text-gray-400 flex-shrink-0 tabular-nums">{item.time}</span>
            </div>
          );
        })}
      </div>
      <button className="mt-2 text-[10px] font-semibold text-[#1f5135] hover:text-[#174028] transition-colors">
        View all alerts →
      </button>
    </Card>
  );
}

// ─── Acknowledged feed ────────────────────────────────────────────────────────

function AcknowledgedPanel({ acknowledgedAlerts }: { acknowledgedAlerts: { id: string; warehouse: string; zone: string; title: string; acknowledgedBy: string; acknowledgedAt: string }[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-gray-900">Acknowledged</h2>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
          {acknowledgedAlerts.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {acknowledgedAlerts.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/50 ring-1 ring-amber-100">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-700 leading-none truncate">
                {item.warehouse} · {item.zone}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{item.title}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">
                {item.acknowledgedBy} · {item.acknowledgedAt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function AlertHeatmap({ heatmapData }: { heatmapData: number[][] }) {
  const maxVal = Math.max(...heatmapData.flat());
  return (
    <Card className="p-5">
      <SectionLabel
        title="Alert Distribution by Time"
        subtitle="Alerts per 3-hour window across the week"
      />
      <div className="overflow-x-auto">
        <div style={{ minWidth: 280 }}>
          {/* Day header */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div />
            {heatmapDays.map((d) => (
              <div key={d} className="text-center text-[9px] font-bold text-gray-500 uppercase">{d}</div>
            ))}
          </div>
          {/* Rows = time blocks */}
          {heatmapBlocks.map((block, bi) => (
            <div key={block} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              <div className="text-[9px] font-medium text-gray-400 flex items-center pr-1 leading-none">{block}</div>
              {heatmapDays.map((_, di) => {
                const count = heatmapData[di][bi];
                return (
                  <div
                    key={di}
                    className={cn('h-6 rounded flex items-center justify-center transition-all duration-150 hover:opacity-80', heatColor(count))}
                    title={`${heatmapDays[di]} ${block}: ${count} alert${count !== 1 ? 's' : ''}`}
                  >
                    {count > 0 && (
                      <span className={cn('text-[8px] font-bold tabular-nums', heatText(count))}>{count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-gray-100">
            <span className="text-[9px] text-gray-400 mr-1">Low</span>
            {[0, 2, 4, 6, 10].map((v) => (
              <div key={v} className={cn('w-4 h-3 rounded-sm', heatColor(v))} />
            ))}
            <span className="text-[9px] text-gray-400 ml-1">High ({maxVal})</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Alerts table ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface TableProps {
  alerts: Alert[];
  search: string;
  severityF: string;
  typeF: string;
  statusF: string;
  page: number;
  setPage: (p: number) => void;
}

function AlertsTable({ alerts, search, severityF, typeF, statusF, page, setPage }: TableProps) {
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
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <Card className="p-5 min-w-0 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Active Alerts</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Showing {from}–{to} of {filtered.length} alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {alerts.filter((a) => a.status === 'active').length} Active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Severity', 'Alert', 'Warehouse / Zone', 'Parameter', 'Value', 'Threshold', 'Time', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-gray-400 font-medium">
                  No alerts match the current filters.
                </td>
              </tr>
            ) : (
              paginated.map((a) => {
                const sCfg = severityConfig[a.severity];
                const stCfg = statusConfig[a.status];
                return (
                  <tr key={a.id} className={cn('hover:bg-gray-50/80 transition-colors duration-100 cursor-pointer', sCfg.row)}>
                    {/* Severity */}
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full', sCfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', sCfg.dot)} />
                        {sCfg.label}
                      </span>
                    </td>
                    {/* Alert title + ID */}
                    <td className="px-3 py-3">
                      <p className="font-bold text-gray-800 text-[12px]">{a.title}</p>
                      <p className="text-gray-400 text-[9px] mt-0.5 font-mono">{a.id}</p>
                    </td>
                    {/* WH / Zone */}
                    <td className="px-3 py-3">
                      <p className="font-bold text-gray-700">{a.warehouse}</p>
                      <p className="text-gray-400 text-[9px] mt-0.5">{a.zone}</p>
                    </td>
                    {/* Parameter */}
                    <td className="px-3 py-3 font-semibold text-gray-600">{a.parameter}</td>
                    {/* Value */}
                    <td className={cn(
                      'px-3 py-3 font-bold tabular-nums',
                      a.severity === 'critical' ? 'text-red-600' :
                      a.severity === 'high' ? 'text-orange-600' :
                      a.severity === 'medium' ? 'text-amber-700' : 'text-gray-700',
                    )}>
                      {a.value}
                    </td>
                    {/* Threshold */}
                    <td className="px-3 py-3 text-gray-500 font-semibold tabular-nums">{a.threshold}</td>
                    {/* Time */}
                    <td className="px-3 py-3 text-gray-400 font-medium tabular-nums">{a.time}</td>
                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full', stCfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', stCfg.dot)} />
                        {stCfg.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="w-6 h-6 rounded-md flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors"
                          title="Acknowledge"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          className="w-6 h-6 rounded-md flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                          title="Resolve"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        </button>
                        <button
                          className="w-6 h-6 rounded-md flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                          title="View details"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
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
        <span className="text-[11px] text-gray-400 font-medium">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'h-7 w-7 rounded-lg text-[11px] font-bold transition-colors',
                p === page
                  ? 'bg-[#1f5135] text-white shadow-sm'
                  : 'text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100',
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const alertsData = useAlertsData();
  const alerts = alertsData.alerts;
  const alertSummary = alertsData.alertSummary;
  const alertsByType = alertsData.alertsByType;
  const recentAlertFeed = alertsData.recentFeed;
  const heatmapData = alertsData.heatmapData;
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged').map((a, i) => ({
    id: `ack${i + 1}`, warehouse: a.warehouse, zone: a.zone, title: a.title, acknowledgedBy: 'Admin User', acknowledgedAt: a.time,
  }));

  const [search, setSearch]     = useState('');
  const [severityF, setSeverityF] = useState('all');
  const [typeF, setTypeF]       = useState('all');
  const [statusF, setStatusF]   = useState('all');
  const [page, setPage]         = useState(1);

  function resetPage() { setPage(1); }

  const selectCls = 'h-8 px-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors appearance-none cursor-pointer';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader
        title="Alert Management"
        subtitle="Monitor, triage and resolve sensor alerts across all warehouses"
      />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <SummaryCard
            label="Total Alerts"
            value={alertSummary.total}
            sub="Last 7 days"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
          />
          <SummaryCard
            label="Critical Alerts"
            value={alertSummary.critical}
            sub="+1 today · Immediate action"
            iconBg="bg-red-50"
            iconColor="text-red-500"
            valueColor="text-red-500"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          />
          <SummaryCard
            label="Warning Alerts"
            value={alertSummary.warning}
            sub="Medium + High severity"
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            valueColor="text-amber-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
          />
          <SummaryCard
            label="Info Alerts"
            value={alertSummary.info}
            sub="Informational events"
            iconBg="bg-purple-50"
            iconColor="text-purple-500"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
          />
          <SummaryCard
            label="Resolved"
            value={alertSummary.resolved}
            sub="Auto-resolved: 8"
            iconBg="bg-green-50"
            iconColor="text-green-600"
            valueColor="text-green-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          />
        </section>

        {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
        <Card className="px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search alerts, warehouses, zones..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135]/40 transition-colors"
              />
            </div>

            {/* Severity filter */}
            <div className="relative">
              <select className={selectCls} value={severityF} onChange={(e) => { setSeverityF(e.target.value); resetPage(); }}>
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Type filter */}
            <div className="relative">
              <select className={selectCls} value={typeF} onChange={(e) => { setTypeF(e.target.value as AlertParamType | 'all'); resetPage(); }}>
                <option value="all">All Types</option>
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="moisture">Moisture</option>
                <option value="co2">CO₂</option>
                <option value="aqi">AQI</option>
                <option value="capacity">Capacity</option>
                <option value="system">System</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Status filter */}
            <div className="relative">
              <select className={selectCls} value={statusF} onChange={(e) => { setStatusF(e.target.value as AlertStatus | 'all'); resetPage(); }}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="muted">Muted</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Spacer */}
            <div className="ml-auto flex items-center gap-2">
              {/* Alert Settings */}
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Alert Settings
              </button>
              {/* Export */}
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#1f5135] text-white text-[11px] font-semibold hover:bg-[#174028] active:scale-95 transition-all duration-150 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Alerts
              </button>
            </div>
          </div>
        </Card>

        {/* ── Table + Right Panel ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,272px)] gap-5">

          {/* Alerts table */}
          <AlertsTable
            alerts={alerts}
            search={search}
            severityF={severityF}
            typeF={typeF}
            statusF={statusF}
            page={page}
            setPage={setPage}
          />

          {/* Right sidebar */}
          <div className="flex flex-col gap-4 min-w-0">
            <AlertsByTypePanel alertsByType={alertsByType} />
            <RecentAlertsPanel recentAlertFeed={recentAlertFeed} />
            <AcknowledgedPanel acknowledgedAlerts={acknowledgedAlerts} />
          </div>
        </section>

        {/* ── Analytics Section ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-5">

          {/* Alerts Trend */}
          <Card className="p-5 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <SectionLabel
                title="Alerts Trend"
                subtitle="7-day alert volume by severity"
              />
              <div className="flex items-center gap-3 flex-shrink-0">
                {[
                  { label: 'Critical', color: '#ef4444' },
                  { label: 'Warning',  color: '#f59e0b' },
                  { label: 'Info',     color: '#3b82f6' },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <AlertsTrendChart />
          </Card>

          {/* Heatmap */}
          <AlertHeatmap heatmapData={heatmapData} />
        </section>

      </main>
    </div>
  );
}
