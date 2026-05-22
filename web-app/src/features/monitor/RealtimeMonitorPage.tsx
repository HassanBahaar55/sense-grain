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
  type ZoneReading,
  type ActivityEvent,
  type SensorPoint,
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Thresholds (grain storage safe limits) ───────────────────────────────────
// Status is derived from these limits across all sensor readings

const THRESHOLDS = {
  temp:     { good: 27, warning: 30 },   // °C
  humidity: { good: 62, warning: 70 },   // %
  moisture: { good: 13, warning: 14 },   // %
};

// ─── Status configs ───────────────────────────────────────────────────────────

const whCfg: Record<WarehouseOnlineStatus, { dot: string; label: string }> = {
  online:  { dot: 'bg-green-400', label: 'Online'  },
  warning: { dot: 'bg-amber-400', label: 'Warning' },
  alert:   { dot: 'bg-red-400',   label: 'Alert'   },
  offline: { dot: 'bg-gray-300',  label: 'Offline' },
};

const zoneCfg: Record<ZoneStatus, { dot: string; bg: string; ring: string; badge: string; label: string }> = {
  good:     { dot: 'bg-green-400', bg: 'bg-white',       ring: 'ring-gray-100',  badge: 'bg-green-50 text-green-700',  label: 'Good'     },
  normal:   { dot: 'bg-blue-400',  bg: 'bg-white',       ring: 'ring-gray-100',  badge: 'bg-blue-50 text-blue-700',    label: 'Normal'   },
  warning:  { dot: 'bg-amber-400', bg: 'bg-amber-50/40', ring: 'ring-amber-100', badge: 'bg-amber-100 text-amber-700', label: 'Warning'  },
  critical: { dot: 'bg-red-500',   bg: 'bg-red-50/50',   ring: 'ring-red-100',   badge: 'bg-red-100 text-red-600',     label: 'Critical' },
  offline:  { dot: 'bg-gray-300',  bg: 'bg-gray-50',     ring: 'ring-gray-100',  badge: 'bg-gray-100 text-gray-400',   label: 'Offline'  },
};

// ─── View mode: what drives the floor plan coloring ──────────────────────────

type ViewMode = 'status' | 'temp' | 'humidity';

function getSensorColors(s: SensorPoint, mode: ViewMode) {
  if (mode === 'temp') {
    if (s.temp >= THRESHOLDS.temp.warning)
      return { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' };
    if (s.temp >= THRESHOLDS.temp.good)
      return { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' };
    return { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' };
  }
  if (mode === 'humidity') {
    if (s.humidity >= THRESHOLDS.humidity.warning)
      return { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' };
    if (s.humidity >= THRESHOLDS.humidity.good)
      return { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' };
    return { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' };
  }
  // status mode (default)
  const map: Record<ZoneStatus, { fill: string; stroke: string; text: string; pulse: string }> = {
    good:     { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' },
    normal:   { fill: '#dbeafe', stroke: '#3b82f6', text: '#1d4ed8', pulse: '#60a5fa' },
    warning:  { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' },
    critical: { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' },
    offline:  { fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280', pulse: '#d1d5db' },
  };
  return map[s.status];
}

const activityCfg: Record<ActivityEvent['type'], { dot: string; titleCls: string }> = {
  alert:   { dot: 'bg-red-400',   titleCls: 'text-red-700'   },
  warning: { dot: 'bg-amber-400', titleCls: 'text-amber-700' },
  info:    { dot: 'bg-blue-400',  titleCls: 'text-gray-800'  },
  success: { dot: 'bg-green-400', titleCls: 'text-gray-800'  },
};

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
  return <span suppressHydrationWarning className="tabular-nums">{time}</span>;
}

// ─── Sub-header ───────────────────────────────────────────────────────────────

function MonitorBar({
  selected, onSelect, timeRange, onTimeRange,
}: {
  selected: string; onSelect: (id: string) => void;
  timeRange: string; onTimeRange: (t: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-2 flex-wrap">
      {monitorWarehouses.map((wh) => {
        const cfg = whCfg[wh.status];
        const isSelected = selected === wh.id;
        const isOffline = wh.status === 'offline';
        return (
          <button
            key={wh.id}
            onClick={() => !isOffline && onSelect(wh.id)}
            disabled={isOffline}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all duration-150',
              isSelected ? 'bg-[#1f5135] text-white shadow-sm'
                : isOffline ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
            )}
          >
            <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', cfg.dot,
              wh.status === 'alert' && !isSelected && 'animate-pulse'
            )} />
            {wh.id}
            {isOffline && <span className="text-[9px] font-medium opacity-60">offline</span>}
          </button>
        );
      })}

      <div className="flex-1 min-w-4" />

      {/* Time range */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {['1h', '6h', '24h'].map((t) => (
          <button key={t} onClick={() => onTimeRange(t)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150',
              timeRange === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >{t}</button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />

      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
        <span className="relative flex">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
        </span>
        Live
      </span>
      <span className="text-[11px] font-semibold text-gray-400 tabular-nums flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <LiveClock />
      </span>
    </div>
  );
}

// ─── Floor plan ───────────────────────────────────────────────────────────────

function FloorPlan({ warehouseId, viewMode }: { warehouseId: string; viewMode: ViewMode }) {
  const sensors: SensorPoint[] = sensorPositions[warehouseId] ?? defaultSensorPositions(warehouseId);
  const wh = monitorWarehouses.find((w) => w.id === warehouseId);
  const isOffline = wh?.status === 'offline';

  const zoneBoxes = [
    { x: 42,  y: 48,  w: 186, h: 114, idx: 0 },
    { x: 252, y: 48,  w: 186, h: 114, idx: 1 },
    { x: 42,  y: 168, w: 186, h: 76,  idx: 2 },
    { x: 252, y: 168, w: 186, h: 76,  idx: 3 },
  ];

  return (
    <div className="relative w-full bg-[#f8fafc] rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16/9', minHeight: 200 }}>
      <svg viewBox="0 0 480 270" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="fgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="0.4" />
          </pattern>
          <filter id="sglow"><feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="480" height="270" fill="url(#fgrid)" />
        {/* Building shell */}
        <rect x="28" y="22" width="424" height="230" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <polygon points="18,50 240,14 462,50" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Entrance */}
        <rect x="207" y="232" width="66" height="20" rx="2" fill="#cbd5e1" />
        <rect x="211" y="232" width="29" height="18" rx="1" fill="#94a3b8" />
        <rect x="243" y="232" width="29" height="18" rx="1" fill="#94a3b8" />
        <text x="240" y="263" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600" letterSpacing="1">ENTRANCE</text>

        {/* Zone boxes */}
        {zoneBoxes.map(({ x, y, w, h, idx }) => {
          const s = sensors[idx];
          if (!s) return null;
          const colors = isOffline
            ? { fill: '#f3f4f6', stroke: '#e5e7eb', text: '#9ca3af', pulse: '#d1d5db' }
            : getSensorColors(s, viewMode);
          return (
            <g key={idx}>
              <rect x={x} y={y} width={w} height={h} rx="4" fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" opacity={isOffline ? 0.5 : 1} />
              {/* Hatching pattern */}
              {!isOffline && Array.from({ length: Math.floor(w / 20) }).map((_, bi) =>
                Array.from({ length: Math.floor(h / 18) }).map((__, bj) => (
                  <rect key={`${bi}-${bj}`} x={x + 8 + bi * 20} y={y + 10 + bj * 18} width="11" height="8" rx="2" fill={colors.stroke} opacity="0.15" />
                ))
              )}
              {/* Bay label at top of zone */}
              {!isOffline && s.bay && (
                <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="8" fill={colors.text} fontWeight="700" letterSpacing="0.5" opacity="0.8">
                  {s.bay.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* Sensor markers */}
        {!isOffline && sensors.map((s, i) => {
          const colors = getSensorColors(s, viewMode);
          const needsPulse = s.status === 'critical' || s.status === 'warning';
          const displayVal = viewMode === 'humidity' ? `${s.humidity}%` : `${s.temp}°`;
          const subVal     = viewMode === 'humidity' ? `${s.temp}°C`    : `${s.humidity}%H`;
          return (
            <g key={i}>
              {needsPulse && (
                <circle cx={s.cx} cy={s.cy} r="16" fill={colors.pulse} opacity="0.2">
                  <animate attributeName="r" values="14;22;14" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Sensor circle */}
              <circle cx={s.cx} cy={s.cy} r="18" fill="white" stroke={colors.stroke} strokeWidth="2.5" filter="url(#sglow)" />
              {/* Primary value */}
              <text x={s.cx} y={s.cy - 2} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={colors.text} fontWeight="800">
                {displayVal}
              </text>
              {/* Secondary value */}
              <text x={s.cx} y={s.cy + 8} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#9ca3af" fontWeight="600">
                {subVal}
              </text>
              {/* Sensor ID below */}
              <text x={s.cx} y={s.cy + 28} textAnchor="middle" fontSize="7.5" fill="#6b7280" fontWeight="700">
                {s.id}
              </text>
            </g>
          );
        })}

        {/* Offline overlay */}
        {isOffline && (
          <>
            <rect x="28" y="22" width="424" height="230" rx="6" fill="#f8fafc" opacity="0.85" />
            <text x="240" y="128" textAnchor="middle" fontSize="14" fill="#9ca3af" fontWeight="700">OFFLINE</text>
            <text x="240" y="148" textAnchor="middle" fontSize="10" fill="#d1d5db">No signal received from sensors</text>
          </>
        )}

        {/* Compass */}
        <g transform="translate(454, 38)">
          <circle cx="0" cy="0" r="11" fill="white" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="-4" textAnchor="middle" fontSize="7" fill="#1f5135" fontWeight="800">N</text>
          <line x1="0" y1="-2" x2="0" y2="4" stroke="#1f5135" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <text x="42" y="263" fontSize="9.5" fill="#94a3b8" fontWeight="700" letterSpacing="0.5">{warehouseId}</text>
      </svg>
    </div>
  );
}

// ─── Metric bar (reading vs threshold) ───────────────────────────────────────

function MetricBar({ value, max, warn, critical }: { value: number; max: number; warn: number; critical: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= critical ? 'bg-red-400' : value >= warn ? 'bg-amber-400' : 'bg-green-400';
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Sensor reading card ──────────────────────────────────────────────────────

function SensorCard({ zone }: { zone: ZoneReading }) {
  const cfg = zoneCfg[zone.status];
  return (
    <div className={cn('rounded-xl ring-1 p-3.5 transition-all duration-150 hover:shadow-sm', cfg.bg, cfg.ring)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot,
            zone.status === 'critical' && 'animate-pulse'
          )} />
          <div className="min-w-0">
            <span className="text-[12px] font-bold text-gray-800">{zone.label}</span>
            <span className="text-[11px] text-gray-400 ml-1.5">· {zone.bay}</span>
          </div>
        </div>
        <span className={cn('text-[9.5px] font-bold px-1.5 py-[3px] rounded-full leading-none flex-shrink-0', cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      {zone.temp !== null ? (
        <div className="space-y-2">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-400">Temperature</span>
              <span className={cn('text-[12px] font-bold tabular-nums',
                zone.temp >= THRESHOLDS.temp.warning ? 'text-red-600'
                  : zone.temp >= THRESHOLDS.temp.good ? 'text-amber-700' : 'text-gray-800'
              )}>{zone.temp}°C</span>
            </div>
            <MetricBar value={zone.temp} max={40} warn={THRESHOLDS.temp.good} critical={THRESHOLDS.temp.warning} />
          </div>
          {/* Humidity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-400">Humidity</span>
              <span className={cn('text-[12px] font-bold tabular-nums',
                (zone.humidity ?? 0) >= THRESHOLDS.humidity.warning ? 'text-red-600'
                  : (zone.humidity ?? 0) >= THRESHOLDS.humidity.good ? 'text-amber-700' : 'text-gray-800'
              )}>{zone.humidity}%</span>
            </div>
            <MetricBar value={zone.humidity ?? 0} max={100} warn={THRESHOLDS.humidity.good} critical={THRESHOLDS.humidity.warning} />
          </div>
          {/* Moisture + CO2 row */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-white/70 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Moisture</p>
              <p className={cn('text-[12px] font-bold tabular-nums',
                (zone.moisture ?? 0) >= THRESHOLDS.moisture.warning ? 'text-red-600'
                  : (zone.moisture ?? 0) >= THRESHOLDS.moisture.good ? 'text-amber-700' : 'text-gray-800'
              )}>{zone.moisture}%</p>
            </div>
            <div className="flex-1 bg-white/70 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">CO₂</p>
              <p className="text-[12px] font-bold tabular-nums text-gray-700">{zone.co2} <span className="text-[9px] font-medium text-gray-400">ppm</span></p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-300 font-semibold text-center py-2">No signal from sensor</p>
      )}
    </div>
  );
}

// ─── Metric strip card ────────────────────────────────────────────────────────

function MetricCard({ m }: { m: typeof realtimeMetrics[number] }) {
  const isWarn = m.status === 'warning';
  return (
    <div className="bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className={cn('h-[3px]', isWarn ? 'bg-amber-400' : 'bg-green-400')} />
      <div className="p-3.5">
        <div className="flex items-start justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</span>
          <span className={cn('text-[9.5px] font-bold px-1.5 py-[2px] rounded-full', isWarn ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>
            {isWarn ? 'High' : 'OK'}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 mb-1">
          <span className="text-[22px] font-black text-gray-900 leading-none tabular-nums">{m.value}</span>
          <span className="text-[11px] font-semibold text-gray-400">{m.unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn('text-[9.5px] font-bold', m.up ? 'text-amber-600' : 'text-green-600')}>
            {m.up ? '↑' : '↓'} {m.change} vs 1h
          </span>
          <div className="w-14 flex-shrink-0">
            <SparklineChart values={m.sparkline} color={m.color} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity timeline ────────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div>
      {events.map((event, i) => {
        const cfg = activityCfg[event.type];
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0 pt-2">
              <span className={cn('w-2 h-2 rounded-full ring-2 ring-white flex-shrink-0', cfg.dot)} />
              {i < events.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-[12px] font-bold leading-tight', cfg.titleCls)}>{event.title}</p>
                <span className="text-[10px] text-gray-400 font-medium flex-shrink-0 mt-0.5">{event.time}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{event.description}</p>
              <span className="inline-block mt-1 text-[9.5px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{event.warehouse}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RealtimeMonitorPage() {
  const [selectedWH, setSelectedWH] = useState('WH-A');
  const [timeRange,  setTimeRange]   = useState('1h');
  const [viewMode,   setViewMode]    = useState<ViewMode>('status');

  const wh    = monitorWarehouses.find((w) => w.id === selectedWH);
  const zones = zoneData[selectedWH] ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={`Live sensor data · ${selectedWH} — ${wh?.name ?? ''} · ${zones.filter(z => z.status !== 'offline').length} sensors active`}
      />
      <MonitorBar
        selected={selectedWH} onSelect={setSelectedWH}
        timeRange={timeRange}  onTimeRange={setTimeRange}
      />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── Metric strip ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">System Averages — All Warehouses</p>
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
            {realtimeMetrics.map((m) => <MetricCard key={m.id} m={m} />)}
          </div>
        </section>

        {/* ── Floor Plan + Sensor Cards ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-5">

          {/* Floor plan */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{selectedWH} — Sensor Map</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">
                  Each circle = one sensor node · colors show {viewMode === 'temp' ? 'temperature' : viewMode === 'humidity' ? 'humidity' : 'overall status'}
                </p>
              </div>
              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
                {([
                  { mode: 'status'   as ViewMode, label: 'Status'      },
                  { mode: 'temp'     as ViewMode, label: 'Temp'        },
                  { mode: 'humidity' as ViewMode, label: 'Humidity'    },
                ] as const).map(({ mode, label }) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150',
                      viewMode === mode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                    )}
                  >{label}</button>
                ))}
              </div>
            </div>

            <FloorPlan warehouseId={selectedWH} viewMode={viewMode} />

            {/* Color legend — explains the threshold basis */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 p-3 bg-gray-50 rounded-xl ring-1 ring-gray-100">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Color Guide</span>
              {viewMode === 'status' ? (
                <>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Good — all readings normal</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Normal — slight elevation</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Warning — above safe range</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical — action required</span>
                </>
              ) : viewMode === 'temp' ? (
                <>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> &lt; {THRESHOLDS.temp.good}°C — Safe</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {THRESHOLDS.temp.good}–{THRESHOLDS.temp.warning}°C — Caution</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> ≥ {THRESHOLDS.temp.warning}°C — Critical</span>
                  <span className="text-[10px] text-gray-400 font-medium ml-auto">Safe limit: {THRESHOLDS.temp.warning}°C</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> &lt; {THRESHOLDS.humidity.good}% — Safe</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {THRESHOLDS.humidity.good}–{THRESHOLDS.humidity.warning}% — Caution</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> ≥ {THRESHOLDS.humidity.warning}% — Critical</span>
                  <span className="text-[10px] text-gray-400 font-medium ml-auto">Safe limit: {THRESHOLDS.humidity.warning}%</span>
                </>
              )}
            </div>

            {/* Quick stats */}
            {wh?.temp != null && (
              <div className="mt-3 grid grid-cols-4 gap-2.5">
                {[
                  { label: 'Avg Temp',     value: `${wh.temp}°C`,     bar: 'bg-amber-400' },
                  { label: 'Avg Humidity', value: `${wh.humidity}%`,  bar: 'bg-blue-400'  },
                  { label: 'Active Sensors',value: `${zones.filter(z => z.status !== 'offline').length}/${zones.length}`, bar: 'bg-green-400' },
                  { label: 'Last Update',  value: wh.lastUpdate,       bar: 'bg-gray-300'  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden">
                    <div className={cn('h-[2px]', s.bar)} />
                    <div className="px-3 py-2 text-center">
                      <p className="text-[14px] font-bold text-gray-800">{s.value}</p>
                      <p className="text-[9.5px] font-semibold text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sensor readings panel */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-3.5 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Sensor Readings</h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">Live values per sensor node — {selectedWH}</p>
            </div>

            <div className="flex-1 p-4 space-y-2.5 overflow-auto">
              {zones.map((zone) => <SensorCard key={zone.id} zone={zone} />)}
            </div>

            {/* Safe limits reference */}
            <div className="mx-4 mb-4 p-3.5 bg-gray-50 rounded-xl ring-1 ring-gray-100">
              <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Safe Operating Limits</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Temperature', safe: '< 27°C', warn: '27–30°C', crit: '≥ 30°C' },
                  { label: 'Humidity',    safe: '< 62%',  warn: '62–70%',  crit: '≥ 70%'  },
                  { label: 'Moisture',    safe: '< 13%',  warn: '13–14%',  crit: '≥ 14%'  },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-semibold w-20 flex-shrink-0">{t.label}</span>
                    <span className="text-[9.5px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{t.safe}</span>
                    <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{t.warn}</span>
                    <span className="text-[9.5px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{t.crit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Trends + Activity ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-5">

          {/* Parameter trends */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Parameter Trends</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">
                  % of max safe threshold · last {timeRange} · {selectedWH}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold">
                  <span className="w-4 h-1.5 rounded-full bg-amber-200 inline-block" /> Caution (75–90%)
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold">
                  <span className="w-4 h-1.5 rounded-full bg-red-200 inline-block" /> Critical (90%+)
                </span>
              </div>
            </div>
            <ParameterTrendsChart />
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-gray-100">
              {trendSeries.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                  <span className="text-[11px] font-bold text-gray-700 tabular-nums">
                    {realtimeMetrics.find((m) => m.id === s.key)?.value}{s.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-3.5 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Recent Activity</h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">Monitoring events · all warehouses</p>
            </div>
            <div className="flex-1 p-5 overflow-auto">
              <ActivityFeed events={recentActivity.slice(0, 6)} />
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
