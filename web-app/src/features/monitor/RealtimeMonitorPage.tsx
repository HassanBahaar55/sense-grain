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
} from './mockData';
import { cn } from '@/lib/utils';

// ─── Status configs ───────────────────────────────────────────────────────────

const whStatusCfg: Record<WarehouseOnlineStatus, { dot: string; badge: string; label: string }> = {
  online:  { dot: 'bg-green-400', badge: 'bg-green-50 text-green-700',  label: 'Online'  },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700',  label: 'Warning' },
  alert:   { dot: 'bg-red-400',   badge: 'bg-red-50 text-red-600',      label: 'Alert'   },
  offline: { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400',   label: 'Offline' },
};

const zoneCfg: Record<ZoneStatus, { dot: string; bg: string; ring: string; badge: string; label: string }> = {
  good:     { dot: 'bg-green-400', bg: '',                 ring: 'ring-gray-100',   badge: 'bg-green-50 text-green-700',  label: 'Good'     },
  normal:   { dot: 'bg-blue-400',  bg: '',                 ring: 'ring-gray-100',   badge: 'bg-blue-50 text-blue-600',    label: 'Normal'   },
  warning:  { dot: 'bg-amber-400', bg: 'bg-amber-50/50',   ring: 'ring-amber-100',  badge: 'bg-amber-100 text-amber-700', label: 'Warning'  },
  critical: { dot: 'bg-red-400',   bg: 'bg-red-50/50',     ring: 'ring-red-100',    badge: 'bg-red-100 text-red-600',     label: 'Critical' },
  offline:  { dot: 'bg-gray-300',  bg: 'bg-gray-50',       ring: 'ring-gray-100',   badge: 'bg-gray-100 text-gray-400',   label: 'Offline'  },
};

const sensorColorMap: Record<ZoneStatus, { fill: string; stroke: string; pulse: string; text: string }> = {
  good:     { fill: '#dcfce7', stroke: '#22c55e', pulse: '#4ade80', text: '#15803d' },
  normal:   { fill: '#dbeafe', stroke: '#3b82f6', pulse: '#60a5fa', text: '#1d4ed8' },
  warning:  { fill: '#fef3c7', stroke: '#f59e0b', pulse: '#fbbf24', text: '#b45309' },
  critical: { fill: '#fee2e2', stroke: '#ef4444', pulse: '#f87171', text: '#dc2626' },
  offline:  { fill: '#f3f4f6', stroke: '#9ca3af', pulse: '#d1d5db', text: '#6b7280' },
};

const activityCfg: Record<ActivityEvent['type'], { dot: string; title: string }> = {
  alert:   { dot: 'bg-red-400',   title: 'text-red-700'   },
  warning: { dot: 'bg-amber-400', title: 'text-amber-700' },
  info:    { dot: 'bg-blue-400',  title: 'text-gray-800'  },
  success: { dot: 'bg-green-400', title: 'text-gray-800'  },
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
  selected,
  onSelect,
  timeRange,
  onTimeRange,
}: {
  selected: string;
  onSelect: (id: string) => void;
  timeRange: string;
  onTimeRange: (t: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-3 flex-wrap">
      {/* Warehouse tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {monitorWarehouses.map((wh) => {
          const cfg = whStatusCfg[wh.status];
          const isSelected = selected === wh.id;
          return (
            <button
              key={wh.id}
              onClick={() => onSelect(wh.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all duration-150',
                isSelected
                  ? 'bg-[#1f5135] text-white shadow-sm'
                  : wh.status === 'offline'
                  ? 'text-gray-300 hover:bg-gray-50 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
              )}
              disabled={wh.status === 'offline'}
            >
              <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', cfg.dot,
                wh.status === 'alert' && !isSelected && 'animate-pulse'
              )} />
              {wh.id}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-4" />

      {/* Time range */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {['1h', '6h', '24h'].map((t) => (
          <button
            key={t}
            onClick={() => onTimeRange(t)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150',
              timeRange === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

      {/* Clock + live */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
          <span className="relative flex">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-60" />
          </span>
          Live
        </span>
        <span className="text-[11.5px] font-semibold text-gray-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <LiveClock />
        </span>
      </div>
    </div>
  );
}

// ─── Warehouse floor plan ─────────────────────────────────────────────────────

function FloorPlan({ warehouseId }: { warehouseId: string }) {
  const sensors = sensorPositions[warehouseId] ?? defaultSensorPositions(warehouseId);
  const wh = monitorWarehouses.find((w) => w.id === warehouseId);
  const isOffline = wh?.status === 'offline';

  return (
    <div className="relative w-full bg-[#f8fafc] rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16/9', minHeight: 200 }}>
      <svg viewBox="0 0 480 270" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
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
        <rect x="28" y="22" width="424" height="226" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <polygon points="18,48 240,14 462,48" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="210" y="230" width="60" height="18" rx="2" fill="#cbd5e1" />
        <rect x="214" y="230" width="27" height="16" rx="1" fill="#94a3b8" />
        <rect x="243" y="230" width="27" height="16" rx="1" fill="#94a3b8" />
        <text x="240" y="265" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">ENTRANCE</text>

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
              <rect x={x} y={y} width={w} height={h} rx="4" fill={isOffline ? '#f3f4f6' : colors.fill} stroke={isOffline ? '#e5e7eb' : colors.stroke} strokeWidth="1.5" opacity={isOffline ? 0.5 : 1} />
              {!isOffline && Array.from({ length: Math.floor(w / 22) }).map((_, bi) =>
                Array.from({ length: Math.floor(h / 20) }).map((__, bj) => (
                  <rect key={`${bi}-${bj}`} x={x + 10 + bi * 22} y={y + 10 + bj * 20} width="12" height="10" rx="2" fill={colors.stroke} opacity="0.18" />
                ))
              )}
              <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize="8.5" fill={isOffline ? '#9ca3af' : colors.text} fontWeight="700" letterSpacing="0.3">
                {label.split(' · ')[0]}
              </text>
            </g>
          );
        })}

        {!isOffline && sensors.map((s, i) => {
          const colors = sensorColorMap[s.status];
          return (
            <g key={i}>
              {(s.status === 'critical' || s.status === 'warning') && (
                <circle cx={s.cx} cy={s.cy} r="16" fill={colors.pulse} opacity="0.2">
                  <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={s.cx} cy={s.cy} r="14" fill="white" stroke={colors.stroke} strokeWidth="2.5" filter="url(#glow)" />
              <text x={s.cx} y={s.cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={colors.text} fontWeight="800">
                {s.temp.toFixed(1)}°
              </text>
              <text x={s.cx} y={s.cy + 22} textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="600">{s.zone}</text>
            </g>
          );
        })}

        {isOffline && (
          <>
            <rect x="28" y="22" width="424" height="226" rx="6" fill="#f8fafc" opacity="0.8" />
            <text x="240" y="130" textAnchor="middle" fontSize="14" fill="#9ca3af" fontWeight="700">OFFLINE</text>
            <text x="240" y="150" textAnchor="middle" fontSize="10" fill="#d1d5db">No signal from sensors</text>
          </>
        )}

        {/* Compass */}
        <g transform="translate(446, 38)">
          <circle cx="0" cy="0" r="12" fill="white" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="-5" textAnchor="middle" fontSize="7" fill="#1f5135" fontWeight="800">N</text>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#1f5135" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <text x="44" y="265" fontSize="10" fill="#94a3b8" fontWeight="700">{warehouseId}</text>
      </svg>
    </div>
  );
}

// ─── Zone card ────────────────────────────────────────────────────────────────

function ZoneCard({ zone }: { zone: ZoneReading }) {
  const cfg = zoneCfg[zone.status];
  const zoneName = zone.label.includes('—') ? zone.label.split('—')[1].trim() : zone.label;

  return (
    <div className={cn('rounded-xl ring-1 p-3.5 hover:shadow-sm transition-shadow duration-150', cfg.bg || 'bg-white', cfg.ring)}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot,
            zone.status === 'critical' && 'animate-pulse'
          )} />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-gray-400">{zone.id}</span>
            <span className="text-[11px] text-gray-400 mx-1">·</span>
            <span className="text-[11.5px] font-bold text-gray-800">{zoneName}</span>
          </div>
        </div>
        <span className={cn('text-[9.5px] font-bold px-1.5 py-[3px] rounded-full leading-none flex-shrink-0 ml-2', cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      {zone.temp !== null ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Temp',   val: `${zone.temp}°C`,     warn: zone.status === 'critical' },
            { label: 'Hum.',   val: `${zone.humidity}%`,  warn: zone.status === 'warning' || zone.status === 'critical' },
            { label: 'Moist.', val: `${zone.moisture}%`,  warn: false },
          ].map((m) => (
            <div key={m.label} className="bg-white/70 rounded-lg py-1.5 px-1 text-center">
              <p className="text-[9px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">{m.label}</p>
              <p className={cn('text-[12px] font-bold tabular-nums leading-none', m.warn ? 'text-red-600' : 'text-gray-800')}>
                {m.val}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-300 font-medium text-center py-2">No signal</p>
      )}
    </div>
  );
}

// ─── Metric strip card ────────────────────────────────────────────────────────

function MetricCard({ m }: { m: typeof realtimeMetrics[number] }) {
  const isWarning = m.status === 'warning';
  return (
    <div className={cn(
      'bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden',
      'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default group',
    )}>
      <div className={cn('h-[3px]', isWarning ? 'bg-amber-400' : 'bg-green-400')} />
      <div className="p-3.5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{m.label}</span>
          <span className={cn(
            'text-[9.5px] font-bold px-1.5 py-[2px] rounded-full leading-none flex-shrink-0',
            isWarning ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700',
          )}>
            {isWarning ? 'High' : 'OK'}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 mb-1.5">
          <span className="text-[22px] font-black text-gray-900 leading-none tabular-nums">{m.value}</span>
          <span className="text-[11px] font-semibold text-gray-400">{m.unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn('text-[9.5px] font-bold', m.up ? 'text-amber-600' : 'text-green-600')}>
            {m.up ? '↑' : '↓'} {m.change}
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
    <div className="space-y-0">
      {events.map((event, i) => {
        const cfg = activityCfg[event.type];
        return (
          <div key={event.id} className="flex gap-3 group">
            {/* Timeline line */}
            <div className="flex flex-col items-center flex-shrink-0 pt-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white', cfg.dot)} />
              {i < events.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />}
            </div>
            {/* Content */}
            <div className={cn('flex-1 min-w-0 pb-3', i === events.length - 1 ? '' : '')}>
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className={cn('text-[12px] font-bold leading-tight', cfg.title)}>{event.title}</p>
                <span className="text-[10px] text-gray-400 font-medium flex-shrink-0 mt-0.5">{event.time}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{event.description}</p>
              <span className="inline-block mt-1 text-[9.5px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                {event.warehouse}
              </span>
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
  const [timeRange, setTimeRange]   = useState('1h');
  const selectedData = monitorWarehouses.find((w) => w.id === selectedWH);
  const zones = zoneData[selectedWH] ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={`Live sensor data · ${selectedWH} — ${selectedData?.name ?? ''}`}
      />
      <MonitorBar
        selected={selectedWH}
        onSelect={setSelectedWH}
        timeRange={timeRange}
        onTimeRange={setTimeRange}
      />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── Metric strip ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-3 xl:grid-cols-6 gap-3">
          {realtimeMetrics.map((m) => <MetricCard key={m.id} m={m} />)}
        </section>

        {/* ── Main: Floor Plan + Zone Cards ────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5">

          {/* Floor plan */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{selectedWH} — Floor Plan</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Temperature sensors · real-time positions</p>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Good',     color: '#22c55e' },
                  { label: 'Normal',   color: '#3b82f6' },
                  { label: 'Warning',  color: '#f59e0b' },
                  { label: 'Critical', color: '#ef4444' },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            <FloorPlan warehouseId={selectedWH} />

            {/* Quick stats below floor plan */}
            {selectedData?.temp != null && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Avg Temp',     value: `${selectedData.temp}°C`,     accent: 'bg-amber-400' },
                  { label: 'Avg Humidity', value: `${selectedData.humidity}%`,  accent: 'bg-blue-400'  },
                  { label: 'Active Zones', value: `${selectedData.zoneCount}`,  accent: 'bg-green-400' },
                  { label: 'Last Update',  value: selectedData.lastUpdate,      accent: 'bg-gray-300'  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden">
                    <div className={cn('h-[2px]', stat.accent)} />
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-[14px] font-bold text-gray-800 tabular-nums">{stat.value}</p>
                      <p className="text-[9.5px] font-semibold text-gray-400 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone readings */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Zone Readings</h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">{selectedWH} · live values</p>
            </div>

            <div className="flex-1 p-4 space-y-2.5">
              {zones.map((zone) => <ZoneCard key={zone.id} zone={zone} />)}
            </div>

            {/* Threshold reference */}
            <div className="mx-4 mb-4 p-3.5 bg-gray-50 rounded-xl ring-1 ring-gray-100">
              <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Safe Thresholds</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Temperature', value: '< 30°C'   },
                  { label: 'Humidity',    value: '< 70%'    },
                  { label: 'Moisture',    value: '< 14%'    },
                  { label: 'CO₂',         value: '< 800 ppm'},
                ].map((t) => (
                  <div key={t.label} className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-gray-400 font-medium">{t.label}</span>
                    <span className="text-[10.5px] text-gray-700 font-bold">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Trends + Activity ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5">

          {/* Parameter trends */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Parameter Trends</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">
                  % of safety threshold · last {timeRange} · {selectedWH}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
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
                    {realtimeMetrics.find((m) => m.id === s.key)?.value}
                    {s.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Monitoring events · all warehouses</p>
              </div>
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
