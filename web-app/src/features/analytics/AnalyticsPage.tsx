'use client';

import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { WarehousePerformanceChart } from '@/components/charts/WarehousePerformanceChart';
import { type TrendDir, type RiskLevel } from '@/lib/dataEngine';
import {
  useFirestoreAnalytics as useAnalyticsData,
  useSensorPerformance,
} from '@/lib/useFirestoreData';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useWarehouses } from '@/lib/storageManagement';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const kpiColorMap = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-100'  },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'ring-green-100'  },
  red:    { bg: 'bg-red-50',    text: 'text-red-500',    ring: 'ring-red-100'    },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   ring: 'ring-teal-100'   },
};

const kpiDescriptions: Record<string, string> = {
  'Temp Stability':       '% score: current avg temp vs safe range (< 29°C)',
  'Humidity Stability':   '% score: current avg humidity vs safe range (< 65%)',
  'Capacity Utilization': 'Avg warehouse space currently in use (live)',
  'Spoilage Risk':        'Avg spoilage probability across active warehouses (live)',
  'Sensor Health':        'Active warehouses with live sensor data',
};

const riskConfig: Record<RiskLevel, { badge: string; label: string }> = {
  low:      { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',  label: 'Low'      },
  medium:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  label: 'Medium'   },
  high:     { badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',        label: 'High'     },
  inactive: { badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',    label: 'Inactive' },
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

// ─── KPI Icons ────────────────────────────────────────────────────────────────

const kpiIcons: Record<string, React.ReactNode> = {
  'Temp Stability': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>
  ),
  'Humidity Stability': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
  ),
  'Capacity Utilization': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
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
  if (trend === 'up') return (
    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="18" x2="19" y2="6" /><polyline points="12 4 19 6 19 13" /></svg>
  );
  return (
    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="6" x2="19" y2="18" /><polyline points="12 20 19 18 19 11" /></svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SENSOR_DAYS_OPTIONS: Array<7 | 14 | 30> = [7, 14, 30];

export default function AnalyticsPage() {
  const { kpis: rawKpis, topWarehouse, worstWarehouse } = useAnalyticsData();
  const { readings } = useLiveData();
  const { warehouses: managedWarehouses } = useWarehouses();

  const [sensorDays, setSensorDays] = useState<7 | 14 | 30>(7);
  const [sensorWH,   setSensorWH]   = useState<string>('all');

  // ── Live KPI overrides ──────────────────────────────────────────────────────
  const liveReadings = Object.values(readings);

  const liveCapacity = liveReadings.length
    ? Math.round(liveReadings.reduce((s, r) => s + r.capacity, 0) / liveReadings.length)
    : null;
  const liveSpoilage = liveReadings.length
    ? +(liveReadings.reduce((s, r) => s + r.spoilageRisk, 0) / liveReadings.length).toFixed(1)
    : null;

  const analyticsKPIs = useMemo(() => rawKpis.map(k => {
    if (k.label === 'Capacity Utilization' && liveCapacity != null) return { ...k, value: liveCapacity };
    if (k.label === 'Spoilage Risk'        && liveSpoilage != null) return { ...k, value: liveSpoilage };
    return k;
  }), [rawKpis, liveCapacity, liveSpoilage]);

  // ── Analytics table — user-created warehouses from storageWarehouses ────────
  // Each managed warehouse has a liveEngineId that maps to warehouseReadings.
  // If no liveEngineId or no live data → show as inactive row.
  const liveTableRows = useMemo(() => {
    // If no managed warehouses yet, fall back to raw readings
    const source = managedWarehouses.length > 0 ? managedWarehouses : null;

    if (!source) {
      // Fallback: show whatever readings exist
      return liveReadings
        .map(r => {
          const humScore = Math.round(Math.max(0, 100 - Math.max(0, Math.abs(r.humidity - 60) - 5) * 3));
          const risk: RiskLevel = r.status === 'high' ? 'high' : r.status === 'medium' ? 'medium' : 'low';
          return { id: r.warehouseId, name: `Warehouse ${r.warehouseId.replace('WH-', '')}`, avgTemp: r.temperature, humidityScore: humScore, spoilageProb: r.spoilageRisk, capacity: r.capacity, risk, trend: r.trend as TrendDir, sensorHealth: 100, hasLive: true };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    return source
      .filter(wh => wh.status === 'active')
      .map(wh => {
        const liveId = wh.liveEngineId ?? wh.id; // map to liveEngine WH-X id
        const r = readings[liveId];
        if (!r) {
          // Managed warehouse exists but no live reading — show inactive
          return {
            id: wh.id, name: wh.name,
            avgTemp: null as unknown as number, humidityScore: null as unknown as number,
            spoilageProb: null as unknown as number, capacity: null as unknown as number,
            risk: 'inactive' as RiskLevel, trend: null as TrendDir, sensorHealth: 0, hasLive: false,
          };
        }
        const humScore = Math.round(Math.max(0, 100 - Math.max(0, Math.abs(r.humidity - 60) - 5) * 3));
        const risk: RiskLevel = r.status === 'high' ? 'high' : r.status === 'medium' ? 'medium' : 'low';
        return {
          id: wh.id, name: wh.name,
          avgTemp: r.temperature, humidityScore: humScore,
          spoilageProb: r.spoilageRisk, capacity: r.capacity,
          risk, trend: r.trend as TrendDir, sensorHealth: 100, hasLive: true,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [managedWarehouses, readings]);

  // ── Sensor performance — driven by Firestore sensorHistory ─────────────────
  const sensorPerfData = useSensorPerformance(sensorDays);
  const filteredSensorData = sensorWH === 'all'
    ? sensorPerfData
    : sensorPerfData.filter(s => s.warehouse === sensorWH);

  const allWarehouseIds = sensorPerfData.map(s => s.warehouse);

  // ── Operational summary stats ───────────────────────────────────────────────
  const totalManaged = managedWarehouses.filter(w => w.status === 'active').length || liveTableRows.length;
  const liveCount    = liveTableRows.filter(r => r.hasLive).length;
  const highRisk     = liveTableRows.filter(r => r.risk === 'high').length;
  const medRisk      = liveTableRows.filter(r => r.risk === 'medium').length;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader title="Analytics" subtitle="Operational analytics across all warehouses" />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {analyticsKPIs.map((kpi) => {
            const colKey = kpi.colorKey as keyof typeof kpiColorMap;
            const col = kpiColorMap[colKey] ?? kpiColorMap.teal;
            return (
              <Card key={kpi.label} className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                <div className="flex items-start justify-between mb-2.5">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1', col.bg, col.ring)}>
                    <span className={col.text}>{kpiIcons[kpi.label]}</span>
                  </div>
                  <TrendBadge trend={kpi.trend} inverted={kpi.invertedTrend} delta={kpi.delta} />
                </div>
                <p className="text-[24px] font-bold text-gray-900 leading-none tabular-nums">
                  {kpi.value}
                  <span className="text-[13px] font-semibold text-gray-400 ml-0.5">{kpi.unit}</span>
                </p>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mt-1 leading-none">{kpi.label}</p>
                {kpiDescriptions[kpi.label] && (
                  <p className="text-[9px] text-gray-400 mt-1 leading-snug">{kpiDescriptions[kpi.label]}</p>
                )}
              </Card>
            );
          })}
        </section>

        {/* ── Operational Summary strip ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Warehouses',  value: totalManaged, unit: `(${liveCount} live)`,  color: 'text-[#1f5135]' },
            { label: 'High Risk',         value: highRisk,     unit: 'warehouses',            color: highRisk > 0 ? 'text-red-600' : 'text-gray-700' },
            { label: 'Medium Risk',       value: medRisk,      unit: 'warehouses',            color: medRisk > 0 ? 'text-amber-600' : 'text-gray-700' },
          ].map(s => (
            <Card key={s.label} className="px-4 py-3 flex items-center gap-3">
              <div>
                <p className={cn('text-[20px] font-bold tabular-nums leading-none', s.color)}>
                  {s.value}<span className="text-[11px] font-semibold text-gray-400 ml-1">{s.unit}</span>
                </p>
                <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Warehouse Performance Chart ─────────────────────────────────────── */}
        <Card className="p-5 min-w-0">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Warehouse Performance</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Efficiency · Stability · Capacity — live sensor readings, updates every 10s</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
              {[
                { l: 'Efficiency',  c: '#1f5135', tip: 'Sensor health score (0–100)' },
                { l: 'Stability',   c: '#3b82f6', tip: 'Inverse spoilage risk (0–100)' },
                { l: 'Utilization', c: '#f59e0b', tip: '% of storage space occupied' },
              ].map(s => (
                <span key={s.l} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500" title={s.tip}>
                  <span className="w-3 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.c, opacity: 0.85 }} />
                  {s.l}
                </span>
              ))}
            </div>
          </div>

          {/* Best / Worst WH highlights */}
          {(topWarehouse || worstWarehouse) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {topWarehouse && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-50 ring-1 ring-green-100">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-green-700">↑</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-green-800 uppercase tracking-wide">Best Performing</p>
                    <p className="text-[12px] font-bold text-green-900 truncate">{topWarehouse.name}</p>
                    <p className="text-[9px] text-green-600 truncate">{topWarehouse.detail}</p>
                  </div>
                </div>
              )}
              {worstWarehouse && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 ring-1 ring-red-100">
                  <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-red-700">↓</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-wide">Needs Attention</p>
                    <p className="text-[12px] font-bold text-red-900 truncate">{worstWarehouse.name}</p>
                    <p className="text-[9px] text-red-600 truncate">{worstWarehouse.detail}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <WarehousePerformanceChart />
        </Card>

        {/* ── Warehouse Analytics Summary ─────────────────────────────────────── */}
        <Card className="p-5 min-w-0 overflow-hidden">
          <SectionHeader
            title="Warehouse Analytics Summary"
            subtitle={`${totalManaged} managed warehouse${totalManaged !== 1 ? 's' : ''} · ${liveCount} with live sensors · updates every 10s`}
          />

          {liveTableRows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px] text-gray-400">Loading live sensor data…</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { h: 'Warehouse',      tip: ''                                                      },
                      { h: 'Avg Temp',       tip: 'Current live temperature reading'                      },
                      { h: 'Humidity Score', tip: 'Score 0–100: higher = closer to ideal range (55–65%)' },
                      { h: 'Spoilage Prob.', tip: 'Computed spoilage probability (0–100%)'                },
                      { h: 'Capacity',       tip: '% of warehouse storage space currently in use'         },
                      { h: 'Risk Level',     tip: 'Based on temp, humidity & moisture thresholds'         },
                      { h: 'Sensor Health',  tip: 'Sensor online status'                                  },
                      { h: 'Trend',          tip: 'Temperature direction over last reading'                },
                    ].map(({ h, tip }) => (
                      <th key={h} title={tip} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px] cursor-help">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liveTableRows.map((row) => {
                    const rc = riskConfig[row.risk];
                    const noData = !row.hasLive;
                    const dash = <span className="text-gray-300 font-bold">—</span>;
                    return (
                      <tr key={row.id} className={cn('hover:bg-gray-50 transition-colors duration-150', noData && 'opacity-60')}>
                        {/* Warehouse */}
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-gray-800">{row.name}</p>
                          <p className="text-gray-400 text-[9px] font-mono mt-0.5">{row.id}</p>
                        </td>
                        {/* Avg Temp */}
                        <td className={cn(
                          'px-3 py-2.5 font-bold tabular-nums',
                          noData ? 'text-gray-300' :
                          row.avgTemp >= 32 ? 'text-red-600' : row.avgTemp >= 30 ? 'text-orange-600' : row.avgTemp >= 28 ? 'text-amber-600' : 'text-gray-700',
                        )}>
                          {noData ? dash : `${row.avgTemp.toFixed(1)} °C`}
                        </td>
                        {/* Humidity Score */}
                        <td className="px-3 py-2.5">
                          {noData ? dash : (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-700 tabular-nums">{row.humidityScore}/100</span>
                              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    row.humidityScore >= 85 ? 'bg-green-500' : row.humidityScore >= 70 ? 'bg-[#1f5135]' : row.humidityScore >= 55 ? 'bg-amber-400' : 'bg-red-400',
                                  )}
                                  style={{ width: `${row.humidityScore}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Spoilage */}
                        <td className={cn(
                          'px-3 py-2.5 font-bold tabular-nums',
                          noData ? 'text-gray-300' :
                          row.spoilageProb >= 15 ? 'text-red-600' : row.spoilageProb >= 8 ? 'text-amber-600' : 'text-green-700',
                        )}>
                          {noData ? dash : `${row.spoilageProb.toFixed(1)}%`}
                        </td>
                        {/* Capacity */}
                        <td className="px-3 py-2.5">
                          {noData ? dash : (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-700 tabular-nums">{Math.round(row.capacity)}%</span>
                              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#1f5135]" style={{ width: `${row.capacity}%` }} />
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Risk */}
                        <td className="px-3 py-2.5">
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', rc.badge)}>{rc.label}</span>
                        </td>
                        {/* Sensor Health */}
                        <td className="px-3 py-2.5 font-bold tabular-nums">
                          {noData
                            ? <span className="text-gray-400 text-[9px] font-semibold">No sensor</span>
                            : <span className="text-green-600">{row.sensorHealth}%</span>
                          }
                        </td>
                        {/* Trend */}
                        <td className="px-3 py-2.5">
                          {noData ? dash : <TrendIcon trend={row.trend} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Sensor Performance Analytics ───────────────────────────────────── */}
        <Card className="p-5">
          <SectionHeader
            title="Sensor Performance Analytics"
            subtitle={`Uptime per warehouse — ${sensorDays}-day average from Firestore sensor history`}
            action={
              <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
                {/* Days filter — actually changes Firestore query */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {SENSOR_DAYS_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setSensorDays(d)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150',
                        sensorDays === d
                          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.06]'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
                {/* Warehouse filter */}
                <select
                  value={sensorWH}
                  onChange={e => setSensorWH(e.target.value)}
                  className="text-[10px] font-semibold text-gray-600 bg-gray-100 border-0 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="all">All Warehouses</option>
                  {allWarehouseIds.map(wh => (
                    <option key={wh} value={wh}>{wh}</option>
                  ))}
                </select>
                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />100%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1f5135]" />≥97%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />≥90%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />Offline</span>
                </div>
              </div>
            }
          />

          {filteredSensorData.length === 0 ? (
            <p className="text-[12px] text-gray-400 text-center py-6">No data for selected warehouse.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {filteredSensorData.map((item) => {
                const pct = item.uptime;
                const barColor =
                  pct === 100  ? 'bg-green-500' :
                  pct >= 97    ? 'bg-[#1f5135]' :
                  pct >= 90    ? 'bg-amber-400' :
                  pct > 0      ? 'bg-red-400'   : 'bg-gray-200';
                const valColor =
                  pct === 100  ? 'text-green-600' :
                  pct >= 95    ? 'text-[#1f5135]' :
                  pct > 0      ? 'text-amber-600' : 'text-gray-400';
                return (
                  <div key={item.warehouse}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-700">{item.warehouse}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium" title={`${item.online} of ${item.total} sensor types currently reporting live data`}>
                          {item.online}/{item.total} sensors online
                        </span>
                        <span className={cn('text-[11px] font-bold tabular-nums', valColor)}>
                          {pct === 0 ? 'Offline' : `${pct.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-gray-400">
              Uptime = % of days with active readings in Firestore sensorHistory · {sensorDays}-day window
            </p>
            <p className="text-[10px] font-semibold text-gray-500">
              {sensorPerfData.filter(s => s.uptime === 100).length}/{sensorPerfData.length} warehouses at 100% uptime
            </p>
          </div>
        </Card>

      </main>
    </div>
  );
}
