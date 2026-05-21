'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { ParameterTrendsChart } from '@/components/charts/ParameterTrendsChart';
import {
  monitorWarehouses,
  zoneData,
  realtimeMetrics,
  recentActivity,
  sensorPositions,
  defaultSensorPositions,
  trendSeries,
  type WarehouseOnlineStatus,
  type ZoneStatus,
  type ActivityEvent,
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const whStatusConfig: Record<WarehouseOnlineStatus, { dot: string; badge: string; label: string; ring: string }> = {
  online:  { dot: 'bg-green-400',  badge: 'text-green-700 bg-green-50',   label: 'Online',  ring: 'ring-green-100'  },
  warning: { dot: 'bg-amber-400',  badge: 'text-amber-700 bg-amber-50',   label: 'Warning', ring: 'ring-amber-100'  },
  alert:   { dot: 'bg-red-400',    badge: 'text-red-600 bg-red-50',       label: 'Alert',   ring: 'ring-red-100'    },
  offline: { dot: 'bg-gray-300',   badge: 'text-gray-400 bg-gray-100',    label: 'Offline', ring: 'ring-gray-100'   },
};

const zoneStatusConfig: Record<ZoneStatus, { cell: string; badge: string; label: string }> = {
  good:     { cell: '',                  badge: 'text-green-700 bg-green-50',  label: 'Good'     },
  normal:   { cell: '',                  badge: 'text-blue-600 bg-blue-50',    label: 'Normal'   },
  warning:  { cell: 'bg-amber-50/60',    badge: 'text-amber-700 bg-amber-100', label: 'Warning'  },
  critical: { cell: 'bg-red-50/70',      badge: 'text-red-600 bg-red-100',     label: 'Critical' },
  offline:  { cell: 'bg-gray-50',        badge: 'text-gray-400 bg-gray-100',   label: 'Offline'  },
};

const sensorColorMap: Record<ZoneStatus, { fill: string; stroke: string; pulse: string; text: string }> = {
  good:     { fill: '#dcfce7', stroke: '#22c55e', pulse: '#4ade80', text: '#15803d' },
  normal:   { fill: '#dbeafe', stroke: '#3b82f6', pulse: '#60a5fa', text: '#1d4ed8' },
  warning:  { fill: '#fef3c7', stroke: '#f59e0b', pulse: '#fbbf24', text: '#b45309' },
  critical: { fill: '#fee2e2', stroke: '#ef4444', pulse: '#f87171', text: '#dc2626' },
  offline:  { fill: '#f3f4f6', stroke: '#9ca3af', pulse: '#d1d5db', text: '#6b7280' },
};

const activityConfig: Record<ActivityEvent['type'], { icon: string; bg: string; text: string; iconBg: string }> = {
  alert:   { icon: '⚠', bg: 'bg-red-50 ring-red-100',    text: 'text-red-600',    iconBg: 'bg-red-100 text-red-600'    },
  warning: { icon: '!', bg: 'bg-amber-50 ring-amber-100', text: 'text-amber-700',  iconBg: 'bg-amber-100 text-amber-700'},
  info:    { icon: 'i', bg: 'bg-blue-50 ring-blue-100',   text: 'text-blue-600',   iconBg: 'bg-blue-100 text-blue-600'  },
  success: { icon: '✓', bg: 'bg-green-50 ring-green-100', text: 'text-green-700',  iconBg: 'bg-green-100 text-green-700'},
};

// ─── Reusable card wrapper ────────────────────────────────────────────────────

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
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{time}</span>;
}

// ─── Monitor sub-header ───────────────────────────────────────────────────────

function MonitorSubHeader({
  selectedWarehouse,
  onWarehouseChange,
}: {
  selectedWarehouse: string;
  onWarehouseChange: (id: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-4 flex-wrap">
      {/* Live time */}
      <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-600">
        <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <LiveClock />
      </div>

      <div className="w-px h-4 bg-gray-200" />

      {/* Warehouse selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Viewing</span>
        <div className="flex items-center gap-1">
          {monitorWarehouses.filter((w) => w.status !== 'offline').map((wh) => (
            <button
              key={wh.id}
              onClick={() => onWarehouseChange(wh.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150',
                selectedWarehouse === wh.id
                  ? 'bg-[#1f5135] text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
              )}
            >
              {wh.id}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Auto-refresh badge */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
        <span className="relative flex">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
          <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-70" />
        </span>
        Auto-refresh · 30s
      </div>
    </div>
  );
}

// ─── Warehouse visualization SVG ──────────────────────────────────────────────

function WarehouseVisualization({ warehouseId }: { warehouseId: string }) {
  const sensors =
    sensorPositions[warehouseId] ??
    defaultSensorPositions(warehouseId);

  const wh = monitorWarehouses.find((w) => w.id === warehouseId);
  const isOffline = wh?.status === 'offline';

  return (
    <div className="relative w-full bg-[#f8fafc] rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16/9', minHeight: 220 }}>
      <svg viewBox="0 0 480 270" className="w-full h-full" preserveAspectRatio="xMidYMid meet">

        {/* ── Background grid ── */}
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="480" height="270" fill="url(#grid)" />

        {/* ── Outer warehouse boundary ── */}
        <rect x="28" y="22" width="424" height="226" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />

        {/* ── Roof silhouette ── */}
        <polygon points="18,48 240,14 462,48" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* ── Entrance / door ── */}
        <rect x="210" y="230" width="60" height="18" rx="2" fill="#cbd5e1" />
        <rect x="214" y="230" width="27" height="16" rx="1" fill="#94a3b8" />
        <rect x="243" y="230" width="27" height="16" rx="1" fill="#94a3b8" />
        <text x="240" y="265" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">ENTRANCE</text>

        {/* ── Zone storage blocks ── */}
        {[
          { x: 48,  y: 48,  w: 172, h: 102, label: 'Zone 1 · North Bay', idx: 0 },
          { x: 260, y: 48,  w: 172, h: 102, label: 'Zone 2 · East Bay',  idx: 1 },
          { x: 48,  y: 168, w: 172, h: 72,  label: 'Zone 3 · South Bay', idx: 2 },
          { x: 260, y: 168, w: 172, h: 72,  label: 'Zone 4 · West Bay',  idx: 3 },
        ].map(({ x, y, w, h, label, idx }) => {
          const sensor = sensors[idx];
          const status = sensor?.status ?? 'offline';
          const colors = sensorColorMap[status];
          return (
            <g key={label}>
              {/* Zone block */}
              <rect x={x} y={y} width={w} height={h} rx="4" fill={isOffline ? '#f3f4f6' : colors.fill} stroke={isOffline ? '#e5e7eb' : colors.stroke} strokeWidth="1.5" opacity={isOffline ? 0.5 : 1} />
              {/* Grain bin hatching */}
              {!isOffline && Array.from({ length: Math.floor(w / 22) }).map((_, bi) =>
                Array.from({ length: Math.floor(h / 20) }).map((__, bj) => (
                  <rect
                    key={`${bi}-${bj}`}
                    x={x + 10 + bi * 22}
                    y={y + 10 + bj * 20}
                    width="12"
                    height="10"
                    rx="2"
                    fill={colors.stroke}
                    opacity="0.18"
                  />
                ))
              )}
              {/* Zone label */}
              <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize="8.5" fill={isOffline ? '#9ca3af' : colors.text} fontWeight="700" letterSpacing="0.3">
                {label.split(' · ')[0]}
              </text>
            </g>
          );
        })}

        {/* ── Sensor markers ── */}
        {!isOffline && sensors.map((s, i) => {
          const colors = sensorColorMap[s.status];
          return (
            <g key={i}>
              {/* Pulse ring */}
              {(s.status === 'critical' || s.status === 'warning') && (
                <circle cx={s.cx} cy={s.cy} r="16" fill={colors.pulse} opacity="0.2">
                  <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Sensor circle */}
              <circle cx={s.cx} cy={s.cy} r="14" fill="white" stroke={colors.stroke} strokeWidth="2.5" filter="url(#glow)" />
              {/* Temperature text */}
              <text x={s.cx} y={s.cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={colors.text} fontWeight="800">
                {s.temp.toFixed(1)}°
              </text>
              {/* Zone label below */}
              <text x={s.cx} y={s.cy + 22} textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="600">
                {s.zone}
              </text>
            </g>
          );
        })}

        {/* ── Offline overlay ── */}
        {isOffline && (
          <>
            <rect x="28" y="22" width="424" height="226" rx="6" fill="#f8fafc" opacity="0.8" />
            <text x="240" y="130" textAnchor="middle" fontSize="14" fill="#9ca3af" fontWeight="700">OFFLINE</text>
            <text x="240" y="150" textAnchor="middle" fontSize="10" fill="#d1d5db">No signal from sensors</text>
          </>
        )}

        {/* ── Compass ── */}
        <g transform="translate(446, 38)">
          <circle cx="0" cy="0" r="12" fill="white" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="-5" textAnchor="middle" fontSize="7" fill="#1f5135" fontWeight="800">N</text>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#1f5135" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* ── WH label ── */}
        <text x="44" y="265" fontSize="10" fill="#94a3b8" fontWeight="700">{warehouseId}</text>

      </svg>
    </div>
  );
}

// ─── Zone parameter table ─────────────────────────────────────────────────────

function ZoneTable({ warehouseId }: { warehouseId: string }) {
  const zones = zoneData[warehouseId] ?? [];
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Zone', 'Temp', 'Hum.', 'Moist.', 'CO₂', 'AQI', 'Status'].map((h) => (
              <th key={h} className="px-2.5 py-2 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {zones.map((zone) => {
            const cfg = zoneStatusConfig[zone.status];
            return (
              <tr key={zone.id} className={cn('transition-colors duration-150 hover:bg-gray-50', cfg.cell)}>
                <td className="px-2.5 py-2.5 font-bold text-gray-800 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      (zone.status === 'good' || zone.status === 'normal') && 'bg-green-400',
                      zone.status === 'warning'  && 'bg-amber-400',
                      zone.status === 'critical' && 'bg-red-400',
                      zone.status === 'offline'  && 'bg-gray-300',
                    )} />
                    {zone.id}
                  </div>
                </td>
                <td className={cn('px-2.5 py-2.5 font-semibold whitespace-nowrap', zone.status === 'critical' ? 'text-red-600' : 'text-gray-700')}>
                  {zone.temp != null ? `${zone.temp}°C` : '—'}
                </td>
                <td className={cn('px-2.5 py-2.5 font-semibold whitespace-nowrap', zone.status === 'warning' || zone.status === 'critical' ? 'text-amber-600' : 'text-gray-700')}>
                  {zone.humidity != null ? `${zone.humidity}%` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  {zone.moisture != null ? `${zone.moisture}%` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  {zone.co2 != null ? `${zone.co2}` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  {zone.aqi != null ? `${zone.aqi}` : '—'}
                </td>
                <td className="px-2.5 py-2.5 whitespace-nowrap">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
                    {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Activity feed item ───────────────────────────────────────────────────────

function ActivityItem({ event }: { event: ActivityEvent }) {
  const cfg = activityConfig[event.type];
  return (
    <div className={cn('flex gap-3 p-3 rounded-xl ring-1 hover:shadow-sm transition-shadow duration-150', cfg.bg)}>
      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5', cfg.iconBg)}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-bold text-gray-800 leading-tight">{event.title}</p>
          <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{event.time}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{event.description}</p>
        <span className="inline-block mt-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
          {event.warehouse}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RealtimeMonitorPage() {
  const [selectedWH, setSelectedWH] = useState('WH-A');
  const selectedWarehouseData = monitorWarehouses.find((w) => w.id === selectedWH);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={`Live sensor data · ${selectedWH} — ${selectedWarehouseData?.name ?? ''}`}
      />
      <MonitorSubHeader selectedWarehouse={selectedWH} onWarehouseChange={setSelectedWH} />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── Top Metric Cards ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {realtimeMetrics.map((m) => (
            <Card key={m.id} className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide truncate">{m.label}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1',
                  m.status === 'good' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50',
                )}>
                  {m.status === 'good' ? 'OK' : 'Hi'}
                </span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-[22px] font-bold text-gray-900 leading-none">{m.value}</span>
                <span className="text-[11px] font-semibold text-gray-400 pb-0.5">{m.unit}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-[10px] font-semibold flex items-center gap-0.5',
                  m.up ? 'text-amber-600' : 'text-green-600',
                )}>
                  {m.up ? '↑' : '↓'} {m.change} vs 1h ago
                </span>
              </div>
              <div className="w-full">
                <SparklineChart values={m.sparkline} color={m.color} />
              </div>
            </Card>
          ))}
        </section>

        {/* ── Warehouse Monitoring Section ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] xl:grid-cols-[220px_1fr_260px] gap-5">

          {/* ── Left: Warehouse List ── */}
          <Card className="p-4">
            <SectionHeader title="Warehouses" subtitle="Select to monitor" />
            <div className="space-y-2">
              {monitorWarehouses.map((wh) => {
                const cfg = whStatusConfig[wh.status];
                const isSelected = selectedWH === wh.id;
                return (
                  <button
                    key={wh.id}
                    onClick={() => setSelectedWH(wh.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 text-left transition-all duration-150',
                      isSelected
                        ? 'bg-[#1f5135]/[0.06] ring-[#1f5135]/20 shadow-sm'
                        : `bg-white hover:bg-gray-50 ${cfg.ring}`,
                    )}
                  >
                    {/* Status dot */}
                    <span className="relative flex-shrink-0">
                      <span className={cn('w-2.5 h-2.5 rounded-full block', cfg.dot)} />
                      {wh.status === 'alert' && (
                        <span className={cn('absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping', cfg.dot, 'opacity-60')} />
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[13px] font-bold', isSelected ? 'text-[#1f5135]' : 'text-gray-800')}>
                          {wh.id}
                        </span>
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', cfg.badge)}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {wh.temp != null ? (
                          <>
                            <span className="text-[10px] text-gray-500">{wh.temp}°C</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-[10px] text-gray-500">{wh.humidity}%</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No signal</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-[#1f5135] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── Center: Warehouse Visualization ── */}
          <Card className="p-5">
            <SectionHeader
              title={`${selectedWH} — Live Floor Plan`}
              subtitle="Temperature sensors · real-time positions"
              action={
                <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                  {[
                    { label: 'Good',     color: '#22c55e' },
                    { label: 'Normal',   color: '#3b82f6' },
                    { label: 'Warning',  color: '#f59e0b' },
                    { label: 'Critical', color: '#ef4444' },
                  ].map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              }
            />
            <WarehouseVisualization warehouseId={selectedWH} />

            {/* Quick stats bar */}
            {selectedWarehouseData?.temp != null && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg Temp',    value: `${selectedWarehouseData.temp}°C`,    color: '#f59e0b' },
                  { label: 'Avg Humidity',value: `${selectedWarehouseData.humidity}%`, color: '#3b82f6' },
                  { label: 'Zones',       value: `${selectedWarehouseData.zoneCount} active`, color: '#22c55e' },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center py-2 px-3 bg-gray-50 rounded-xl ring-1 ring-gray-100">
                    <span className="text-[15px] font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[10px] font-semibold text-gray-400 mt-0.5">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Right: Zone Parameter Table ── */}
          <Card className="p-4">
            <SectionHeader
              title="Zone Readings"
              subtitle={`${selectedWH} · live values`}
            />
            <ZoneTable warehouseId={selectedWH} />

            {/* Threshold reference */}
            <div className="mt-3 p-3 bg-gray-50 rounded-xl ring-1 ring-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Safe Thresholds</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  { label: 'Temp',  value: '< 30°C'  },
                  { label: 'Hum.',  value: '< 70%'   },
                  { label: 'Moist',value: '< 14%'   },
                  { label: 'CO₂',  value: '< 800ppm' },
                ].map((t) => (
                  <div key={t.label} className="flex justify-between text-[10px]">
                    <span className="text-gray-400 font-medium">{t.label}</span>
                    <span className="text-gray-600 font-semibold">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* ── Parameter Trends ─────────────────────────────────────────────── */}
        <section>
          <Card className="p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">Parameter Trends</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Normalized % of safety threshold · last 60 min · {selectedWH}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                <span className="w-3 h-1.5 rounded-full bg-amber-200 inline-block" /> Warning zone (75–90%)
                <span className="w-3 h-1.5 rounded-full bg-red-200 inline-block ml-2" /> Critical (90%+)
              </div>
            </div>

            <ParameterTrendsChart />

            {/* Trend legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-gray-100">
              {trendSeries.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                  <span className="text-[11px] font-bold text-gray-700">
                    {realtimeMetrics.find((m) => m.id === s.key)?.value}
                    {s.unit}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Recent Activity ───────────────────────────────────────────────── */}
        <section>
          <Card className="p-5">
            <SectionHeader
              title="Recent Activity"
              subtitle="Live monitoring events and system alerts"
              action={
                <button className="text-xs font-semibold text-[#1f5135] hover:text-[#174028] transition-colors">
                  View all
                </button>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {recentActivity.map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))}
            </div>
          </Card>
        </section>

      </main>
    </div>
  );
}
