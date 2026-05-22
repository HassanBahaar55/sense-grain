'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useLiveData } from '@/contexts/LiveDataContext';
import type { LiveSensorReading } from '@/lib/liveEngine';
import { cn } from '@/lib/utils';
import {
  useWarehouses, useZones, useSensorsForWarehouse, useTotalZoneCount,
  addWarehouse, updateWarehouse, deleteWarehouse,
  addZone, updateZone, deleteZone,
  addSensor, updateSensor, deleteSensor,
  seedDefaultStorageIfEmpty,
  type ManagedWarehouse, type ManagedZone, type ManagedSensor,
  type ManagedStatus, type SensorType, type SensorStatus,
} from '@/lib/storageManagement';

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  good:     { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700',  label: 'Good'     },
  medium:   { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700',  label: 'Warning'  },
  high:     { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-600',      label: 'Critical' },
  inactive: { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-400',   label: 'Inactive' },
  active:   { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700',  label: 'Active'   },
} as const;

const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  temperature: 'Temperature', humidity: 'Humidity', moisture: 'Moisture',
  co2: 'CO₂', aqi: 'AQI', multi: 'Multi',
};

const SENSOR_STATUS_CFG: Record<SensorStatus, { dot: string; label: string }> = {
  active:   { dot: 'bg-green-500', label: 'Active'  },
  inactive: { dot: 'bg-gray-300',  label: 'Offline' },
  faulty:   { dot: 'bg-red-500',   label: 'Faulty'  },
};

// ─── Reading derivation (per-zone offsets from warehouse average) ─────────────

function deriveZoneReading(base: LiveSensorReading, idx: number, total: number) {
  const spread = total > 1 ? (idx / (total - 1) - 0.5) : 0;
  const temp   = +(base.temperature + spread * 2).toFixed(1);
  const hum    = Math.round(base.humidity + spread * 4);
  const moist  = +(base.moisture + spread * 0.6).toFixed(1);
  const co2    = Math.round(base.co2 + spread * 20);
  const aqi    = Math.round(base.aqi + spread * 3);
  const status: 'good' | 'medium' | 'high' =
    temp >= 32 || hum >= 72 ? 'high' : temp >= 29 || hum >= 65 ? 'medium' : 'good';
  return { temp, hum, moist, co2, aqi, status };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>{children}</div>;
}

function Badge({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function MetricCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
          <p className="text-[22px] font-bold text-gray-900 leading-none mt-1">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-black text-gray-900">{title}</h2>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors ml-4">
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 focus:border-[#1f5135] transition-colors';
const SELECT = cn(INPUT, 'cursor-pointer');

function WarehouseModal({ wh, onClose }: { wh?: ManagedWarehouse; onClose: () => void }) {
  const [name, setName]       = useState(wh?.name ?? '');
  const [capacity, setCap]    = useState(String(wh?.capacity ?? 1000));
  const [location, setLoc]    = useState(wh?.location ?? '');
  const [status, setStatus]   = useState<ManagedStatus>(wh?.status ?? 'active');
  const [saving, setSaving]   = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const data = { name: name.trim(), capacity: Number(capacity) || 1000, location: location.trim(), status };
    if (wh) await updateWarehouse(wh.id, data);
    else await addWarehouse(data);
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title={wh ? 'Edit Warehouse' : 'Add Warehouse'} onClose={onClose}
      footer={
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} className="flex-1 px-4 py-2.5 text-[12px] font-bold text-white bg-[#1f5135] rounded-xl hover:bg-[#174028] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : wh ? 'Save Changes' : 'Add Warehouse'}
          </button>
        </div>
      }
    >
      <Field label="Name"><input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Warehouse A" /></Field>
      <Field label="Capacity (Tons)"><input className={INPUT} type="number" min="0" value={capacity} onChange={e => setCap(e.target.value)} /></Field>
      <Field label="Location"><input className={INPUT} value={location} onChange={e => setLoc(e.target.value)} placeholder="e.g. Block A, North Wing" /></Field>
      <Field label="Status">
        <select className={SELECT} value={status} onChange={e => setStatus(e.target.value as ManagedStatus)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
    </ModalShell>
  );
}

function ZoneModal({ zone, warehouseId, onClose }: { zone?: ManagedZone; warehouseId: string; onClose: () => void }) {
  const [name, setName]     = useState(zone?.name ?? '');
  const [status, setStatus] = useState<ManagedStatus>(zone?.status ?? 'active');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    if (zone) await updateZone(zone.id, { name: name.trim(), status });
    else await addZone({ warehouseId, name: name.trim(), status });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title={zone ? 'Edit Zone' : 'Add Zone'} onClose={onClose}
      footer={
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} className="flex-1 px-4 py-2.5 text-[12px] font-bold text-white bg-[#1f5135] rounded-xl hover:bg-[#174028] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : zone ? 'Save Changes' : 'Add Zone'}
          </button>
        </div>
      }
    >
      <Field label="Zone Name"><input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zone 1, Ambient, Cold Store" /></Field>
      <Field label="Status">
        <select className={SELECT} value={status} onChange={e => setStatus(e.target.value as ManagedStatus)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
    </ModalShell>
  );
}

function SensorModal({ sensor, zoneId, warehouseId, onClose }: {
  sensor?: ManagedSensor; zoneId: string; warehouseId: string; onClose: () => void;
}) {
  const [name, setName]       = useState(sensor?.name ?? '');
  const [type, setType]       = useState<SensorType>(sensor?.type ?? 'temperature');
  const [status, setStatus]   = useState<SensorStatus>(sensor?.status ?? 'active');
  const [saving, setSaving]   = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    if (sensor) await updateSensor(sensor.id, { name: name.trim(), type, status });
    else await addSensor({ zoneId, warehouseId, name: name.trim(), type, status });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title={sensor ? 'Edit Sensor' : 'Add Sensor'} onClose={onClose}
      footer={
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} className="flex-1 px-4 py-2.5 text-[12px] font-bold text-white bg-[#1f5135] rounded-xl hover:bg-[#174028] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : sensor ? 'Save Changes' : 'Add Sensor'}
          </button>
        </div>
      }
    >
      <Field label="Sensor Name"><input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Temperature Sensor 1" /></Field>
      <Field label="Type">
        <select className={SELECT} value={type} onChange={e => setType(e.target.value as SensorType)}>
          {(Object.keys(SENSOR_TYPE_LABELS) as SensorType[]).map(t => (
            <option key={t} value={t}>{SENSOR_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select className={SELECT} value={status} onChange={e => setStatus(e.target.value as SensorStatus)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="faulty">Faulty</option>
        </select>
      </Field>
    </ModalShell>
  );
}

function DeleteConfirm({ title, desc, onConfirm, onClose }: {
  title: string; desc: string; onConfirm: () => void; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={title} subtitle={desc} onClose={onClose}
      footer={
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); onClose(); }} disabled={busy}
            className="flex-1 px-4 py-2.5 text-[12px] font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      }
    >
      <p className="text-[13px] text-gray-500">This action cannot be undone.</p>
    </ModalShell>
  );
}

// ─── Warehouse sidebar item ───────────────────────────────────────────────────

function WarehouseItem({ wh, selected, liveStatus, onSelect }: {
  wh: ManagedWarehouse;
  selected: boolean;
  liveStatus?: 'good' | 'medium' | 'high';
  onSelect: () => void;
}) {
  const displayStatus = wh.status === 'inactive' ? 'inactive' : (liveStatus ?? 'good');
  const cfg = STATUS_CFG[displayStatus];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150',
        selected ? 'bg-[#1f5135] text-white shadow-sm' : 'hover:bg-gray-50 text-gray-800',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', selected ? 'bg-white/70' : cfg.dot)} />
        <span className={cn('text-[12px] font-bold flex-1 truncate', selected ? 'text-white' : 'text-gray-800')}>
          {wh.name}
        </span>
        {wh.liveEngineId && (
          <span className={cn('text-[9px] font-bold flex-shrink-0', selected ? 'text-white/60' : 'text-gray-400')}>
            {wh.liveEngineId}
          </span>
        )}
      </div>
      <div className={cn('flex items-center justify-between mt-1 pl-4.5', selected ? 'text-white/60' : 'text-gray-400')}>
        <span className="text-[10px] font-medium">{wh.location || 'No location'}</span>
        <span className={cn('text-[10px] font-semibold', selected ? 'text-white/70' : cfg.badge.includes('green') ? 'text-green-600' : cfg.badge.includes('amber') ? 'text-amber-600' : cfg.badge.includes('red') ? 'text-red-600' : 'text-gray-400')}>
          {cfg.label}
        </span>
      </div>
    </button>
  );
}

// ─── Zone card ────────────────────────────────────────────────────────────────

function ZoneCard({ zone, reading, idx, total, sensors, onEdit, onDelete, onAddSensor, onEditSensor, onDeleteSensor }: {
  zone: ManagedZone;
  reading: LiveSensorReading | null;
  idx: number;
  total: number;
  sensors: ManagedSensor[];
  onEdit: () => void;
  onDelete: () => void;
  onAddSensor: () => void;
  onEditSensor: (s: ManagedSensor) => void;
  onDeleteSensor: (s: ManagedSensor) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const derived = reading && zone.status === 'active' ? deriveZoneReading(reading, idx, total) : null;
  const displayStatus = zone.status === 'inactive' ? 'inactive' : (derived?.status ?? 'good');
  const cfg = STATUS_CFG[displayStatus];

  const activeSensors   = sensors.filter(s => s.status === 'active').length;
  const faultySensors   = sensors.filter(s => s.status === 'faulty').length;

  return (
    <div className={cn('bg-white rounded-xl ring-1 transition-all duration-200',
      displayStatus === 'high'   ? 'ring-red-200 bg-red-50/20'   :
      displayStatus === 'medium' ? 'ring-amber-200 bg-amber-50/10' : 'ring-black/[0.06]',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between p-3.5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', cfg.dot)} />
          <span className="text-[12px] font-bold text-gray-800 truncate">{zone.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
          {/* Menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] py-1 min-w-[140px]" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">Edit Zone</button>
                <button onClick={() => { onAddSensor(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">Add Sensor</button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50">Delete Zone</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Readings */}
      <div className="px-3.5 pb-3">
        {derived ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[
              { label: 'Temp',     val: `${derived.temp} °C`,    hi: derived.status === 'high' },
              { label: 'Humidity', val: `${derived.hum} %`,      hi: derived.status !== 'good' },
              { label: 'Moisture', val: `${derived.moist} %`,    hi: false },
              { label: 'CO₂',      val: `${derived.co2} ppm`,   hi: false },
              { label: 'AQI',      val: String(derived.aqi),     hi: false },
            ].map(r => (
              <div key={r.label} className="flex items-baseline justify-between gap-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{r.label}</span>
                <span className={cn('text-[11px] font-bold tabular-nums', r.hi ? 'text-red-600' : 'text-gray-700')}>{r.val}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 font-medium py-1">No live data</p>
        )}
      </div>

      {/* Sensor count + expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2 border-t border-gray-100 hover:bg-gray-50/80 transition-colors rounded-b-xl"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          <span className="text-[10px] font-semibold text-gray-400">
            {sensors.length} sensor{sensors.length !== 1 ? 's' : ''}
            {faultySensors > 0 && <span className="text-red-500 ml-1">· {faultySensors} faulty</span>}
          </span>
        </div>
        <svg className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', expanded ? 'rotate-180' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* Expanded sensor list */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-1.5">
          {sensors.length === 0 ? (
            <p className="text-[10px] text-gray-400 font-medium text-center py-1">No sensors configured</p>
          ) : sensors.map(s => {
            const sCfg = SENSOR_STATUS_CFG[s.status];
            return (
              <div key={s.id} className="flex items-center gap-2 group">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', sCfg.dot)} />
                <span className="text-[11px] text-gray-700 font-medium flex-1 truncate">{s.name}</span>
                <span className="text-[9px] text-gray-400 font-semibold flex-shrink-0">{SENSOR_TYPE_LABELS[s.type]}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEditSensor(s)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100">
                    <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => onDeleteSensor(s)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50">
                    <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
          <button onClick={onAddSensor} className="w-full mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#1f5135] hover:text-[#174028] py-1 rounded-lg hover:bg-green-50 transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Sensor
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StorageUnitsPage() {
  const { readings } = useLiveData();
  const { warehouses, loading: whLoading } = useWarehouses();
  const totalZoneCount = useTotalZoneCount();

  const [selectedWhId,   setSelectedWhId]   = useState<string | null>(null);
  const [whSearch,       setWhSearch]       = useState('');
  const [whFilter,       setWhFilter]       = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [whModal,       setWhModal]       = useState<{ mode: 'add' | 'edit'; wh?: ManagedWarehouse } | null>(null);
  const [deletingWh,    setDeletingWh]    = useState<ManagedWarehouse | null>(null);
  const [zoneModal,     setZoneModal]     = useState<{ mode: 'add' | 'edit'; zone?: ManagedZone } | null>(null);
  const [deletingZone,  setDeletingZone]  = useState<ManagedZone | null>(null);
  const [sensorModal,   setSensorModal]   = useState<{ mode: 'add' | 'edit'; zoneId: string; sensor?: ManagedSensor } | null>(null);
  const [deletingSensor, setDeletingSensor] = useState<ManagedSensor | null>(null);

  // Zone + sensor data for selected warehouse
  const { zones, loading: zoneLoading } = useZones(selectedWhId);
  const allSensors = useSensorsForWarehouse(selectedWhId);

  // Seed defaults on mount
  useEffect(() => { seedDefaultStorageIfEmpty(); }, []);

  // Auto-select first warehouse
  useEffect(() => {
    if (!selectedWhId && warehouses.length > 0) setSelectedWhId(warehouses[0].id);
  }, [warehouses, selectedWhId]);

  const selectedWh    = warehouses.find(w => w.id === selectedWhId) ?? null;
  const liveReading   = selectedWh?.liveEngineId ? (readings[selectedWh.liveEngineId] ?? null) : null;

  // Summary stats
  const totals = useMemo(() => {
    const active = warehouses.filter(w => w.status === 'active');
    const activeReadings = active
      .map(w => w.liveEngineId ? readings[w.liveEngineId] : null)
      .filter(Boolean) as LiveSensorReading[];
    const avgTemp    = activeReadings.length
      ? +(activeReadings.reduce((s, r) => s + r.temperature, 0) / activeReadings.length).toFixed(1) : null;
    const avgHum     = activeReadings.length
      ? Math.round(activeReadings.reduce((s, r) => s + r.humidity, 0) / activeReadings.length) : null;
    const highRisk   = activeReadings.filter(r => r.status === 'high').length;
    const totalCap   = warehouses.reduce((s, w) => s + w.capacity, 0);
    return { total: warehouses.length, active: active.length, avgTemp, avgHum, highRisk, totalCap };
  }, [warehouses, readings]);

  // Filtered warehouse list
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

  // Capacity of selected WH
  const usedPct = liveReading ? Math.round(liveReading.capacity) : 0;
  const usedTons = selectedWh ? Math.round(selectedWh.capacity * usedPct / 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {whModal?.mode === 'add'  && <WarehouseModal onClose={() => setWhModal(null)} />}
      {whModal?.mode === 'edit' && whModal.wh && <WarehouseModal wh={whModal.wh} onClose={() => setWhModal(null)} />}
      {deletingWh && (
        <DeleteConfirm
          title={`Delete ${deletingWh.name}?`}
          desc="All zones and sensors inside will also be permanently removed."
          onConfirm={async () => { await deleteWarehouse(deletingWh.id); if (selectedWhId === deletingWh.id) setSelectedWhId(null); }}
          onClose={() => setDeletingWh(null)}
        />
      )}
      {zoneModal?.mode === 'add'  && selectedWhId && <ZoneModal warehouseId={selectedWhId} onClose={() => setZoneModal(null)} />}
      {zoneModal?.mode === 'edit' && zoneModal.zone && <ZoneModal zone={zoneModal.zone} warehouseId={zoneModal.zone.warehouseId} onClose={() => setZoneModal(null)} />}
      {deletingZone && (
        <DeleteConfirm
          title={`Delete ${deletingZone.name}?`}
          desc="All sensors in this zone will also be removed."
          onConfirm={() => deleteZone(deletingZone.id)}
          onClose={() => setDeletingZone(null)}
        />
      )}
      {sensorModal && (
        sensorModal.mode === 'add'
          ? <SensorModal zoneId={sensorModal.zoneId} warehouseId={selectedWhId!} onClose={() => setSensorModal(null)} />
          : sensorModal.sensor && <SensorModal sensor={sensorModal.sensor} zoneId={sensorModal.zoneId} warehouseId={selectedWhId!} onClose={() => setSensorModal(null)} />
      )}
      {deletingSensor && (
        <DeleteConfirm
          title={`Remove ${deletingSensor.name}?`}
          desc="The sensor record will be deleted from this zone."
          onConfirm={() => deleteSensor(deletingSensor.id)}
          onClose={() => setDeletingSensor(null)}
        />
      )}

      <DashboardHeader title="Storage Units" subtitle="Manage warehouses, zones, and sensors" />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <MetricCard
              label="Warehouses" value={totals.total} sub={`${totals.active} active`}
              color="bg-blue-50"
              icon={<svg className="w-4.5 h-4.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            />
            <MetricCard
              label="Total Zones" value={totalZoneCount ?? '—'} sub="Across all warehouses"
              color="bg-purple-50"
              icon={<svg className="w-4.5 h-4.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
            />
            <MetricCard
              label="Avg Temperature" value={totals.avgTemp !== null ? `${totals.avgTemp} °C` : '—'} sub="Active warehouses"
              color="bg-amber-50"
              icon={<svg className="w-4.5 h-4.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
            />
            <MetricCard
              label="Avg Humidity" value={totals.avgHum !== null ? `${totals.avgHum} %` : '—'} sub="Active warehouses"
              color="bg-sky-50"
              icon={<svg className="w-4.5 h-4.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>}
            />
            <MetricCard
              label="High Risk Units" value={totals.highRisk} sub={totals.highRisk > 0 ? 'Needs attention' : 'All clear'}
              color="bg-red-50"
              icon={<svg className="w-4.5 h-4.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
          </div>
        </div>

        {/* ── Two-panel area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 px-5 pb-5 overflow-hidden">

          {/* Left: Warehouse list */}
          <div className="lg:w-64 xl:w-72 flex-shrink-0 flex flex-col min-h-0 bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm overflow-hidden">
            {/* Search + filter */}
            <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text" placeholder="Search warehouses…" value={whSearch}
                  onChange={e => setWhSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1f5135]/30"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button key={f} onClick={() => setWhFilter(f)} className={cn(
                    'flex-1 text-[10px] font-bold py-1 rounded-lg capitalize transition-colors',
                    whFilter === f ? 'bg-[#1f5135] text-white' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100',
                  )}>{f}</button>
                ))}
              </div>
            </div>

            {/* Warehouse list (scrollable) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {whLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#1f5135]/30 border-t-[#1f5135] rounded-full animate-spin" />
                </div>
              ) : filteredWhs.length === 0 ? (
                <p className="text-[11px] text-gray-400 font-medium text-center py-6">No warehouses found</p>
              ) : filteredWhs.map(wh => {
                const liveStatus = wh.liveEngineId ? readings[wh.liveEngineId]?.status : undefined;
                return (
                  <WarehouseItem
                    key={wh.id} wh={wh} selected={wh.id === selectedWhId}
                    liveStatus={liveStatus} onSelect={() => setSelectedWhId(wh.id)}
                  />
                );
              })}
            </div>

            {/* Add warehouse */}
            <div className="p-2.5 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setWhModal({ mode: 'add' })}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#1f5135] hover:text-white hover:bg-[#1f5135] py-2 rounded-xl border-2 border-dashed border-[#1f5135]/30 hover:border-transparent transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Warehouse
              </button>
            </div>
          </div>

          {/* Right: Selected warehouse detail */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-4">
            {!selectedWh ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <p className="text-[13px] font-semibold">Select a warehouse to view details</p>
              </div>
            ) : (
              <>
                {/* Warehouse detail header */}
                <Card className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-[16px] font-black text-gray-900">{selectedWh.name}</h2>
                        {selectedWh.liveEngineId && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{selectedWh.liveEngineId}</span>
                        )}
                        <Badge status={selectedWh.status === 'inactive' ? 'inactive' : (liveReading?.status ?? 'good')} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{selectedWh.location || 'No location set'}</p>

                      {/* Capacity bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Capacity</span>
                          <span className="text-[11px] font-bold text-gray-700">
                            {usedTons.toLocaleString()} / {selectedWh.capacity.toLocaleString()} Tons
                            <span className="text-gray-400 font-medium ml-1">({usedPct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500',
                              usedPct >= 85 ? 'bg-red-400' : usedPct >= 75 ? 'bg-amber-400' : 'bg-[#1f5135]'
                            )}
                            style={{ width: `${Math.min(usedPct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Live readings row */}
                      {liveReading && (
                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                          {[
                            { label: 'Temp',     val: `${liveReading.temperature.toFixed(1)} °C` },
                            { label: 'Humidity', val: `${liveReading.humidity} %` },
                            { label: 'Moisture', val: `${liveReading.moisture.toFixed(1)} %` },
                            { label: 'CO₂',      val: `${liveReading.co2} ppm` },
                            { label: 'AQI',      val: String(liveReading.aqi) },
                          ].map(r => (
                            <div key={r.label} className="flex items-baseline gap-1">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{r.label}</span>
                              <span className="text-[12px] font-bold text-gray-700 tabular-nums">{r.val}</span>
                            </div>
                          ))}
                          <span className="flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full ml-auto">
                            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"/></span>
                            LIVE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => setWhModal({ mode: 'edit', wh: selectedWh })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingWh(selectedWh)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Zones grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-[14px] font-black text-gray-900">
                        Zones
                        <span className="ml-2 text-[11px] font-semibold text-gray-400">
                          {zoneLoading ? '…' : zones.length}
                        </span>
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">Each zone shows live derived readings</p>
                    </div>
                    <button
                      onClick={() => setZoneModal({ mode: 'add' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[#1f5135] rounded-lg hover:bg-[#174028] transition-colors shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Zone
                    </button>
                  </div>

                  {zoneLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-[#1f5135]/30 border-t-[#1f5135] rounded-full animate-spin" />
                    </div>
                  ) : zones.length === 0 ? (
                    <Card className="p-10 text-center">
                      <svg className="w-10 h-10 mx-auto mb-3 opacity-20 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      <p className="text-[13px] font-semibold text-gray-400 mb-3">No zones yet</p>
                      <button
                        onClick={() => setZoneModal({ mode: 'add' })}
                        className="px-4 py-2 text-[12px] font-bold text-white bg-[#1f5135] rounded-lg hover:bg-[#174028] transition-colors"
                      >
                        Add First Zone
                      </button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {zones.map((zone, idx) => {
                        const zoneSensors = allSensors.filter(s => s.zoneId === zone.id);
                        return (
                          <ZoneCard
                            key={zone.id}
                            zone={zone}
                            reading={liveReading}
                            idx={idx}
                            total={zones.length}
                            sensors={zoneSensors}
                            onEdit={() => setZoneModal({ mode: 'edit', zone })}
                            onDelete={() => setDeletingZone(zone)}
                            onAddSensor={() => setSensorModal({ mode: 'add', zoneId: zone.id })}
                            onEditSensor={s => setSensorModal({ mode: 'edit', zoneId: zone.id, sensor: s })}
                            onDeleteSensor={s => setDeletingSensor(s)}
                          />
                        );
                      })}
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
