'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ParameterTrendsChart } from '@/components/charts/ParameterTrendsChart';
import {
  monitorWarehouses,
  zoneData,
  trendSeries,
  realtimeMetrics,
  type WarehouseOnlineStatus,
  type ZoneStatus,
  type ZoneReading,
} from './mockData';
import { useWarehouses, type ManagedWarehouse } from '@/lib/storageManagement';
import { useLiveData } from '@/contexts/LiveDataContext';
import type { LiveSensorReading } from '@/lib/liveEngine';
import { cn } from '@/lib/utils';

// ─── Safe thresholds (always in °C internally) ────────────────────────────────

const T = {
  temp:     { safe: 27, warn: 30 },
  humidity: { safe: 62, warn: 70 },
  moisture: { safe: 13, warn: 14 },
};

// ─── Per-zone offsets (distributed from warehouse-level reading) ──────────────

const ZONE_OFFSETS = [
  { temp: -0.6, humidity: -3, moisture: -0.3 },
  { temp: +0.8, humidity: +2, moisture: +0.4 },
  { temp: -0.2, humidity: -1, moisture: -0.1 },
  { temp: +0.5, humidity: +1, moisture: +0.2 },
];

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
  return `${c.toFixed(1)}°C`;
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

const statusCfg: Record<ZoneStatus, { dot: string; badge: string; label: string }> = {
  good:     { dot: 'bg-green-400', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   label: 'Good'     },
  normal:   { dot: 'bg-blue-400',  badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       label: 'Elevated' },
  warning:  { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   label: 'Warning'  },
  critical: { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',         label: 'Critical' },
  offline:  { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',     label: 'Offline'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function valColor(val: number | null, safe: number, warn: number): string {
  if (val === null) return 'text-gray-300';
  if (val >= warn)  return 'text-red-600';
  if (val >= safe)  return 'text-amber-600';
  return 'text-gray-800';
}

function barColor(val: number | null, safe: number, warn: number): string {
  if (val === null) return 'bg-gray-200';
  if (val >= warn)  return 'bg-red-400';
  if (val >= safe)  return 'bg-amber-400';
  return 'bg-green-400';
}

function zoneStatus(temp: number | null, humidity: number | null, moisture: number | null): ZoneStatus {
  if (temp === null && humidity === null) return 'offline';
  const t = temp ?? 0; const h = humidity ?? 0; const m = moisture ?? 0;
  if (t >= T.temp.warn || h >= T.humidity.warn || m >= T.moisture.warn) return 'critical';
  if (t >= T.temp.safe || h >= T.humidity.safe || m >= T.moisture.safe) return 'warning';
  if (t >= T.temp.safe * 0.93 || h >= T.humidity.safe * 0.93)           return 'normal';
  return 'good';
}

function computeLiveZones(effectiveMockId: string, readings: Record<string, LiveSensorReading>): ZoneReading[] {
  const baseZones  = zoneData[effectiveMockId] ?? [];
  const whReading  = readings[effectiveMockId];
  if (!whReading) return baseZones;

  return baseZones.map((z, i) => {
    const off      = ZONE_OFFSETS[i] ?? { temp: 0, humidity: 0, moisture: 0 };
    const temp     = +(whReading.temperature + off.temp).toFixed(1);
    const humidity = Math.round(whReading.humidity + off.humidity);
    const moisture = +(whReading.moisture + off.moisture).toFixed(1);
    return { ...z, temp, humidity, moisture, co2: whReading.co2, aqi: whReading.aqi, status: zoneStatus(temp, humidity, moisture) };
  });
}

function avg(zones: ZoneReading[], key: keyof ZoneReading): number | null {
  const active = zones.filter(z => z.status !== 'offline' && z[key] !== null);
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

// ─── Unified dropdown ─────────────────────────────────────────────────────────

type DropdownEntry = {
  id: string;
  name: string;
  status: WarehouseOnlineStatus;
  isUserWarehouse: boolean;
  hasData: boolean;
  canSelect: boolean;
};

function buildDropdownList(firestoreWarehouses: ManagedWarehouse[]): DropdownEntry[] {
  // Mock warehouses — replace name if a Firestore warehouse is linked
  const entries: DropdownEntry[] = monitorWarehouses.map(mw => {
    const fsWh = firestoreWarehouses.find(fw => fw.liveEngineId === mw.id);
    return {
      id: mw.id,
      name: fsWh?.name ?? mw.name,
      status: mw.status,
      isUserWarehouse: !!fsWh,
      hasData: true,
      canSelect: mw.status !== 'offline',
    };
  });

  // Firestore warehouses with no liveEngineId — no sensor data yet
  for (const fw of firestoreWarehouses.filter(fw => !fw.liveEngineId)) {
    entries.push({ id: fw.id, name: fw.name, status: 'offline', isUserWarehouse: true, hasData: false, canSelect: true });
  }

  return entries;
}

function WarehouseDropdown({
  selected, onSelect, firestoreWarehouses,
}: {
  selected: string;
  onSelect: (id: string) => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entries     = buildDropdownList(firestoreWarehouses);
  const current     = entries.find(e => e.id === selected);
  const cfg         = whCfg[current?.status ?? 'online'];
  const displayName = current?.name ?? selected;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mainEntries   = entries.filter(e => e.hasData);
  const noDataEntries = entries.filter(e => !e.hasData);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-800 transition-all duration-150 select-none min-w-[160px]"
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot, current?.status === 'alert' && 'animate-pulse')} />
        <span className="flex-1 text-left truncate max-w-[140px]">{displayName}</span>
        {current?.isUserWarehouse && (
          <span className="text-[8px] font-bold bg-[#1f5135]/10 text-[#1f5135] px-1 py-0.5 rounded mr-0.5">Mine</span>
        )}
        <svg className={cn('w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl ring-1 ring-black/[0.08] shadow-xl z-30 min-w-[240px] p-1.5 max-h-72 overflow-y-auto">
          {mainEntries.map(e => {
            const c    = whCfg[e.status];
            const isSel = e.id === selected;
            const isOff = !e.canSelect;
            return (
              <button
                key={e.id}
                disabled={isOff}
                onClick={() => { onSelect(e.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                  isSel   ? 'bg-[#1f5135]/[0.08] text-[#1f5135]'
                  : isOff ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot, e.status === 'alert' && 'animate-pulse')} />
                <span className="flex-1 truncate">{e.name}</span>
                {e.isUserWarehouse && (
                  <span className="text-[8px] font-bold bg-[#1f5135]/10 text-[#1f5135] px-1 py-0.5 rounded mr-0.5">Mine</span>
                )}
                <span className={cn('text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', c.badge)}>
                  {c.label}
                </span>
              </button>
            );
          })}

          {noDataEntries.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1">No sensor connection</p>
              {noDataEntries.map(e => {
                const isSel = e.id === selected;
                return (
                  <button
                    key={e.id}
                    onClick={() => { onSelect(e.id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                      isSel ? 'bg-[#1f5135]/[0.08] text-[#1f5135]' : 'text-gray-500 hover:bg-gray-50',
                    )}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">No data</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-header bar ───────────────────────────────────────────────────────────

function MonitorBar({
  selected, onSelect, timeRange, onTimeRange, firestoreWarehouses,
}: {
  selected: string; onSelect: (id: string) => void;
  timeRange: string; onTimeRange: (t: string) => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
      <WarehouseDropdown selected={selected} onSelect={onSelect} firestoreWarehouses={firestoreWarehouses} />

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

// ─── Zone card ────────────────────────────────────────────────────────────────

function ZoneCard({ zone, tempUnit }: { zone: ZoneReading; tempUnit: '°C' | '°F' | 'K' }) {
  const cfg       = statusCfg[zone.status];
  const isOffline = zone.status === 'offline';

  const metrics = [
    { label: 'Temp',     value: zone.temp     != null ? convertTemp(zone.temp, tempUnit) : null, num: zone.temp,     safe: T.temp.safe,     warn: T.temp.warn,     limit: T.temp.warn * 1.25 },
    { label: 'Humidity', value: zone.humidity  != null ? `${zone.humidity}%`             : null, num: zone.humidity,  safe: T.humidity.safe,  warn: T.humidity.warn,  limit: T.humidity.warn * 1.25 },
    { label: 'Moisture', value: zone.moisture  != null ? `${zone.moisture.toFixed(1)}%`  : null, num: zone.moisture,  safe: T.moisture.safe,  warn: T.moisture.warn,  limit: T.moisture.warn * 1.25 },
  ];

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3',
      zone.status === 'critical' ? 'ring-2 ring-red-200' :
      zone.status === 'warning'  ? 'ring-1 ring-amber-200' :
      'ring-1 ring-black/[0.06]',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', cfg.dot, zone.status === 'critical' && 'animate-pulse')} />
          <span className="text-[13px] font-black text-gray-900 tabular-nums">{zone.id}</span>
          <span className="text-[11px] text-gray-400 font-medium truncate">{zone.bay}</span>
        </div>
        <span className={cn('text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      {/* Metrics */}
      {isOffline ? (
        <p className="text-[11px] text-gray-400 text-center py-3">No signal from sensor</p>
      ) : (
        <div className="flex flex-col gap-2">
          {metrics.map(m => {
            const width = m.num !== null ? Math.min(100, Math.round((m.num / m.limit) * 100)) : 0;
            return (
              <div key={m.label} className="flex items-center gap-2.5">
                <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide w-12 flex-shrink-0">{m.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', barColor(m.num, m.safe, m.warn))}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className={cn('text-[11.5px] font-bold tabular-nums w-16 text-right flex-shrink-0', valColor(m.num, m.safe, m.warn))}>
                  {m.value ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: CO₂ + AQI */}
      {!isOffline && (
        <div className="flex items-center gap-3 pt-1.5 border-t border-gray-50">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">CO₂</span>
          <span className="text-[11px] font-bold text-gray-600 tabular-nums">
            {zone.co2 ?? '—'} <span className="text-[9px] font-medium text-gray-400">ppm</span>
          </span>
          <span className="w-px h-3 bg-gray-100" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">AQI</span>
          <span className="text-[11px] font-bold text-gray-600 tabular-nums">{zone.aqi ?? '—'}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RealtimeMonitorPage() {
  const [selectedWH, setSelectedWH] = useState('WH-A');
  const [timeRange,  setTimeRange]  = useState('1h');
  const tempUnit = useTempUnit();
  const { warehouses: firestoreWarehouses } = useWarehouses();
  const { readings } = useLiveData();

  // Resolve which mock warehouse to read live data from
  const selectedFsWh    = firestoreWarehouses.find(w => w.id === selectedWH);
  const effectiveMockId = selectedFsWh ? (selectedFsWh.liveEngineId ?? '') : selectedWH;
  const isFsWithNoData  = !!selectedFsWh && !selectedFsWh.liveEngineId;

  const wh          = monitorWarehouses.find(w => w.id === effectiveMockId);
  const displayName = selectedFsWh?.name ?? wh?.name ?? selectedWH;

  // Compute live zones from warehouse-level reading + per-zone offsets
  const zones: ZoneReading[] = isFsWithNoData ? [] : computeLiveZones(effectiveMockId, readings);

  const active      = zones.filter(z => z.status !== 'offline');
  const avgTemp     = avg(zones, 'temp');
  const avgHumidity = avg(zones, 'humidity');
  const avgMoisture = avg(zones, 'moisture');
  const critCount   = zones.filter(z => z.status === 'critical').length;
  const warnCount   = zones.filter(z => z.status === 'warning').length;

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
        selected={selectedWH}  onSelect={setSelectedWH}
        timeRange={timeRange}   onTimeRange={setTimeRange}
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
          ].map(s => (
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

        {/* ── Zone cards or no-data placeholder ────────────────────────────── */}
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
          <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{displayName} — Sensor Zones</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{active.length} of {zones.length} sensors active · updates every 30 s</p>
              </div>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                wh?.status === 'alert'   ? 'bg-red-50 text-red-700'     :
                wh?.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                wh?.status === 'offline' ? 'bg-gray-100 text-gray-400'  :
                'bg-green-50 text-green-700'
              )}>
                {whCfg[wh?.status ?? 'online'].label}
              </span>
            </div>

            {/* Zone cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {zones.map(zone => (
                <ZoneCard key={zone.id} zone={zone} tempUnit={tempUnit} />
              ))}
            </div>

            {/* Safe limits reference */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">Safe limits:</span>
                {[
                  { label: 'Temp',     safe: tempThreshold(T.temp.safe, tempUnit),   warn: `${convertTemp(T.temp.safe, tempUnit)}–${convertTemp(T.temp.warn, tempUnit)}` },
                  { label: 'Humidity', safe: `< ${T.humidity.safe}%`,                warn: `${T.humidity.safe}–${T.humidity.warn}%` },
                  { label: 'Moisture', safe: `< ${T.moisture.safe}%`,                warn: `${T.moisture.safe}–${T.moisture.warn}%` },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold text-gray-500">{r.label}:</span>
                    <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{r.safe}</span>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{r.warn}</span>
                    <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">above = critical</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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

          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-3 border-t border-gray-100">
            {trendSeries.map(s => {
              const metric = realtimeMetrics.find(m => m.id === s.key);
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
