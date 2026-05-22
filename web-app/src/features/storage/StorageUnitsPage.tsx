'use client';

import { useState, useRef } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ZoneSummaryDonut } from '@/components/charts/ZoneSummaryDonut';
import { CapacityGaugeChart } from '@/components/charts/CapacityGaugeChart';
import { EnvironmentalStabilityChart } from '@/components/charts/EnvironmentalStabilityChart';
import {
  storageZones,
  topCriticalZones,
  campusBuildings,
  stabilitySeriesConfig,
  warehouseActivity,
  type StorageStatus,
  type RiskLevel,
  type TrendDir,
  type ZoneStatus,
  type ActivityType,
} from './mockData';
import { useFirestoreStorage as useStorageData } from '@/lib/useFirestoreData';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const storageStatusConfig: Record<StorageStatus, { badge: string; label: string; dot: string; buildingFill: string; buildingStroke: string; roofFill: string }> = {
  good:     { badge: 'bg-green-50 text-green-700',  label: 'Good',     dot: 'bg-green-400',  buildingFill: '#d1fae5', buildingStroke: '#6ee7b7', roofFill: '#a7f3d0' },
  medium:   { badge: 'bg-amber-50 text-amber-700',  label: 'Medium',   dot: 'bg-amber-400',  buildingFill: '#fef3c7', buildingStroke: '#fcd34d', roofFill: '#fde68a' },
  high:     { badge: 'bg-red-50 text-red-600',      label: 'High',     dot: 'bg-red-400',    buildingFill: '#fee2e2', buildingStroke: '#fca5a5', roofFill: '#fecaca' },
  inactive: { badge: 'bg-gray-100 text-gray-400',   label: 'Inactive', dot: 'bg-gray-300',   buildingFill: '#f3f4f6', buildingStroke: '#d1d5db', roofFill: '#e5e7eb' },
};

const riskConfig: Record<RiskLevel, { badge: string; label: string }> = {
  low:      { badge: 'bg-green-50 text-green-700',  label: 'Low'      },
  medium:   { badge: 'bg-amber-50 text-amber-700',  label: 'Medium'   },
  high:     { badge: 'bg-red-50 text-red-600',      label: 'High'     },
  inactive: { badge: 'bg-gray-100 text-gray-400',   label: 'Inactive' },
};

const zoneStatusConfig: Record<ZoneStatus, { badge: string; label: string; row: string }> = {
  good:     { badge: 'bg-green-50 text-green-700',  label: 'Good',     row: ''              },
  medium:   { badge: 'bg-amber-50 text-amber-700',  label: 'Medium',   row: 'bg-amber-50/40'},
  high:     { badge: 'bg-red-50 text-red-600',      label: 'High',     row: 'bg-red-50/40'  },
  inactive: { badge: 'bg-gray-100 text-gray-400',   label: 'Offline',  row: 'bg-gray-50'    },
};

// ─── Reusable ─────────────────────────────────────────────────────────────────

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

function DropdownBtn({ label, options, onChange }: {
  label: string;
  options?: string[];
  onChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(label);
  if (!options?.length) {
    return (
      <button className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150">
        {label}
        <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
      >
        {selected}
        <svg className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-150', open ? 'rotate-180' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] py-1 min-w-[140px] animate-fade-slide-in">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { setSelected(opt); onChange?.(opt); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-[11px] font-semibold transition-colors',
                opt === selected ? 'text-[#1f5135] bg-green-50' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────

function TrendIcon({ trend, riskContext = false }: { trend: TrendDir; riskContext?: boolean }) {
  if (trend === null) return <span className="text-gray-300 text-sm font-bold">—</span>;
  if (trend === 'stable') return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
  if (trend === 'slight-up') return (
    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="18" x2="19" y2="8" /><polyline points="12 5 19 8 19 15" />
    </svg>
  );
  if (trend === 'down') return (
    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="8" x2="19" y2="18" /><polyline points="12 20 19 17 19 10" />
    </svg>
  );
  // 'up'
  return (
    <svg className={cn('w-4 h-4', riskContext ? 'text-red-500' : 'text-green-500')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="18" x2="19" y2="6" /><polyline points="12 4 19 6 19 13" />
    </svg>
  );
}

// ─── Live activity feed ───────────────────────────────────────────────────────

const activityMeta: Record<ActivityType, { bg: string; dot: string; icon: React.ReactNode }> = {
  alert: {
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    icon: (
      <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    dot: 'bg-amber-400',
    icon: (
      <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50',
    dot: 'bg-blue-400',
    icon: (
      <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-green-50',
    dot: 'bg-green-400',
    icon: (
      <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  ai: {
    bg: 'bg-purple-50',
    dot: 'bg-purple-400',
    icon: (
      <svg className="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
};

const ACTIVITY_PREVIEW = 5;

function LiveActivityFeed() {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? warehouseActivity : warehouseActivity.slice(0, ACTIVITY_PREVIEW);

  return (
    <Card className="p-5 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-bold text-gray-900">Live Activity</h2>
          <span className="flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            LIVE
          </span>
        </div>
        <span className="text-[10px] font-semibold text-gray-400">Today</span>
      </div>

      {/* Feed */}
      <div className={cn('space-y-0 overflow-y-auto pr-0.5', expanded ? 'max-h-[400px]' : 'max-h-[220px]')}>
        {displayItems.map((item, i) => {
          const meta = activityMeta[item.type];
          return (
            <div
              key={item.id}
              className={cn(
                'group flex gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-150 cursor-default',
                i === 0 ? meta.bg : 'hover:bg-gray-50',
              )}
            >
              {/* Icon badge */}
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                i === 0 ? 'ring-2 ring-white shadow-sm' : '',
                meta.bg,
              )}>
                {meta.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-gray-700">{item.warehouse}</span>
                  {item.zone && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] font-semibold text-gray-500">{item.zone}</span>
                    </>
                  )}
                  {item.type === 'ai' && (
                    <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1 py-0 rounded uppercase tracking-wide">AI</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{item.message}</p>
              </div>

              {/* Time */}
              <span className="text-[9px] font-semibold text-gray-400 flex-shrink-0 mt-0.5 tabular-nums">{item.time}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-medium">{warehouseActivity.length} events today</span>
        {warehouseActivity.length > ACTIVITY_PREVIEW && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] font-semibold text-[#1f5135] hover:text-[#174028] transition-colors"
          >
            {expanded ? 'Show less' : `View all ${warehouseActivity.length} logs`}
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Campus map SVG ───────────────────────────────────────────────────────────

function CampusMap({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="relative w-full bg-[#eef2ee] dark:bg-[#111a14] rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: 310 }}>
      <svg viewBox="0 0 424 316" className="w-full h-full campus-svg" preserveAspectRatio="xMidYMid meet" style={{ minHeight: 310 }}>
        <defs>
          <pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e8f0e8" />
            <circle cx="4" cy="4" r="1" fill="#d4e8d4" opacity="0.6" />
          </pattern>
        </defs>

        {/* Ground */}
        <rect width="424" height="316" fill="url(#grass)" />

        {/* Roads */}
        <rect x="0"   y="100" width="424" height="14" fill="#d1d5db" />
        <rect x="0"   y="202" width="424" height="14" fill="#d1d5db" />
        <rect x="140" y="0"   width="14"  height="316" fill="#d1d5db" />
        <rect x="282" y="0"   width="14"  height="316" fill="#d1d5db" />

        {/* Road center lines */}
        <line x1="0" y1="107" x2="424" y2="107" stroke="white" strokeWidth="1" strokeDasharray="16 12" opacity="0.6" />
        <line x1="0" y1="209" x2="424" y2="209" stroke="white" strokeWidth="1" strokeDasharray="16 12" opacity="0.6" />
        <line x1="147" y1="0" x2="147" y2="316" stroke="white" strokeWidth="1" strokeDasharray="16 12" opacity="0.6" />
        <line x1="289" y1="0" x2="289" y2="316" stroke="white" strokeWidth="1" strokeDasharray="16 12" opacity="0.6" />

        {/* Buildings */}
        {campusBuildings.map((b) => {
          const cfg = storageStatusConfig[b.status];
          const isSelected = b.id === selectedId;
          return (
            <g
              key={b.id}
              onClick={() => onSelect(b.id)}
              style={{ cursor: 'pointer' }}
              className="group"
            >
              {/* Selection ring */}
              {isSelected && (
                <rect
                  x={b.x - 3} y={b.y - 3} width={b.w + 6} height={b.h + 6}
                  rx="6" fill="none" stroke="#1f5135" strokeWidth="2.5" opacity="0.8"
                />
              )}
              {/* Building body */}
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={cfg.buildingFill} stroke={cfg.buildingStroke} strokeWidth="1.5" />
              {/* Roof panel */}
              <rect x={b.x + 6} y={b.y + 6} width={b.w - 12} height={14} rx="2" fill={cfg.roofFill} opacity="0.8" />
              {/* Skylights */}
              {Array.from({ length: Math.floor((b.w - 24) / 20) }).map((_, i) => (
                <rect key={i} x={b.x + 14 + i * 20} y={b.y + 8} width="12" height="8" rx="1" fill="white" opacity="0.5" />
              ))}
              {/* Door */}
              <rect x={b.x + b.w / 2 - 8} y={b.y + b.h - 14} width="16" height="14" rx="2" fill={cfg.buildingStroke} opacity="0.6" />
              {/* WH Label */}
              <text x={b.x + b.w / 2} y={b.y + 36} textAnchor="middle" fontSize="10" fontWeight="800" fill={b.status === 'inactive' ? '#9ca3af' : '#1f2937'} letterSpacing="0.3">
                {b.id}
              </text>
              {/* Status badge */}
              <g transform={`translate(${b.x + b.w / 2 - 24}, ${b.y + 44})`}>
                <rect width="48" height="16" rx="8" fill={
                  b.status === 'good' ? '#22c55e' :
                  b.status === 'medium' ? '#f59e0b' :
                  b.status === 'high' ? '#ef4444' : '#9ca3af'
                } opacity="0.18" />
                <rect width="48" height="16" rx="8" fill="none" stroke={
                  b.status === 'good' ? '#22c55e' :
                  b.status === 'medium' ? '#f59e0b' :
                  b.status === 'high' ? '#ef4444' : '#9ca3af'
                } strokeWidth="1" opacity="0.5" />
                <circle cx="10" cy="8" r="3" fill={
                  b.status === 'good' ? '#22c55e' :
                  b.status === 'medium' ? '#f59e0b' :
                  b.status === 'high' ? '#ef4444' : '#9ca3af'
                } />
                <text x="17" y="11.5" fontSize="8.5" fontWeight="700" fill={
                  b.status === 'good' ? '#15803d' :
                  b.status === 'medium' ? '#92400e' :
                  b.status === 'high' ? '#991b1b' : '#6b7280'
                }>{cfg.label}</text>
              </g>
            </g>
          );
        })}

        {/* Compass */}
        <g transform="translate(404, 18)">
          <circle cx="0" cy="0" r="12" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
          <text x="0" y="-4" textAnchor="middle" fontSize="8" fill="#1f5135" fontWeight="800">N</text>
          <line x1="0" y1="-2" x2="0" y2="4" stroke="#1f5135" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Scale */}
        <line x1="16" y1="302" x2="76" y2="302" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="46" y="313" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">500m</text>
      </svg>
    </div>
  );
}

// ─── All Zones Modal ──────────────────────────────────────────────────────────

const RISK_ORDER: Record<ZoneStatus, number> = { high: 0, medium: 1, good: 2, inactive: 3 };

function AllZonesModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ZoneStatus | 'all'>('all');

  const allZones = Object.entries(storageZones).flatMap(([wh, zones]) =>
    zones.map(z => ({ ...z, warehouse: wh }))
  ).sort((a, b) => RISK_ORDER[a.status] - RISK_ORDER[b.status]);

  const filtered = allZones.filter(z => {
    if (filterStatus !== 'all' && z.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return z.warehouse.toLowerCase().includes(q) || z.label.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    high:   allZones.filter(z => z.status === 'high').length,
    medium: allZones.filter(z => z.status === 'medium').length,
    good:   allZones.filter(z => z.status === 'good').length,
    inactive: allZones.filter(z => z.status === 'inactive').length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-black text-gray-900">All Storage Zones</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{allZones.length} zones across all warehouses</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Filters + Search */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 flex-wrap">
          {/* Status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { value: 'all',      label: `All (${allZones.length})`,      cls: '' },
              { value: 'high',     label: `High Risk (${counts.high})`,    cls: 'text-red-600' },
              { value: 'medium',   label: `Medium (${counts.medium})`,     cls: 'text-amber-600' },
              { value: 'good',     label: `Good (${counts.good})`,         cls: 'text-green-600' },
              { value: 'inactive', label: `Inactive (${counts.inactive})`, cls: 'text-gray-400' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value as ZoneStatus | 'all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                  filterStatus === f.value
                    ? 'bg-[#1f5135] text-white shadow-sm'
                    : `bg-gray-50 border border-gray-200 hover:bg-gray-100 ${f.cls || 'text-gray-600'}`,
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative ml-auto">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search warehouse or zone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[11px] font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1f5135]/40 w-52"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                {['Warehouse', 'Zone', 'Status', 'Temperature', 'Humidity', 'Moisture', 'CO₂', 'AQI', 'Trend'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9.5px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-gray-400 font-medium">
                    No zones match your filter
                  </td>
                </tr>
              ) : filtered.map((z, i) => {
                const cfg = zoneStatusConfig[z.status];
                return (
                  <tr key={i} className={cn('hover:bg-gray-50 transition-colors', cfg.row)}>
                    <td className="px-4 py-2.5 font-bold text-gray-800">{z.warehouse}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{z.label}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-[9.5px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className={cn('px-4 py-2.5 font-bold tabular-nums', z.status === 'high' ? 'text-red-600' : z.status === 'medium' ? 'text-amber-700' : 'text-gray-700')}>
                      {z.temp !== null ? `${z.temp} °C` : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-600 tabular-nums">{z.humidity !== null ? `${z.humidity} %` : '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-600 tabular-nums">{z.moisture !== null ? `${z.moisture} %` : '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-500 tabular-nums">{z.co2 !== null ? `${z.co2} ppm` : '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-500 tabular-nums">{z.aqi ?? '—'}</td>
                    <td className="px-4 py-2.5"><TrendIcon trend={z.trend} riskContext={z.status === 'high' || z.status === 'medium'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <p className="text-[11px] text-gray-400 font-medium">Showing {filtered.length} of {allZones.length} zones</p>
        </div>
      </div>
    </div>
  );
}

// ─── Warehouse table ──────────────────────────────────────────────────────────

const WH_STATUS_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'good',     label: 'Good' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High Risk' },
  { value: 'inactive', label: 'Inactive' },
] as const;

function WarehouseTable({ selectedId, onSelect, statusFilter, setStatusFilter }: {
  selectedId: string;
  onSelect: (id: string) => void;
  statusFilter: StorageStatus | 'all';
  setStatusFilter: (v: StorageStatus | 'all') => void;
}) {
  const { warehouses: storageWarehouses } = useStorageData();

  const filtered = statusFilter === 'all'
    ? storageWarehouses
    : storageWarehouses.filter((w) => w.status === statusFilter);

  return (
    <div>
      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {WH_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors duration-150',
              statusFilter === f.value
                ? 'bg-[#1f5135] text-white shadow-sm'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

    <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
      <table className="w-full text-[12px] whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Warehouse', 'Status', 'Capacity', 'Used', 'Risk Level', 'Trend', 'Last Updated'].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[10px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map((wh) => {
            const sCfg = storageStatusConfig[wh.status];
            const rCfg = riskConfig[wh.risk];
            const usedPct = wh.capacity > 0 ? Math.round((wh.used / wh.capacity) * 100) : 0;
            const isSelected = wh.id === selectedId;
            return (
              <tr
                key={wh.id}
                onClick={() => onSelect(wh.id)}
                className={cn(
                  'cursor-pointer transition-colors duration-150',
                  isSelected ? 'bg-[#1f5135]/[0.05]' : 'hover:bg-gray-50',
                )}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {isSelected && <span className="w-1 h-4 rounded-full bg-[#1f5135] flex-shrink-0" />}
                    <span className="font-bold text-gray-800">{wh.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sCfg.badge)}>
                    {sCfg.label}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-gray-700">
                  {wh.capacity.toLocaleString()} Tons
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1 min-w-[80px]">
                    <span className="font-semibold text-gray-700">{wh.used.toLocaleString()} Tons</span>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', usedPct >= 85 ? 'bg-red-400' : usedPct >= 75 ? 'bg-amber-400' : 'bg-[#1f5135]')}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{usedPct}%</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', rCfg.badge)}>
                    {rCfg.label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <TrendIcon trend={wh.trend} riskContext={wh.risk === 'high' || wh.risk === 'medium'} />
                </td>
                <td className="px-3 py-3 text-gray-400 font-medium">
                  {wh.lastUpdate ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
        Showing {filtered.length} of {storageWarehouses.length} warehouses
      </div>
    </div>
    </div>
  );
}

// ─── Zone detail tabs ─────────────────────────────────────────────────────────

const TABS = ['Zones', 'Details', 'Environment', 'History'] as const;
type Tab = typeof TABS[number];

function ZoneDetailTable({ warehouseId }: { warehouseId: string }) {
  const zones = storageZones[warehouseId] ?? [];
  return (
    <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
      <table className="w-full text-[11px] whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Zone', 'Temperature', 'Humidity', 'Moisture', 'CO₂', 'AQI', 'Status', 'Trend'].map((h) => (
              <th key={h} className="px-2.5 py-2 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {zones.map((z) => {
            const cfg = zoneStatusConfig[z.status];
            return (
              <tr key={z.id} className={cn('hover:bg-gray-50 transition-colors', cfg.row)}>
                <td className="px-2.5 py-2.5 font-bold text-gray-700">{z.label}</td>
                <td className={cn('px-2.5 py-2.5 font-semibold', z.status === 'high' ? 'text-red-600' : 'text-gray-700')}>
                  {z.temp != null ? `${z.temp.toFixed(1)} °C` : '—'}
                </td>
                <td className={cn('px-2.5 py-2.5 font-semibold', (z.status === 'medium' || z.status === 'high') ? 'text-amber-600' : 'text-gray-700')}>
                  {z.humidity != null ? `${z.humidity} %` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700">
                  {z.moisture != null ? `${z.moisture} %` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700">
                  {z.co2 != null ? `${z.co2} ppm` : '—'}
                </td>
                <td className="px-2.5 py-2.5 font-semibold text-gray-700">
                  {z.aqi != null ? z.aqi : '—'}
                </td>
                <td className="px-2.5 py-2.5">
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', cfg.badge)}>
                    {cfg.label}
                  </span>
                </td>
                <td className="px-2.5 py-2.5">
                  <TrendIcon trend={z.trend} riskContext={z.status === 'high' || z.status === 'medium'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TabPlaceholder({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <svg className="w-8 h-8 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
      </svg>
      <p className="text-[12px] font-semibold">{tab} data coming soon</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StorageUnitsPage() {
  const { warehouses: storageWarehouses, totals: storageTotals, stabilityData, zoneSummary } = useStorageData();
  const [selectedWH, setSelectedWH] = useState('WH-C');
  const [activeTab, setActiveTab] = useState<Tab>('Zones');
  const [stabilityDays, setStabilityDays] = useState<7 | 14 | 30>(7);
  const [whStatusFilter, setWhStatusFilter] = useState<StorageStatus | 'all'>('all');
  const [showAllZones, setShowAllZones] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  function scrollToTableWithFilter(filter: StorageStatus | 'all') {
    setWhStatusFilter(filter);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  const selectedWarehouse = storageWarehouses.find((w) => w.id === selectedWH) ?? storageWarehouses[0];
  const safeCap = Math.round(selectedWarehouse.capacity * 0.8);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {showAllZones && <AllZonesModal onClose={() => setShowAllZones(false)} />}
      <DashboardHeader
        title="Storage Units"
        subtitle="Monitor and manage all warehouses and storage zones"
      />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Top Metric Cards ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Warehouses */}
          <button
            onClick={() => scrollToTableWithFilter('all')}
            className="text-left w-full"
          >
            <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ring-1 ring-transparent hover:ring-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Warehouses</p>
                  <p className="text-[24px] font-bold text-gray-900 leading-none mt-1">{storageTotals.totalWarehouses}</p>
                  <p className="text-[11px] font-semibold text-blue-600 mt-0.5">Active · View all →</p>
                </div>
              </div>
            </Card>
          </button>

          {/* Total Zones */}
          <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Zones</p>
                <p className="text-[24px] font-bold text-gray-900 leading-none mt-1">{storageTotals.totalZones}</p>
                <p className="text-[11px] font-semibold text-purple-600 mt-0.5">Active</p>
              </div>
            </div>
          </Card>

          {/* Total Capacity */}
          <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Capacity</p>
                <p className="text-[20px] font-bold text-gray-900 leading-none mt-1">{storageTotals.totalCapacity.toLocaleString()}<span className="text-[13px] font-semibold text-gray-500 ml-1">Tons</span></p>
                <p className="text-[11px] text-gray-400 mt-0.5">Used: {storageTotals.totalUsed.toLocaleString()} Tons ({Math.round(storageTotals.totalUsed / storageTotals.totalCapacity * 100)}%)</p>
                <div className="mt-1.5 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#1f5135] rounded-full" style={{ width: `${Math.round(storageTotals.totalUsed / storageTotals.totalCapacity * 100)}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Avg Temp */}
          <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avg Temperature</p>
                <p className="text-[24px] font-bold text-gray-900 leading-none mt-1">{storageTotals.avgTemp}<span className="text-[14px] font-semibold text-gray-500"> °C</span></p>
                <p className="text-[11px] font-semibold text-green-600 mt-0.5">Normal</p>
              </div>
            </div>
          </Card>

          {/* Avg Humidity */}
          <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avg Humidity</p>
                <p className="text-[24px] font-bold text-gray-900 leading-none mt-1">{storageTotals.avgHumidity}<span className="text-[14px] font-semibold text-gray-500"> %</span></p>
                <p className="text-[11px] font-semibold text-green-600 mt-0.5">Normal</p>
              </div>
            </div>
          </Card>

          {/* High Risk Units */}
          <button
            onClick={() => scrollToTableWithFilter('high')}
            className="text-left w-full"
          >
            <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ring-1 ring-transparent hover:ring-red-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">High Risk Units</p>
                  <p className="text-[24px] font-bold text-red-500 leading-none mt-1">{storageTotals.highRiskUnits}</p>
                  <p className="text-[11px] font-semibold text-red-500 mt-0.5">Tap to inspect →</p>
                </div>
              </div>
            </Card>
          </button>
        </section>

        {/* ── Warehouse Overview ────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,260px)] gap-5">

          {/* Left: Campus Map + Live Activity */}
          <div className="flex flex-col gap-4 min-w-0">
            <Card className="p-5 min-w-0">
              <SectionHeader
                title="Warehouse Overview"
                subtitle="Click a warehouse to inspect"
                action={<DropdownBtn label="All Warehouses" options={['All Warehouses', 'WH-A', 'WH-B', 'WH-C', 'WH-D', 'WH-E', 'WH-F', 'WH-G']} onChange={(v) => v !== 'All Warehouses' && setSelectedWH(v)} />}
              />
              <CampusMap selectedId={selectedWH} onSelect={setSelectedWH} />
            </Card>
            <LiveActivityFeed />
          </div>

          {/* Center: Warehouse Table */}
          <div ref={tableRef}>
            <Card className="p-5 min-w-0 overflow-hidden">
              <SectionHeader
                title="All Warehouses"
                subtitle="Operational status and capacity"
                action={<DropdownBtn label="All Warehouses" options={['All Warehouses', 'WH-A', 'WH-B', 'WH-C', 'WH-D', 'WH-E', 'WH-F', 'WH-G']} onChange={(v) => v !== 'All Warehouses' && setSelectedWH(v)} />}
              />
              <WarehouseTable
                selectedId={selectedWH}
                onSelect={setSelectedWH}
                statusFilter={whStatusFilter}
                setStatusFilter={setWhStatusFilter}
              />
            </Card>
          </div>

          {/* Right: Zone Summary + Critical Zones */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Zone Summary donut */}
            <Card className="p-5">
              <h2 className="text-[14px] font-bold text-gray-900 mb-1">Zone Summary</h2>
              <p className="text-[11px] text-gray-400 mb-3">All Warehouses</p>
              <ZoneSummaryDonut />
              <div className="mt-3 space-y-2">
                {zoneSummary.map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] font-medium text-gray-600 flex-1">{d.label}</span>
                    <span className="text-[11px] font-bold text-gray-700">{d.count}</span>
                    <span className="text-[10px] text-gray-400 w-12 text-right">({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Critical Zones */}
            <Card className="p-5 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-bold text-gray-900">Top 5 Critical Zones</h2>
                <button
                  onClick={() => setShowAllZones(true)}
                  className="text-[11px] font-semibold text-[#1f5135] hover:text-[#174028] transition-colors underline-offset-2 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2.5">
                {topCriticalZones.map((z, i) => {
                  const rCfg = riskConfig[z.risk];
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[12px] font-bold text-gray-800 truncate">{z.warehouse} · {z.zone}</span>
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', rCfg.badge)}>
                            {rCfg.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {z.temp}°C | {z.humidity}% | {z.moisture}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>

        {/* ── Detail Analytics Section ──────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,240px)_minmax(0,320px)] gap-5">

          {/* Left: Warehouse Detail with Tabs */}
          <Card className="p-5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-bold text-gray-900">{selectedWarehouse.name}</h2>
                  <span className="text-[10px] font-semibold text-gray-400">Main Storage</span>
                  {selectedWarehouse.risk === 'high' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      High Risk
                    </span>
                  )}
                  {selectedWarehouse.risk === 'medium' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Medium Risk
                    </span>
                  )}
                  {selectedWarehouse.risk === 'low' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Low Risk
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Last updated: {selectedWarehouse.lastUpdate ?? 'Offline'}
                </p>
              </div>
              <DropdownBtn label="All Zones" options={['All Zones', 'Zone A', 'Zone B', 'Zone C', 'Zone D']} />
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200 mb-4">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 text-[12px] font-semibold transition-all duration-150 border-b-2 -mb-px',
                    activeTab === tab
                      ? 'text-[#1f5135] border-[#1f5135]'
                      : 'text-gray-500 border-transparent hover:text-gray-700',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'Zones' ? (
              <ZoneDetailTable warehouseId={selectedWH} />
            ) : (
              <TabPlaceholder tab={activeTab} />
            )}

            <button className="mt-3 text-[12px] font-semibold text-[#1f5135] hover:text-[#174028] transition-colors flex items-center gap-1">
              View Full Details
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </Card>

          {/* Center: Capacity Utilization */}
          <Card className="p-5 min-w-0">
            <SectionHeader title="Capacity Utilization" subtitle={selectedWarehouse.name} />
            <div className="flex flex-col items-center">
              <CapacityGaugeChart capacity={selectedWarehouse.capacity} used={selectedWarehouse.used} />

              {/* Breakdown */}
              <div className="w-full mt-4 space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-gray-500">Safe Capacity (80%)</span>
                  <span className="text-[12px] font-bold text-green-700">{safeCap.toLocaleString()} Tons</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-gray-500">Current Used</span>
                  <span className={cn('text-[12px] font-bold', selectedWarehouse.used > safeCap ? 'text-red-600' : 'text-gray-800')}>
                    {selectedWarehouse.used.toLocaleString()} Tons
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-gray-500">Remaining Capacity</span>
                  <span className="text-[12px] font-bold text-gray-700">
                    {(selectedWarehouse.capacity - selectedWarehouse.used).toLocaleString()} Tons
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-[12px] font-semibold text-gray-600">Total Capacity</span>
                  <span className="text-[12px] font-bold text-gray-900">
                    {selectedWarehouse.capacity.toLocaleString()} Tons
                  </span>
                </div>
              </div>

              {/* Status pill */}
              {selectedWarehouse.used > safeCap && (
                <div className="mt-3 w-full flex items-center gap-2 px-3 py-2 bg-amber-50 ring-1 ring-amber-200 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                  </svg>
                  <p className="text-[11px] font-semibold text-amber-700">Exceeds safe capacity threshold</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Environmental Stability */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Environmental Stability"
              subtitle="All Warehouses — Stability Index (0–100)"
              action={
                <select
                  value={stabilityDays}
                  onChange={(e) => setStabilityDays(Number(e.target.value) as 7 | 14 | 30)}
                  className="h-7 px-2 pr-6 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 cursor-pointer"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              }
            />
            <p className="text-[10px] font-semibold text-gray-400 mb-2">Stability Index</p>
            <EnvironmentalStabilityChart days={stabilityDays} />
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
              {stabilitySeriesConfig.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                  <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Card>
        </section>

      </main>
    </div>
  );
}
