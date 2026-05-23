'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useLiveData } from '@/contexts/LiveDataContext';
import type { LiveSensorReading } from '@/lib/liveEngine';
import { cn } from '@/lib/utils';
import {
  useWarehouses, useZones, useSensorsForWarehouse, useTotalZoneCount,
  seedDefaultStorageIfEmpty,
  type ManagedWarehouse, type ManagedZone, type ManagedSensor,
  type SensorType,
} from '@/lib/storageManagement';

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  good:     { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   label: 'Good'     },
  medium:   { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   label: 'Warning'  },
  high:     { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',         label: 'Critical' },
  inactive: { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',     label: 'Inactive' },
  active:   { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   label: 'Active'   },
} as const;

const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  temperature: 'Temperature', humidity: 'Humidity', moisture: 'Moisture',
  co2: 'CO₂', aqi: 'AQI', multi: 'Multi-param',
};

// ─── Reading rows — drives which readings show per sensor type ─────────────────

type Derived = { temp: number; hum: number; moist: number; co2: number; aqi: number; status: 'good' | 'medium' | 'high' };

const READING_ROWS: Array<{
  label: string;
  sensorType: SensorType;
  get: (d: Derived) => number;
  fmt: (v: number) => string;
  isHigh: (d: Derived) => boolean;
}> = [
  { label: 'Temp',     sensorType: 'temperature', get: d => d.temp,  fmt: v => `${v.toFixed(1)} °C`, isHigh: d => d.status === 'high'   },
  { label: 'Humidity', sensorType: 'humidity',    get: d => d.hum,   fmt: v => `${v} %`,             isHigh: d => d.status !== 'good'   },
  { label: 'Moisture', sensorType: 'moisture',    get: d => d.moist, fmt: v => `${v.toFixed(1)} %`,  isHigh: () => false                 },
  { label: 'CO₂',      sensorType: 'co2',         get: d => d.co2,   fmt: v => `${v} ppm`,           isHigh: () => false                 },
  { label: 'AQI',      sensorType: 'aqi',         get: d => d.aqi,   fmt: v => String(v),            isHigh: () => false                 },
];

// ─── Reading derivation ───────────────────────────────────────────────────────

function deriveZoneReading(base: LiveSensorReading, idx: number, total: number): Derived {
  const spread = total > 1 ? (idx / (total - 1) - 0.5) : 0;
  const temp   = +(base.temperature + spread * 2).toFixed(1);
  const hum    = Math.round(base.humidity + spread * 4);
  const moist  = +(base.moisture + spread * 0.6).toFixed(1);
  const co2    = Math.round(base.co2 + spread * 20);
  const aqi    = Math.round(base.aqi + spread * 3);
  const status: Derived['status'] =
    temp >= 32 || hum >= 72 ? 'high' : temp >= 29 || hum >= 65 ? 'medium' : 'good';
  return { temp, hum, moist, co2, aqi, status };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>{children}</div>;
}

function MetricCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
          <p className="text-[22px] font-bold text-gray-900 leading-none mt-1">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// ─── Warehouse sidebar item ───────────────────────────────────────────────────

function WarehouseItem({ wh, selected, liveStatus, onSelect }: {
  wh: ManagedWarehouse; selected: boolean;
  liveStatus?: 'good' | 'medium' | 'high'; onSelect: () => void;
}) {
  const displayStatus = wh.status === 'inactive' ? 'inactive' : (liveStatus ?? 'good');
  const cfg = STATUS_CFG[displayStatus];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150',
        selected ? 'bg-[#1f5135] text-white shadow-sm' : 'hover:bg-gray-50',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', selected ? 'bg-white/70' : cfg.dot)} />
        <span className={cn('text-[12px] font-bold flex-1 truncate', selected ? 'text-white' : 'text-gray-800')}>
          {wh.name}
        </span>
        {wh.liveEngineId && (
          <span className={cn('text-[9px] font-bold flex-shrink-0', selected ? 'text-white/50' : 'text-gray-400')}>
            {wh.liveEngineId}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5 pl-[18px]">
        <span className={cn('text-[10px] font-medium', selected ? 'text-white/50' : 'text-gray-400')}>
          {wh.location || 'No location'}
        </span>
        <span className={cn('text-[10px] font-semibold',
          selected ? 'text-white/70'
          : displayStatus === 'good'   ? 'text-green-600'
          : displayStatus === 'medium' ? 'text-amber-600'
          : displayStatus === 'high'   ? 'text-red-500'
          : 'text-gray-400',
        )}>
          {cfg.label}
        </span>
      </div>
    </button>
  );
}

// ─── Zone card (read-only monitoring view) ────────────────────────────────────

function ZoneCard({ zone, reading, idx, total, sensors }: {
  zone: ManagedZone;
  reading: LiveSensorReading | null;
  idx: number;
  total: number;
  sensors: ManagedSensor[];
}) {
  const derived      = reading && zone.status === 'active' ? deriveZoneReading(reading, idx, total) : null;
  const activeTypes  = new Set(sensors.filter(s => s.status === 'active').map(s => s.type));
  const hasMulti     = activeTypes.has('multi');
  const hasAnySensor = sensors.length > 0;
  const hasActive    = activeTypes.size > 0;
  const faultyCnt    = sensors.filter(s => s.status === 'faulty').length;
  const activeCnt    = sensors.filter(s => s.status === 'active').length;

  const displayStatus: keyof typeof STATUS_CFG =
    zone.status === 'inactive' ? 'inactive' : (derived?.status ?? 'good');
  const cfg = STATUS_CFG[displayStatus];

  return (
    <div className={cn(
      'bg-white rounded-xl ring-1 flex flex-col transition-shadow duration-200 hover:shadow-sm',
      displayStatus === 'high'   ? 'ring-red-200'   :
      displayStatus === 'medium' ? 'ring-amber-200'  : 'ring-black/[0.06]',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
          <span className="text-[12px] font-bold text-gray-800 truncate">{zone.name}</span>
        </div>
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', cfg.badge)}>{cfg.label}</span>
      </div>

      {/* Readings */}
      <div className="px-3.5 pb-2.5 flex-1">
        {!derived || !hasActive ? (
          <div className="py-3 text-center">
            <p className="text-[10px] text-gray-400 font-medium">
              {zone.status === 'inactive' ? 'Zone offline' : !hasAnySensor ? 'No sensors — add in Settings' : 'No active sensors'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
            {READING_ROWS.map(row => {
              const covered = hasMulti || activeTypes.has(row.sensorType);
              const val     = covered && derived ? row.get(derived) : null;
              return (
                <div
                  key={row.label}
                  className={cn('flex items-baseline justify-between gap-1', !covered && 'opacity-25')}
                  title={!covered ? `No ${SENSOR_TYPE_LABELS[row.sensorType]} sensor` : undefined}
                >
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-none">{row.label}</span>
                  <span className={cn('text-[11px] font-bold tabular-nums',
                    covered && derived && row.isHigh(derived) ? 'text-red-600'
                    : covered ? 'text-gray-700'
                    : 'text-gray-300',
                  )}>
                    {val !== null ? row.fmt(val) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — sensor count display */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-gray-100">
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
        <span className="text-[10px] font-semibold text-gray-400">
          {activeCnt} sensor{activeCnt !== 1 ? 's' : ''} active
          {faultyCnt > 0 && <span className="text-red-400 ml-1">· {faultyCnt} faulty</span>}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StorageUnitsPage() {
  const { readings } = useLiveData();
  const { warehouses, loading: whLoading } = useWarehouses();
  const totalZoneCount = useTotalZoneCount();

  const [selectedWhId, setSelectedWhId] = useState<string | null>(null);
  const [whSearch,     setWhSearch]     = useState('');
  const [whFilter,     setWhFilter]     = useState<'all' | 'active' | 'inactive'>('all');

  const { zones, loading: zoneLoading } = useZones(selectedWhId);
  const allSensors = useSensorsForWarehouse(selectedWhId);

  useEffect(() => { seedDefaultStorageIfEmpty(); }, []);
  useEffect(() => {
    if (!selectedWhId && warehouses.length > 0) setSelectedWhId(warehouses[0].id);
  }, [warehouses, selectedWhId]);

  const selectedWh  = warehouses.find(w => w.id === selectedWhId) ?? null;
  const liveReading = selectedWh?.liveEngineId ? (readings[selectedWh.liveEngineId] ?? null) : null;

  const totals = useMemo(() => {
    const active = warehouses.filter(w => w.status === 'active');
    const liveOnes = active
      .map(w => w.liveEngineId ? readings[w.liveEngineId] : null)
      .filter(Boolean) as LiveSensorReading[];
    const avgTemp  = liveOnes.length ? +(liveOnes.reduce((s, r) => s + r.temperature, 0) / liveOnes.length).toFixed(1) : null;
    const avgHum   = liveOnes.length ? Math.round(liveOnes.reduce((s, r) => s + r.humidity, 0) / liveOnes.length) : null;
    const highRisk = liveOnes.filter(r => r.status === 'high').length;
    return { total: warehouses.length, active: active.length, avgTemp, avgHum, highRisk };
  }, [warehouses, readings]);

  const filteredWhs = useMemo(() =>
    warehouses.filter(w => {
      if (whFilter !== 'all' && w.status !== whFilter) return false;
      if (whSearch) {
        const q = whSearch.toLowerCase();
        return w.name.toLowerCase().includes(q) || (w.location ?? '').toLowerCase().includes(q);
      }
      return true;
    }),
    [warehouses, whFilter, whSearch],
  );

  const usedPct  = liveReading ? Math.round(liveReading.capacity) : 0;
  const usedTons = selectedWh  ? Math.round(selectedWh.capacity * usedPct / 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      <DashboardHeader title="Storage Units" subtitle="Live monitoring — manage infrastructure in Settings" />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Summary cards */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <MetricCard label="Warehouses" value={totals.total} sub={`${totals.active} active`} color="bg-blue-50"
              icon={<svg className="w-[18px] h-[18px] text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            />
            <MetricCard label="Total Zones" value={totalZoneCount ?? '—'} sub="Across all warehouses" color="bg-purple-50"
              icon={<svg className="w-[18px] h-[18px] text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
            />
            <MetricCard label="Avg Temperature" value={totals.avgTemp !== null ? `${totals.avgTemp} °C` : '—'} sub="Active warehouses" color="bg-amber-50"
              icon={<svg className="w-[18px] h-[18px] text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
            />
            <MetricCard label="Avg Humidity" value={totals.avgHum !== null ? `${totals.avgHum} %` : '—'} sub="Active warehouses" color="bg-sky-50"
              icon={<svg className="w-[18px] h-[18px] text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>}
            />
            <MetricCard label="High Risk Units" value={totals.highRisk} sub={totals.highRisk > 0 ? 'Needs attention' : 'All clear'} color="bg-red-50"
              icon={<svg className="w-[18px] h-[18px] text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 px-5 pb-5 overflow-hidden">

          {/* Left: Warehouse list */}
          <div className="lg:w-64 xl:w-72 flex-shrink-0 flex flex-col min-h-0 bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text" placeholder="Search warehouses…" value={whSearch}
                  onChange={e => setWhSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1f5135]/30 transition-colors"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button key={f} onClick={() => setWhFilter(f)} className={cn(
                    'flex-1 text-[10px] font-bold py-1 rounded-lg capitalize transition-colors',
                    whFilter === f ? 'bg-[#1f5135] text-white shadow-sm' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100',
                  )}>{f}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {whLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#1f5135]/30 border-t-[#1f5135] rounded-full animate-spin" />
                </div>
              ) : filteredWhs.length === 0 ? (
                <p className="text-[11px] text-gray-400 font-medium text-center py-8">No warehouses found</p>
              ) : filteredWhs.map(wh => (
                <WarehouseItem
                  key={wh.id} wh={wh} selected={wh.id === selectedWhId}
                  liveStatus={wh.liveEngineId ? readings[wh.liveEngineId]?.status : undefined}
                  onSelect={() => setSelectedWhId(wh.id)}
                />
              ))}
            </div>

            {/* Manage link */}
            <div className="p-2.5 border-t border-gray-100 flex-shrink-0">
              <Link
                href="/settings"
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#1f5135] hover:bg-green-50 py-2 rounded-xl border border-[#1f5135]/20 transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                Manage in Settings
              </Link>
            </div>
          </div>

          {/* Right: Selected warehouse detail */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-4">
            {!selectedWh ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                <svg className="w-14 h-14 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <p className="text-[14px] font-semibold text-gray-400">Select a warehouse</p>
                <p className="text-[11px] text-gray-300 mt-1">Choose one from the list on the left</p>
              </div>
            ) : (
              <>
                {/* Warehouse header card */}
                <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-[16px] font-black text-gray-900">{selectedWh.name}</h2>
                          {selectedWh.liveEngineId && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{selectedWh.liveEngineId}</span>
                          )}
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
                            STATUS_CFG[selectedWh.status === 'inactive' ? 'inactive' : (liveReading?.status ?? 'good')].badge,
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full',
                              STATUS_CFG[selectedWh.status === 'inactive' ? 'inactive' : (liveReading?.status ?? 'good')].dot,
                              liveReading?.status === 'high' && 'animate-pulse',
                            )} />
                            {STATUS_CFG[selectedWh.status === 'inactive' ? 'inactive' : (liveReading?.status ?? 'good')].label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{selectedWh.location || 'No location set'}</p>
                      </div>
                      <Link href="/settings"
                        className="flex-shrink-0 flex items-center gap-1 h-7 px-3 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-500 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50 transition-all"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                        Edit in Settings
                      </Link>
                    </div>

                    {/* Capacity bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Capacity</span>
                        <span className="text-[11px] font-bold text-gray-700">
                          {usedTons.toLocaleString()} / {selectedWh.capacity.toLocaleString()} Tons
                          <span className="text-gray-400 font-medium ml-1">({usedPct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700',
                            usedPct >= 85 ? 'bg-red-400' : usedPct >= 75 ? 'bg-amber-400' : 'bg-[#1f5135]'
                          )}
                          style={{ width: `${Math.min(usedPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Live readings */}
                    {liveReading && (
                      <div className="flex items-center gap-4 flex-wrap">
                        {[
                          { l: 'Temp',     v: `${liveReading.temperature.toFixed(1)} °C` },
                          { l: 'Humidity', v: `${liveReading.humidity} %` },
                          { l: 'Moisture', v: `${liveReading.moisture.toFixed(1)} %` },
                          { l: 'CO₂',      v: `${liveReading.co2} ppm` },
                          { l: 'AQI',      v: String(liveReading.aqi) },
                        ].map(r => (
                          <div key={r.l} className="flex items-baseline gap-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{r.l}</span>
                            <span className="text-[12px] font-bold text-gray-700 tabular-nums">{r.v}</span>
                          </div>
                        ))}
                        <span className="flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full ml-auto">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                          </span>
                          LIVE
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zones */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-[14px] font-black text-gray-900">
                        Zones
                        {!zoneLoading && (
                          <span className="ml-2 text-[11px] font-semibold text-gray-400">{zones.length}</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        Readings shown only for installed active sensors
                      </p>
                    </div>
                    <Link href="/settings"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#1f5135] border border-[#1f5135]/30 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Zone
                    </Link>
                  </div>

                  {zoneLoading ? (
                    <div className="flex items-center justify-center py-14">
                      <div className="w-6 h-6 border-2 border-[#1f5135]/30 border-t-[#1f5135] rounded-full animate-spin" />
                    </div>
                  ) : zones.length === 0 ? (
                    <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-10 text-center">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      <p className="text-[13px] font-semibold text-gray-400 mb-3">No zones yet</p>
                      <Link href="/settings"
                        className="inline-flex px-4 py-2 text-[12px] font-bold text-white bg-[#1f5135] rounded-lg hover:bg-[#174028] transition-colors"
                      >
                        Add zones in Settings →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {zones.map((zone, idx) => (
                        <ZoneCard
                          key={zone.id}
                          zone={zone}
                          reading={liveReading}
                          idx={idx}
                          total={zones.length}
                          sensors={allSensors.filter(s => s.zoneId === zone.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
