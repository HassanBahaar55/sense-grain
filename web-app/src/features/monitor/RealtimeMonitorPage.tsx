'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ParameterTrendsChart } from '@/components/charts/ParameterTrendsChart';
// ─── Local types (removed mockData dependency) ────────────────────────────────
type WarehouseOnlineStatus = 'online' | 'warning' | 'alert' | 'offline';
type ZoneStatus = 'good' | 'normal' | 'warning' | 'critical' | 'offline';
interface ZoneReading {
  id: string; label: string; bay: string;
  temp: number | null; humidity: number | null; moisture: number | null;
  co2: number | null; aqi: number | null;
  status: ZoneStatus;
}

const trendSeries = [
  { key: 'temp'     as const, label: 'Temperature', color: '#f59e0b', unit: '°C',   threshold: 35   },
  { key: 'humidity' as const, label: 'Humidity',    color: '#3b82f6', unit: '%',    threshold: 80   },
  { key: 'moisture' as const, label: 'Moisture',    color: '#22c55e', unit: '%',    threshold: 15   },
  { key: 'co2'      as const, label: 'CO₂',         color: '#8b5cf6', unit: ' ppm', threshold: 1000 },
  { key: 'aqi'      as const, label: 'AQI',         color: '#10b981', unit: '',     threshold: 100  },
];
import {
  useWarehouses,
  useZones,
  useSensorsForWarehouse,
  type ManagedWarehouse,
  type ManagedZone,
  type ManagedSensor,
} from '@/lib/storageManagement';
import { useLiveData } from '@/contexts/LiveDataContext';
import type { LiveSensorReading } from '@/lib/liveEngine';
import { cn } from '@/lib/utils';

// ─── Safe thresholds (always in °C internally) ────────────────────────────────

const T = {
  temp:     { safe: 27, warn: 30 },
  humidity: { safe: 62, warn: 70 },
  moisture: { safe: 13, warn: 14 },
};

// ─── Per-zone offsets — cycles for any number of zones ───────────────────────

const ZONE_OFFSETS = [
  { temp: -0.6, humidity: -3, moisture: -0.3 },
  { temp: +0.8, humidity: +2, moisture: +0.4 },
  { temp: -0.2, humidity: -1, moisture: -0.1 },
  { temp: +0.5, humidity: +1, moisture: +0.2 },
  { temp: +1.1, humidity: +3, moisture: +0.5 },
  { temp: -0.4, humidity: -2, moisture: -0.2 },
  { temp: +0.3, humidity:  0, moisture: +0.1 },
  { temp: -0.9, humidity: -4, moisture: -0.5 },
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

/**
 * Build ZoneReading cards from Firestore zones + live engine reading.
 * Works for any number of zones — ZONE_OFFSETS cycles via modulo.
 * If liveReading is null (no active sensors or no data yet), zones show as offline.
 */
function buildZoneReadings(
  fsZones: ManagedZone[],
  fsSensors: ManagedSensor[],
  liveReading: LiveSensorReading | null,
): ZoneReading[] {
  return fsZones.map((zone, i) => {
    const activeSensors = fsSensors.filter(s => s.zoneId === zone.id && s.status !== 'faulty');
    const sensorLabel   = `S${i + 1}`;

    if (!liveReading || activeSensors.length === 0) {
      return {
        id: sensorLabel,
        label: zone.name,
        bay: zone.name,
        temp: null, humidity: null, moisture: null, co2: null, aqi: null,
        status: 'offline',
      };
    }

    const off      = ZONE_OFFSETS[i % ZONE_OFFSETS.length];
    const temp     = +(liveReading.temperature + off.temp).toFixed(1);
    const humidity = Math.round(liveReading.humidity + off.humidity);
    const moisture = +(liveReading.moisture + off.moisture).toFixed(1);

    return {
      id: sensorLabel,
      label: zone.name,
      bay: zone.name,
      temp, humidity, moisture,
      co2: liveReading.co2,
      aqi: liveReading.aqi,
      status: zoneStatus(temp, humidity, moisture),
    };
  });
}

function avg(zones: ZoneReading[], key: keyof ZoneReading): number | null {
  const active = zones.filter(z => z.status !== 'offline' && z[key] !== null);
  if (!active.length) return null;
  return active.reduce((s, z) => s + (z[key] as number), 0) / active.length;
}

// ─── Dropdown entry type ──────────────────────────────────────────────────────

type DropdownEntry = {
  id: string;           // selection key (mock ID or Firestore ID)
  fsId: string | null;  // Firestore warehouse document ID
  name: string;
  status: WarehouseOnlineStatus;
  isUserWarehouse: boolean;
  hasData: boolean;
  canSelect: boolean;
};

function buildDropdownList(
  firestoreWarehouses: ManagedWarehouse[],
  readings: Record<string, LiveSensorReading>,
): DropdownEntry[] {
  return firestoreWarehouses.map(fw => {
    const liveData   = readings[fw.id];
    const hasData    = !!liveData;
    const whStatus: WarehouseOnlineStatus = !hasData ? 'offline'
      : liveData.status === 'high'   ? 'alert'
      : liveData.status === 'medium' ? 'warning'
      : 'online';
    return {
      id:              fw.id,
      fsId:            fw.id,
      name:            fw.name,
      status:          whStatus,
      isUserWarehouse: true,
      hasData,
      canSelect:       true,
    };
  });
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

// ─── Warehouse multi-select dropdown ─────────────────────────────────────────

function WarehouseDropdown({
  selectedWHs, onToggle, onSelectAll, firestoreWarehouses,
}: {
  selectedWHs: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  const { readings } = useLiveData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entries = buildDropdownList(firestoreWarehouses, readings);

  const allIds      = entries.map(e => e.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedWHs.includes(id));
  const noneSelected = selectedWHs.length === 0;

  const buttonLabel = noneSelected
    ? 'Select Warehouse'
    : allSelected && entries.length > 1
    ? 'All Warehouses'
    : selectedWHs.length === 1
    ? (entries.find(e => e.id === selectedWHs[0])?.name ?? selectedWHs[0])
    : `${selectedWHs.length} Warehouses`;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mainEntries   = entries.filter(e => e.hasData);
  const noDataEntries = entries.filter(e => !e.hasData);

  const CheckIcon = () => (
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-800 transition-all duration-150 select-none min-w-[170px]"
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', noneSelected ? 'bg-gray-300' : allSelected ? 'bg-green-400' : 'bg-[#1f5135]')} />
        <span className="flex-1 text-left truncate max-w-[150px]">{buttonLabel}</span>
        {!noneSelected && selectedWHs.length > 1 && !allSelected && (
          <span className="text-[9px] font-bold bg-[#1f5135]/10 text-[#1f5135] px-1.5 py-0.5 rounded flex-shrink-0">
            {selectedWHs.length}
          </span>
        )}
        <svg className={cn('w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl ring-1 ring-black/[0.08] shadow-xl z-30 min-w-[260px] p-1.5 max-h-72 overflow-y-auto">

          {/* All Warehouses toggle — only shown when 2+ warehouses exist */}
          {entries.length > 1 && (
            <>
              <button
                onClick={onSelectAll}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                  allSelected ? 'bg-[#1f5135]/[0.08] text-[#1f5135]' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  allSelected ? 'bg-[#1f5135] border-[#1f5135]' : 'border-gray-300 bg-white',
                )}>
                  {allSelected && <CheckIcon />}
                </span>
                <span className="flex-1">All Warehouses</span>
                <span className="text-[9.5px] text-gray-400">{entries.length} total</span>
              </button>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}

          {/* Warehouses with live data */}
          {mainEntries.map(e => {
            const c     = whCfg[e.status];
            const isSel = selectedWHs.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => onToggle(e.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                  isSel ? 'bg-[#1f5135]/[0.08] text-[#1f5135]' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  isSel ? 'bg-[#1f5135] border-[#1f5135]' : 'border-gray-300 bg-white',
                )}>
                  {isSel && <CheckIcon />}
                </span>
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

          {/* Warehouses without live data */}
          {noDataEntries.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1">No sensor connection</p>
              {noDataEntries.map(e => {
                const isSel = selectedWHs.includes(e.id);
                return (
                  <button
                    key={e.id}
                    onClick={() => onToggle(e.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors text-left',
                      isSel ? 'bg-[#1f5135]/[0.08] text-[#1f5135]' : 'text-gray-500 hover:bg-gray-50',
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      isSel ? 'bg-[#1f5135] border-[#1f5135]' : 'border-gray-300 bg-white',
                    )}>
                      {isSel && <CheckIcon />}
                    </span>
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
  selectedWHs, onToggle, onSelectAll, firestoreWarehouses,
}: {
  selectedWHs: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  firestoreWarehouses: ManagedWarehouse[];
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
      <WarehouseDropdown selectedWHs={selectedWHs} onToggle={onToggle} onSelectAll={onSelectAll} firestoreWarehouses={firestoreWarehouses} />

      <div className="flex-1" />

      <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

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
  const [selectedWHs, setSelectedWHs] = useState<string[]>([]);
  const tempUnit = useTempUnit();

  const { warehouses: firestoreWarehouses } = useWarehouses();
  const { readings } = useLiveData();

  // Auto-select first warehouse when warehouses load for the first time
  useEffect(() => {
    if (selectedWHs.length === 0 && firestoreWarehouses.length > 0) {
      const first = firestoreWarehouses[0];
      setSelectedWHs([first.id]);
    }
  }, [firestoreWarehouses, selectedWHs.length]);

  const dropdownEntries = buildDropdownList(firestoreWarehouses, readings);

  // Primary warehouse (first selected) drives the zones panel
  const primaryEntry  = dropdownEntries.find(e => selectedWHs.includes(e.id)) ?? null;
  const fsWhId        = primaryEntry?.fsId ?? null;
  const primaryMockId = (() => {
    if (!primaryEntry?.hasData) return '';
    return primaryEntry.id;
  })();

  // Load Firestore zones + sensors for the primary warehouse
  const { zones: fsZones, loading: zonesLoading } = useZones(fsWhId);
  const fsSensors = useSensorsForWarehouse(fsWhId);

  // Live reading for the primary warehouse (zone cards + CO₂/AQI)
  const primaryLiveReading: LiveSensorReading | null = readings[primaryMockId] ?? null;
  const zones: ZoneReading[] = buildZoneReadings(fsZones, fsSensors, primaryLiveReading);

  // Aggregate live readings from ALL selected warehouses for the stats strip
  const selectedLiveReadings = selectedWHs
    .map(id => {
      const entry = dropdownEntries.find(e => e.id === id);
      if (!entry?.hasData) return null;
      return readings[entry.id] ?? null;
    })
    .filter((r): r is LiveSensorReading => r !== null);

  const primaryDisplayName = primaryEntry?.name ?? 'No Warehouse Selected';
  const primaryHasNoLink   = primaryEntry?.hasData === false;

  const active      = zones.filter(z => z.status !== 'offline');
  const avgTemp     = selectedLiveReadings.length ? selectedLiveReadings.reduce((s, r) => s + r.temperature, 0) / selectedLiveReadings.length : null;
  const avgHumidity = selectedLiveReadings.length ? selectedLiveReadings.reduce((s, r) => s + r.humidity, 0) / selectedLiveReadings.length : null;
  const avgMoisture = selectedLiveReadings.length ? selectedLiveReadings.reduce((s, r) => s + r.moisture, 0) / selectedLiveReadings.length : null;
  const critCount   = selectedLiveReadings.filter(r => r.status === 'high').length;
  const warnCount   = selectedLiveReadings.filter(r => r.status === 'medium').length;

  const allIds    = dropdownEntries.map(e => e.id);
  const toggleWH  = (id: string) => setSelectedWHs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedWHs(allIds);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Realtime Monitor"
        subtitle={
          firestoreWarehouses.length === 0 ? 'No warehouses configured'
          : selectedWHs.length === 0 ? 'Select a warehouse to begin monitoring'
          : selectedWHs.length > 1
            ? `${selectedWHs.length} warehouses · aggregated stats · zones: ${primaryDisplayName}`
            : primaryHasNoLink
              ? `${primaryDisplayName} · connect a Live Engine ID in Settings to get readings`
              : `${primaryDisplayName} · ${active.length} of ${zones.length} sensors active`
        }
      />

      <MonitorBar
        selectedWHs={selectedWHs}
        onToggle={toggleWH}
        onSelectAll={selectAll}
        firestoreWarehouses={firestoreWarehouses}
      />

      {firestoreWarehouses.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
            </div>
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">No warehouses configured</h3>
            <p className="text-[12px] text-gray-500 mb-3">Add a warehouse and configure zones in Settings to begin real-time monitoring.</p>
            <a href="/settings?tab=infrastructure" className="text-[12px] font-bold text-[#1f5135] hover:underline">
              Go to Settings → Infrastructure
            </a>
          </div>
        </div>
      )}

      <main className="flex-1 p-5 space-y-4 overflow-auto" style={{ display: firestoreWarehouses.length === 0 ? 'none' : undefined }}>

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
              value: critCount > 0 ? `${critCount} Critical` : warnCount > 0 ? `${warnCount} Warning` : selectedLiveReadings.length === 0 ? '—' : 'All Clear',
              bar: critCount > 0 ? 'bg-red-400' : warnCount > 0 ? 'bg-amber-400' : 'bg-green-400',
              status: critCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'good',
              tip: selectedWHs.length > 1 ? `${selectedWHs.length} warehouses monitored` : `${zones.length} sensor zone${zones.length !== 1 ? 's' : ''}`,
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

        {/* ── Sensor zones ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{primaryDisplayName} — Sensor Zones</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {zonesLoading
                  ? 'Loading zones…'
                  : primaryHasNoLink
                  ? `${zones.length} zone${zones.length !== 1 ? 's' : ''} configured · connect a Live Engine ID to see readings`
                  : `${active.length} of ${zones.length} sensors active · updates every 10 s`
                }
              </p>
            </div>
            {!primaryHasNoLink && (
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                primaryEntry?.status === 'alert'   ? 'bg-red-50 text-red-700'     :
                primaryEntry?.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                primaryEntry?.status === 'offline' ? 'bg-gray-100 text-gray-400'  :
                'bg-green-50 text-green-700'
              )}>
                {whCfg[primaryEntry?.status ?? 'online'].label}
              </span>
            )}
            {primaryHasNoLink && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">
                No connection
              </span>
            )}
          </div>

          {zonesLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              <span className="text-[12px] font-semibold">Loading sensor zones…</span>
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-1">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-[13px] font-bold text-gray-600">No zones configured</p>
              <p className="text-[11px] text-gray-400 max-w-xs">
                Go to <strong>Settings → Infrastructure</strong>, select this warehouse, and add zones to start monitoring.
              </p>
            </div>
          ) : (
            <>
              {/* Zone cards — scrollable container, 4 visible at a time */}
              <div className="relative">
                <div className="overflow-y-auto max-h-[212px] pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {zones.map(zone => (
                      <ZoneCard key={zone.id + zone.bay} zone={zone} tempUnit={tempUnit} />
                    ))}
                  </div>
                </div>
                {/* Fade hint when there are more zones below */}
                {zones.length > 4 && (
                  <div className="absolute bottom-0 left-0 right-2 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl" />
                )}
              </div>
              {zones.length > 4 && (
                <p className="text-[10px] font-semibold text-gray-400 text-center mt-2">
                  Scroll to see all {zones.length} zones
                </p>
              )}

              {/* Safe limits reference */}
              {!primaryHasNoLink && (
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
              )}
            </>
          )}
        </section>

        {/* ── Parameter Trends ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Parameter Trends</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                How close each reading is to its safe limit — 100% means the limit is reached · hover a line for the exact value · live data
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
              const raw: Record<string, number | null> = {
                temp:     avgTemp,
                humidity: avgHumidity,
                moisture: avgMoisture,
                co2:      primaryLiveReading?.co2 ?? null,
                aqi:      primaryLiveReading?.aqi ?? null,
              };
              const v = raw[s.key];
              const displayValue = v === null ? '—'
                : s.key === 'temp' ? convertTemp(v, tempUnit)
                : `${s.key === 'moisture' ? v.toFixed(1) : Math.round(v)}${s.unit}`;
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
