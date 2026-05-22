'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ParameterTrendsChart } from '@/components/charts/ParameterTrendsChart';
import {
  monitorWarehouses,
  zoneData,
  sensorPositions,
  defaultSensorPositions,
  trendSeries,
  realtimeMetrics,
  type WarehouseOnlineStatus,
  type ZoneStatus,
  type ZoneReading,
  type SensorPoint,
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Safe thresholds for grain storage ────────────────────────────────────────

const T = {
  temp:     { safe: 27, warn: 30 },   // °C  — grain spoils quickly above 30°C
  humidity: { safe: 62, warn: 70 },   // %   — mold risk above 70%
  moisture: { safe: 13, warn: 14 },   // %   — grain moisture threshold
};

// ─── Configs ──────────────────────────────────────────────────────────────────

const whCfg: Record<WarehouseOnlineStatus, { dot: string; label: string }> = {
  online:  { dot: 'bg-green-400', label: 'Online'  },
  warning: { dot: 'bg-amber-400', label: 'Warning' },
  alert:   { dot: 'bg-red-400',   label: 'Alert'   },
  offline: { dot: 'bg-gray-300',  label: 'Offline' },
};

const statusCfg: Record<ZoneStatus, { dot: string; badge: string; label: string; rowBg: string }> = {
  good:     { dot: 'bg-green-400', badge: 'bg-green-50 text-green-700',  label: 'Good',     rowBg: '' },
  normal:   { dot: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-700',    label: 'Normal',   rowBg: '' },
  warning:  { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Warning',  rowBg: 'bg-amber-50/30' },
  critical: { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-600',     label: 'Critical', rowBg: 'bg-red-50/40' },
  offline:  { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400',   label: 'Offline',  rowBg: 'bg-gray-50/60' },
};

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = 'status' | 'temp' | 'humidity';

const viewModes: { mode: ViewMode; label: string }[] = [
  { mode: 'status',   label: 'Status'   },
  { mode: 'temp',     label: 'Temp'     },
  { mode: 'humidity', label: 'Humidity' },
];

const viewLegend: Record<ViewMode, Array<{ color: string; text: string }>> = {
  status: [
    { color: '#22c55e', text: 'Good — all within safe range' },
    { color: '#3b82f6', text: 'Normal — slight elevation' },
    { color: '#f59e0b', text: 'Warning — above safe limit' },
    { color: '#ef4444', text: 'Critical — immediate action' },
  ],
  temp: [
    { color: '#22c55e', text: `< ${T.temp.safe}°C — Safe` },
    { color: '#f59e0b', text: `${T.temp.safe}–${T.temp.warn}°C — Caution` },
    { color: '#ef4444', text: `≥ ${T.temp.warn}°C — Critical` },
  ],
  humidity: [
    { color: '#22c55e', text: `< ${T.humidity.safe}% — Safe` },
    { color: '#f59e0b', text: `${T.humidity.safe}–${T.humidity.warn}% — Caution` },
    { color: '#ef4444', text: `≥ ${T.humidity.warn}% — Critical` },
  ],
};

type SensorColorSet = { fill: string; stroke: string; text: string; pulse: string };

function getSensorColors(s: SensorPoint, mode: ViewMode): SensorColorSet {
  if (mode === 'temp') {
    if (s.temp >= T.temp.warn)  return { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' };
    if (s.temp >= T.temp.safe)  return { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' };
    return                               { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' };
  }
  if (mode === 'humidity') {
    if (s.humidity >= T.humidity.warn) return { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' };
    if (s.humidity >= T.humidity.safe) return { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' };
    return                                     { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' };
  }
  const map: Record<ZoneStatus, SensorColorSet> = {
    good:     { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d', pulse: '#4ade80' },
    normal:   { fill: '#dbeafe', stroke: '#3b82f6', text: '#1d4ed8', pulse: '#60a5fa' },
    warning:  { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309', pulse: '#fbbf24' },
    critical: { fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626', pulse: '#f87171' },
    offline:  { fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280', pulse: '#d1d5db' },
  };
  return map[s.status];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function valColor(val: number | null, safe: number, warn: number) {
  if (val === null) return 'text-gray-300';
  if (val >= warn)  return 'text-red-600';
  if (val >= safe)  return 'text-amber-700';
  return 'text-gray-800';
}

function avg(zones: ZoneReading[], key: keyof ZoneReading) {
  const active = zones.filter(z => z[key] !== null);
  if (!active.length) return null;
  const sum = active.reduce((s, z) => s + (z[key] as number), 0);
  return sum / active.length;
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning className="tabular-nums">{t}</span>;
}

// ─── Sub-header ───────────────────────────────────────────────────────────────

function MonitorBar({
  selected, onSelect, timeRange, onTimeRange,
}: {
  selected: string; onSelect: (id: string) => void;
  timeRange: string; onTimeRange: (t: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-1.5 flex-wrap">
      {monitorWarehouses.map((wh) => {
        const cfg    = whCfg[wh.status];
        const isSel  = selected === wh.id;
        const isOff  = wh.status === 'offline';
        return (
          <button key={wh.id} onClick={() => !isOff && onSelect(wh.id)} disabled={isOff}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all duration-150',
              isSel  ? 'bg-[#1f5135] text-white shadow-sm'
              : isOff ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
            )}
          >
            <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', cfg.dot,
              wh.status === 'alert' && !isSel && 'animate-pulse'
            )} />
            {wh.id}
            {isOff && <span className="text-[9px] font-normal opacity-50">off</span>}
          </button>
        );
      })}

      <div className="flex-1" />

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

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
        <span className="relative flex">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
        </span>
        Live
      </span>
      <span className="text-[11px] font-semibold text-gray-400 tabular-nums flex items-center gap-1 ml-1">
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
    { x: 42,  y: 50,  w: 186, h: 108, idx: 0 },
    { x: 252, y: 50,  w: 186, h: 108, idx: 1 },
    { x: 42,  y: 166, w: 186, h: 74,  idx: 2 },
    { x: 252, y: 166, w: 186, h: 74,  idx: 3 },
  ];

  return (
    <div className="w-full bg-[#f8fafc] rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16/9', minHeight: 190 }}>
      <svg viewBox="0 0 480 270" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="mg" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="0.4" />
          </pattern>
          <filter id="ms">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="480" height="270" fill="url(#mg)" />
        <rect x="28" y="24" width="424" height="226" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <polygon points="18,52 240,16 462,52" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="207" y="234" width="66" height="16" rx="2" fill="#cbd5e1" />
        <rect x="211" y="234" width="29" height="14" rx="1" fill="#94a3b8" />
        <rect x="243" y="234" width="29" height="14" rx="1" fill="#94a3b8" />
        <text x="240" y="262" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600" letterSpacing="1">ENTRANCE</text>

        {zoneBoxes.map(({ x, y, w, h, idx }) => {
          const s = sensors[idx];
          if (!s) return null;
          const c = isOffline ? { fill: '#f3f4f6', stroke: '#e5e7eb', text: '#9ca3af', pulse: '' } : getSensorColors(s, viewMode);
          return (
            <g key={idx}>
              <rect x={x} y={y} width={w} height={h} rx="4" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" opacity={isOffline ? 0.5 : 1} />
              {!isOffline && Array.from({ length: Math.floor(w / 20) }).map((_, bi) =>
                Array.from({ length: Math.floor(h / 18) }).map((__, bj) => (
                  <rect key={`${bi}-${bj}`} x={x + 7 + bi * 20} y={y + 10 + bj * 18} width="11" height="8" rx="2" fill={c.stroke} opacity="0.15" />
                ))
              )}
              {s.bay && (
                <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="8" fill={isOffline ? '#9ca3af' : c.text} fontWeight="700" letterSpacing="0.5" opacity="0.8">
                  {s.bay.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {!isOffline && sensors.map((s, i) => {
          const c = getSensorColors(s, viewMode);
          const needsPulse = s.status === 'critical' || s.status === 'warning';
          const primary = viewMode === 'humidity' ? `${s.humidity}%` : `${s.temp}°`;
          const secondary = viewMode === 'humidity' ? `${s.temp}°C` : `${s.humidity}%H`;
          return (
            <g key={i}>
              {needsPulse && (
                <circle cx={s.cx} cy={s.cy} r="18" fill={c.pulse} opacity="0.2">
                  <animate attributeName="r" values="15;23;15" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={s.cx} cy={s.cy} r="18" fill="white" stroke={c.stroke} strokeWidth="2.5" filter="url(#ms)" />
              <text x={s.cx} y={s.cy - 2} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={c.text} fontWeight="800">{primary}</text>
              <text x={s.cx} y={s.cy + 8} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#9ca3af" fontWeight="600">{secondary}</text>
              <text x={s.cx} y={s.cy + 28} textAnchor="middle" fontSize="7.5" fill="#6b7280" fontWeight="700">{s.id}</text>
            </g>
          );
        })}

        {isOffline && (
          <>
            <rect x="28" y="24" width="424" height="226" rx="6" fill="#f8fafc" opacity="0.85" />
            <text x="240" y="128" textAnchor="middle" fontSize="14" fill="#9ca3af" fontWeight="700">OFFLINE</text>
            <text x="240" y="148" textAnchor="middle" fontSize="10" fill="#d1d5db">No signal from sensors</text>
          </>
        )}

        <g transform="translate(454, 40)">
          <circle cx="0" cy="0" r="11" fill="white" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="-4" textAnchor="middle" fontSize="7" fill="#1f5135" fontWeight="800">N</text>
          <line x1="0" y1="-2" x2="0" y2="4" stroke="#1f5135" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <text x="42" y="263" fontSize="9.5" fill="#94a3b8" fontWeight="700">{warehouseId}</text>
      </svg>
    </div>
  );
}

// ─── Monitoring point table ───────────────────────────────────────────────────

function MonitoringTable({ zones }: { zones: ZoneReading[] }) {
  if (!zones.length) return <p className="text-[12px] text-gray-400 py-4 text-center">No monitoring points configured.</p>;
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-100">
      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_68px_68px_68px_70px] gap-x-2 items-center px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
        {['Point', 'Location', 'Temp', 'Humidity', 'Moisture', 'Status'].map((h) => (
          <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {/* Rows */}
      {zones.map((zone, i) => {
        const cfg = statusCfg[zone.status];
        return (
          <div
            key={zone.id}
            className={cn(
              'grid grid-cols-[80px_1fr_68px_68px_68px_70px] gap-x-2 items-center px-3.5 py-3',
              i < zones.length - 1 && 'border-b border-gray-100',
              cfg.rowBg,
            )}
          >
            {/* ID */}
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot,
                zone.status === 'critical' && 'animate-pulse'
              )} />
              <span className="text-[12px] font-bold text-gray-600 font-mono">{zone.id}</span>
            </div>
            {/* Location */}
            <span className="text-[12px] font-medium text-gray-700 truncate">{zone.bay}</span>
            {/* Temperature */}
            <span className={cn('text-[12.5px] font-bold tabular-nums', valColor(zone.temp, T.temp.safe, T.temp.warn))}>
              {zone.temp != null ? `${zone.temp}°C` : '—'}
            </span>
            {/* Humidity */}
            <span className={cn('text-[12.5px] font-bold tabular-nums', valColor(zone.humidity, T.humidity.safe, T.humidity.warn))}>
              {zone.humidity != null ? `${zone.humidity}%` : '—'}
            </span>
            {/* Moisture */}
            <span className={cn('text-[12.5px] font-bold tabular-nums', valColor(zone.moisture, T.moisture.safe, T.moisture.warn))}>
              {zone.moisture != null ? `${zone.moisture}%` : '—'}
            </span>
            {/* Status */}
            <span className={cn('text-[10px] font-bold px-1.5 py-[3px] rounded-full leading-none inline-flex items-center gap-1', cfg.badge)}>
              {cfg.label}
            </span>
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
  const active = zones.filter(z => z.status !== 'offline');

  // Compute per-warehouse stats
  const avgTemp     = avg(zones, 'temp');
  const avgHumidity = avg(zones, 'humidity');
  const avgMoisture = avg(zones, 'moisture');
  const critCount   = zones.filter(z => z.status === 'critical').length;
  const warnCount   = zones.filter(z => z.status === 'warning').length;

  const legend = viewLegend[viewMode];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={`Live sensor data · ${selectedWH} — ${wh?.name ?? ''} · ${active.length}/${zones.length} points active`}
      />
      <MonitorBar
        selected={selectedWH} onSelect={setSelectedWH}
        timeRange={timeRange}  onTimeRange={setTimeRange}
      />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── WH stats strip ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Avg Temperature',
              value: avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : '—',
              bar: 'bg-amber-400',
              status: avgTemp !== null && avgTemp >= T.temp.warn ? 'critical' : avgTemp !== null && avgTemp >= T.temp.safe ? 'warning' : 'good',
            },
            {
              label: 'Avg Humidity',
              value: avgHumidity !== null ? `${Math.round(avgHumidity)}%` : '—',
              bar: 'bg-blue-400',
              status: avgHumidity !== null && avgHumidity >= T.humidity.warn ? 'critical' : avgHumidity !== null && avgHumidity >= T.humidity.safe ? 'warning' : 'good',
            },
            {
              label: 'Avg Moisture',
              value: avgMoisture !== null ? `${avgMoisture.toFixed(1)}%` : '—',
              bar: 'bg-green-400',
              status: avgMoisture !== null && avgMoisture >= T.moisture.warn ? 'critical' : avgMoisture !== null && avgMoisture >= T.moisture.safe ? 'warning' : 'good',
            },
            {
              label: 'Alert Status',
              value: critCount > 0 ? `${critCount} Critical` : warnCount > 0 ? `${warnCount} Warning` : 'All Clear',
              bar: critCount > 0 ? 'bg-red-400' : warnCount > 0 ? 'bg-amber-400' : 'bg-green-400',
              status: critCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'good',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden">
              <div className={cn('h-[3px]', s.bar)} />
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                  <p className={cn(
                    'text-[20px] font-black tracking-tight leading-none tabular-nums',
                    s.status === 'critical' ? 'text-red-600' : s.status === 'warning' ? 'text-amber-700' : 'text-green-600',
                  )}>{s.value}</p>
                </div>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  s.status === 'critical' ? 'bg-red-50' : s.status === 'warning' ? 'bg-amber-50' : 'bg-green-50',
                )}>
                  {s.status === 'critical' || s.status === 'warning' ? (
                    <svg className={cn('w-4 h-4', s.status === 'critical' ? 'text-red-500' : 'text-amber-500')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Floor plan + Monitoring table ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_460px] gap-5">

          {/* Floor plan */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            {/* Header row with view toggle */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{selectedWH} — Sensor Map</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Each circle = one monitoring point · {wh?.lastUpdate && `updated ${wh.lastUpdate}`}</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
                {viewModes.map(({ mode, label }) => (
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

            {/* Compact inline legend — immediately below the map */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                {viewMode === 'temp' ? 'Temperature scale:' : viewMode === 'humidity' ? 'Humidity scale:' : 'Status colors:'}
              </span>
              {legend.map((l) => (
                <span key={l.text} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                  {l.text}
                </span>
              ))}
            </div>
          </div>

          {/* Monitoring points panel */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-3.5 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Monitoring Points</h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                Live readings · each point = one sensor cluster at a fixed location
              </p>
            </div>

            <div className="flex-1 p-4">
              <MonitoringTable zones={zones} />
            </div>

            {/* Safe limits — compact, inside the panel */}
            <div className="px-4 pb-4">
              <div className="p-3 bg-gray-50 rounded-xl ring-1 ring-gray-100">
                <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest mb-2">Safe Limits</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {[
                    { param: 'Temp',     safe: `< ${T.temp.safe}°C`,     warn: `${T.temp.safe}–${T.temp.warn}°C`, crit: `≥ ${T.temp.warn}°C` },
                    { param: 'Humidity', safe: `< ${T.humidity.safe}%`,  warn: `${T.humidity.safe}–${T.humidity.warn}%`, crit: `≥ ${T.humidity.warn}%` },
                    { param: 'Moisture', safe: `< ${T.moisture.safe}%`,  warn: `${T.moisture.safe}–${T.moisture.warn}%`, crit: `≥ ${T.moisture.warn}%` },
                  ].map((r) => (
                    <div key={r.param} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-500 w-14">{r.param}</span>
                      <span className="text-[9.5px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{r.safe}</span>
                      <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{r.warn}</span>
                      <span className="text-[9.5px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{r.crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Parameter Trends (full width) ─────────────────────────────────── */}
        <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Parameter Trends</h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                Reading as % of max safe threshold · last {timeRange} · {selectedWH}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10.5px] font-semibold text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-2 rounded-sm bg-amber-100 inline-block border border-amber-200" /> 75–90% — Caution zone
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-2 rounded-sm bg-red-100 inline-block border border-red-200" /> 90%+ — Critical zone
              </span>
            </div>
          </div>

          <ParameterTrendsChart />

          {/* Trend legend */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-3 border-t border-gray-100">
            {trendSeries.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                <span className="text-[11px] font-bold text-gray-700 tabular-nums">
                  {realtimeMetrics.find((m) => m.id === s.key)?.value}{s.unit}
                </span>
                <span className="text-[10px] text-gray-400">/ {s.threshold}{s.unit} max</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
