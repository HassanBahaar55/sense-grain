'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useWarehouses, type ManagedWarehouse } from '@/lib/storageManagement';
import { cn } from '@/lib/utils';

// ─── Safe thresholds (always in °C internally) ────────────────────────────────

const T = {
  temp:     { safe: 27, warn: 30 },
  humidity: { safe: 62, warn: 70 },
  moisture: { safe: 13, warn: 14 },
};

// ─── Temperature unit hook ────────────────────────────────────────────────────

function useTempUnit() {
  const [unit, setUnit] = useState<'°C' | '°F' | 'K'>('°C');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sg-preferences');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.tempUnit === '°F' || p.tempUnit === 'K') setUnit(p.tempUnit);
      }
    } catch {}
  }, []);
  return unit;
}

function convertTemp(c: number, unit: '°C' | '°F' | 'K'): string {
  if (unit === '°F') return `${((c * 9 / 5) + 32).toFixed(1)}°F`;
  if (unit === 'K')  return `${(c + 273.15).toFixed(1)} K`;
  return `${c}°C`;
}

function tempThreshold(c: number, unit: '°C' | '°F' | 'K'): string {
  return `< ${convertTemp(c, unit)}`;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const whCfg: Record<WarehouseOnlineStatus, { dot: string; label: string; badge: string }> = {
  online:  { dot: 'bg-green-400', label: 'Online',  badge: 'bg-green-50 text-green-700' },
  warning: { dot: 'bg-amber-400', label: 'Warning', badge: 'bg-amber-50 text-amber-700' },
  alert:   { dot: 'bg-red-400',   label: 'Alert',   badge: 'bg-red-50 text-red-700'     },
  offline: { dot: 'bg-gray-300',  label: 'Offline', badge: 'bg-gray-100 text-gray-400'  },
};

const statusCfg: Record<ZoneStatus, { dot: string; badge: string; label: string; rowBg: string }> = {
  good:     { dot: 'bg-green-400', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   label: 'Good',     rowBg: '' },
  normal:   { dot: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       label: 'Elevated', rowBg: '' },
  warning:  { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   label: 'Warning',  rowBg: 'bg-amber-50/30' },
  critical: { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',         label: 'Critical', rowBg: 'bg-red-50/30' },
  offline:  { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',     label: 'Offline',  rowBg: '' },
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
    { color: '#22c55e', text: 'Good — all safe' },
    { color: '#3b82f6', text: 'Elevated — slightly above safe' },
    { color: '#f59e0b', text: 'Warning — approaching limit' },
    { color: '#ef4444', text: 'Critical — needs attention' },
  ],
  temp: [
    { color: '#22c55e', text: `Safe (< ${T.temp.safe}°C)` },
    { color: '#f59e0b', text: `Elevated (${T.temp.safe}–${T.temp.warn}°C)` },
    { color: '#ef4444', text: `Critical (≥ ${T.temp.warn}°C)` },
  ],
  humidity: [
    { color: '#22c55e', text: `Safe (< ${T.humidity.safe}%)` },
    { color: '#f59e0b', text: `Elevated (${T.humidity.safe}–${T.humidity.warn}%)` },
    { color: '#ef4444', text: `Critical (≥ ${T.humidity.warn}%)` },
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
  if (val >= safe)  return 'text-amber-600';
  return 'text-gray-800';
}

function avg(zones: ZoneReading[], key: keyof ZoneReading) {
  const active = zones.filter(z => z[key] !== null);
  if (!active.length) return null;
  return active.reduce((s, z) => s + (z[key] as number), 0) / active.length;
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

// ─── Warehouse dropdown ────────────────────────────────────────────────────────

function WarehouseDropdown({
  selected, onSelect, firestoreWarehouses,
}: {
  selected: string;
  onSelect: (id: string) => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const mockWh = monitorWarehouses.find((w) => w.id === selected);
  const fsWh   = firestoreWarehouses.find((w) => w.id === selected);
  const displayName = mockWh?.name ?? fsWh?.name ?? selected;
  const displayStatus: WarehouseOnlineStatus = mockWh?.status ?? (fsWh?.status === 'active' ? 'online' : 'offline');
  const cfg = whCfg[displayStatus];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-800 transition-all duration-150 select-none min-w-[160px]"
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot, displayStatus === 'alert' && 'animate-pulse')} />
        <span className="flex-1 text-left truncate max-w-[140px]">{displayName}</span>
        <svg className={cn('w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl ring-1 ring-black/[0.08] shadow-xl z-30 min-w-[240px] p-1.5">
          {/* User-created Firestore warehouses */}
          {firestoreWarehouses.length > 0 && (
            <>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5">Your Warehouses</p>
              {firestoreWarehouses.map((w) => {
                const isSel = w.id === selected;
                const isActive = w.status === 'active';
                const hasLive  = !!w.liveEngineId;
                return (
                  <button
                    key={w.id}
                    onClick={() => { onSelect(w.id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                      isSel ? 'bg-[#1f5135]/[0.08] text-[#1f5135]' : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', isActive && hasLive ? 'bg-green-400' : 'bg-gray-300')} />
                    <span className="flex-1 truncate">{w.name}</span>
                    <span className={cn('text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', hasLive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400')}>
                      {hasLive ? 'Connected' : 'No data'}
                    </span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-gray-100" />
            </>
          )}

          {/* Simulated / demo warehouses */}
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5">Simulated</p>
          {monitorWarehouses.map((w) => {
            const c = whCfg[w.status];
            const isOff = w.status === 'offline';
            const isSel = w.id === selected;
            return (
              <button
                key={w.id}
                disabled={isOff}
                onClick={() => { onSelect(w.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                  isSel   ? 'bg-[#1f5135]/[0.08] text-[#1f5135]'
                  : isOff ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                <span className="flex-1 truncate">{w.name}</span>
                <span className={cn('text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', c.badge)}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-header bar ───────────────────────────────────────────────────────────

function MonitorBar({
  selected, onSelect,
  viewMode, onViewMode,
  timeRange, onTimeRange,
  firestoreWarehouses,
}: {
  selected: string; onSelect: (id: string) => void;
  viewMode: ViewMode; onViewMode: (m: ViewMode) => void;
  timeRange: string; onTimeRange: (t: string) => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
      {/* Warehouse dropdown */}
      <WarehouseDropdown selected={selected} onSelect={onSelect} firestoreWarehouses={firestoreWarehouses} />

      <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

      {/* Color view toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">Map color:</span>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {viewModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onViewMode(mode)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150',
                viewMode === mode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Time range */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
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

      <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

      {/* Live indicator */}
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 flex-shrink-0">
        <span className="relative flex">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
        </span>
        Live
      </span>
      <span className="text-[11px] font-semibold text-gray-400 tabular-nums flex items-center gap-1 flex-shrink-0">
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <LiveClock />
      </span>
    </div>
  );
}

// ─── Floor plan SVG ───────────────────────────────────────────────────────────

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
    <div className="w-full campus-svg bg-[#f8fafc] rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16/9', minHeight: 190 }}>
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
          return (
            <g key={i}>
              {needsPulse && (
                <circle cx={s.cx} cy={s.cy} r="18" fill={c.pulse} opacity="0.2">
                  <animate attributeName="r" values="15;23;15" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={s.cx} cy={s.cy} r="14" fill="white" stroke={c.stroke} strokeWidth="2.5" filter="url(#ms)" />
              <text x={s.cx} y={s.cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={c.text} fontWeight="800">{s.id}</text>
              <text x={s.cx} y={s.cy + 24} textAnchor="middle" fontSize="7" fill="#6b7280" fontWeight="600">{s.bay}</text>
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

// ─── Sensor readings table ────────────────────────────────────────────────────

function SensorTable({ zones, tempUnit }: { zones: ZoneReading[]; tempUnit: '°C' | '°F' | 'K' }) {
  if (!zones.length) return (
    <p className="text-[12px] text-gray-400 py-6 text-center">No sensors configured.</p>
  );

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-100">
      {/* Header */}
      <div className="grid grid-cols-[28px_minmax(0,1fr)_60px_50px_56px_58px] gap-x-2 px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
        {['', 'Zone', 'Temp', 'Hum', 'Moist', 'Status'].map((h) => (
          <span key={h} className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {/* Rows */}
      {zones.map((zone, i) => {
        const cfg = statusCfg[zone.status];
        return (
          <div
            key={zone.id}
            className={cn(
              'grid grid-cols-[28px_minmax(0,1fr)_60px_50px_56px_58px] gap-x-2 items-center px-3.5 py-2.5',
              i < zones.length - 1 && 'border-b border-gray-50',
              cfg.rowBg,
            )}
          >
            <span className={cn('w-2 h-2 rounded-full mx-auto flex-shrink-0', cfg.dot,
              zone.status === 'critical' && 'animate-pulse'
            )} />
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-gray-800 truncate">{zone.id} <span className="font-medium text-gray-400 text-[10px]">·</span> <span className="text-[11px] font-medium text-gray-500">{zone.bay}</span></p>
            </div>
            <span className={cn('text-[11.5px] font-bold tabular-nums', valColor(zone.temp, T.temp.safe, T.temp.warn))}>
              {zone.temp != null ? convertTemp(zone.temp, tempUnit) : '—'}
            </span>
            <span className={cn('text-[11.5px] font-bold tabular-nums', valColor(zone.humidity, T.humidity.safe, T.humidity.warn))}>
              {zone.humidity != null ? `${zone.humidity}%` : '—'}
            </span>
            <span className={cn('text-[11.5px] font-bold tabular-nums', valColor(zone.moisture, T.moisture.safe, T.moisture.warn))}>
              {zone.moisture != null ? `${zone.moisture}%` : '—'}
            </span>
            <span className={cn('text-[9.5px] font-bold px-1.5 py-[3px] rounded-full leading-none text-center', cfg.badge)}>
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
  const tempUnit = useTempUnit();
  const { warehouses: firestoreWarehouses } = useWarehouses();

  // Determine if the selected ID is a user-created Firestore warehouse
  const selectedFsWh   = firestoreWarehouses.find((w) => w.id === selectedWH);
  // If Firestore warehouse has a liveEngineId, use that mock data; otherwise empty
  const effectiveMockId = selectedFsWh ? (selectedFsWh.liveEngineId ?? '') : selectedWH;
  const isFsWithNoData  = !!selectedFsWh && !selectedFsWh.liveEngineId;

  const wh          = monitorWarehouses.find((w) => w.id === effectiveMockId);
  const displayName = selectedFsWh?.name ?? wh?.name ?? selectedWH;
  const zones        = isFsWithNoData ? [] : (zoneData[effectiveMockId] ?? []);
  const active       = zones.filter((z) => z.status !== 'offline');
  const avgTemp      = avg(zones, 'temp');
  const avgHumidity  = avg(zones, 'humidity');
  const avgMoisture  = avg(zones, 'moisture');
  const critCount    = zones.filter((z) => z.status === 'critical').length;
  const warnCount    = zones.filter((z) => z.status === 'warning').length;
  const legend       = viewLegend[viewMode];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={isFsWithNoData
          ? `${displayName} · No sensor data — connect a Live Engine ID in Settings`
          : `${displayName} · ${active.length} of ${zones.length} sensors active`
        }
      />

      <MonitorBar
        selected={selectedWH} onSelect={setSelectedWH}
        viewMode={viewMode}   onViewMode={setViewMode}
        timeRange={timeRange}  onTimeRange={setTimeRange}
        firestoreWarehouses={firestoreWarehouses}
      />

      <main className="flex-1 p-5 space-y-4 overflow-auto">

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Avg Temperature',
              value: avgTemp !== null ? convertTemp(avgTemp, tempUnit) : '—',
              bar: 'bg-amber-400',
              status: avgTemp !== null && avgTemp >= T.temp.warn ? 'critical' : avgTemp !== null && avgTemp >= T.temp.safe ? 'warning' : 'good',
              tip: `Safe ${tempThreshold(T.temp.safe, tempUnit)}`,
            },
            {
              label: 'Avg Humidity',
              value: avgHumidity !== null ? `${Math.round(avgHumidity)}%` : '—',
              bar: 'bg-blue-400',
              status: avgHumidity !== null && avgHumidity >= T.humidity.warn ? 'critical' : avgHumidity !== null && avgHumidity >= T.humidity.safe ? 'warning' : 'good',
              tip: `Safe < ${T.humidity.safe}%`,
            },
            {
              label: 'Avg Moisture',
              value: avgMoisture !== null ? `${avgMoisture.toFixed(1)}%` : '—',
              bar: 'bg-green-400',
              status: avgMoisture !== null && avgMoisture >= T.moisture.warn ? 'critical' : avgMoisture !== null && avgMoisture >= T.moisture.safe ? 'warning' : 'good',
              tip: `Safe < ${T.moisture.safe}%`,
            },
            {
              label: 'Alert Status',
              value: critCount > 0 ? `${critCount} Critical` : warnCount > 0 ? `${warnCount} Warning` : 'All Clear',
              bar: critCount > 0 ? 'bg-red-400' : warnCount > 0 ? 'bg-amber-400' : 'bg-green-400',
              status: critCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'good',
              tip: `${zones.length} sensor zones`,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden">
              <div className={cn('h-[3px]', s.bar)} />
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">{s.label}</p>
                  <p className={cn(
                    'text-[20px] font-black tracking-tight leading-none tabular-nums',
                    s.status === 'critical' ? 'text-red-600' : s.status === 'warning' ? 'text-amber-600' : 'text-green-600',
                  )}>{s.value}</p>
                  <p className="text-[9.5px] text-gray-400 font-medium mt-1">{s.tip}</p>
                </div>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  s.status === 'critical' ? 'bg-red-50' : s.status === 'warning' ? 'bg-amber-50' : 'bg-green-50',
                )}>
                  {s.status === 'good' ? (
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg className={cn('w-4 h-4', s.status === 'critical' ? 'text-red-500' : 'text-amber-500')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Zone map + Sensor readings ────────────────────────────────────── */}
        {isFsWithNoData ? (
          <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-10 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-gray-700">{displayName}</h3>
            <p className="text-[12px] text-gray-400 max-w-xs">
              This warehouse has no live sensor connection yet. Go to <strong>Settings → Infrastructure</strong>, edit this warehouse, and set a Live Engine ID (e.g. WH-A) to start receiving sensor readings.
            </p>
          </section>
        ) : (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-4 items-start">

          {/* Zone map card */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{displayName} — Zone Map</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Each colored circle = one sensor · tap a row in the table for exact values</p>
              </div>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                wh?.status === 'alert'   ? 'bg-red-50 text-red-700' :
                wh?.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                wh?.status === 'offline' ? 'bg-gray-100 text-gray-400' :
                'bg-green-50 text-green-700'
              )}>
                {whCfg[wh?.status ?? 'online'].label}
              </span>

            </div>

            {/* Map */}
            <FloorPlan warehouseId={effectiveMockId} viewMode={viewMode} />

            {/* Color legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide">Color key:</span>
              {legend.map((l) => (
                <span key={l.text} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                  {l.text}
                </span>
              ))}
            </div>
          </div>

          {/* Sensor readings card — items-start on parent prevents stretching */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Sensor Readings</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{displayName} · {active.length} of {zones.length} sensors online</p>
                </div>
                {wh?.lastUpdate && (
                  <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                    Updated {wh.lastUpdate}
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              <SensorTable zones={zones} tempUnit={tempUnit} />
            </div>

            {/* Safe limits reference */}
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-gray-50 px-3.5 py-2.5 ring-1 ring-gray-100">
                <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest mb-2">Safe limits — grain storage</p>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                  {[
                    { label: 'Temp',     safe: tempThreshold(T.temp.safe, tempUnit),         warn: `${convertTemp(T.temp.safe, tempUnit)}–${convertTemp(T.temp.warn, tempUnit)}`, crit: `≥ ${convertTemp(T.temp.warn, tempUnit)}` },
                    { label: 'Humidity', safe: `< ${T.humidity.safe}%`, warn: `${T.humidity.safe}–${T.humidity.warn}%`, crit: `≥ ${T.humidity.warn}%` },
                    { label: 'Moisture', safe: `< ${T.moisture.safe}%`, warn: `${T.moisture.safe}–${T.moisture.warn}%`, crit: `≥ ${T.moisture.warn}%` },
                  ].map((r) => (
                    <div key={r.label}>
                      <p className="text-[9px] font-bold text-gray-500 mb-1">{r.label}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8.5px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">{r.safe}</span>
                        <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">{r.warn}</span>
                        <span className="text-[8.5px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap">{r.crit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        )} {/* end isFsWithNoData conditional */}

        {/* ── Parameter Trends ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Parameter Trends</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                How close each reading is to its safe limit — 100% means the limit is reached · hover a line for the exact value · last {timeRange}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] font-semibold text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-2 rounded-sm bg-amber-100 inline-block border border-amber-200" />
                75–90% — approaching limit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-2 rounded-sm bg-red-100 inline-block border border-red-200" />
                90%+ — exceeds safe range
              </span>
            </div>
          </div>

          <ParameterTrendsChart />

          {/* Series legend — just color + label + current value, no confusing "/ max" */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-3 border-t border-gray-100">
            {trendSeries.map((s) => {
              const metric = realtimeMetrics.find((m) => m.id === s.key);
              const displayValue = (s.key === 'temp' && metric)
                ? convertTemp(parseFloat(metric.value), tempUnit)
                : metric ? `${metric.value}${s.unit}` : '—';
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                  <span className="text-[11px] font-bold text-gray-800 tabular-nums">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
