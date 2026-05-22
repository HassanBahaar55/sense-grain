'use client';

import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useDashboardData, type WHStatus, type DashAlert } from '@/lib/dataEngine';
import { cn } from '@/lib/utils';

type WarehouseStatus = WHStatus;
type AlertSeverity = 'high' | 'medium';

// ─── Configs ──────────────────────────────────────────────────────────────────

const statusCfg: Record<WarehouseStatus, {
  bar: string; tileBg: string; badge: string; label: string; valCls: string;
}> = {
  good:     { bar: 'bg-green-400', tileBg: '',                  badge: 'bg-green-50 text-green-700 ring-green-200',  label: 'Good',     valCls: 'text-gray-800' },
  medium:   { bar: 'bg-amber-400', tileBg: 'bg-amber-50/40',    badge: 'bg-amber-50 text-amber-700 ring-amber-200',  label: 'Watch',    valCls: 'text-amber-800' },
  high:     { bar: 'bg-red-400',   tileBg: 'bg-red-50/40',      badge: 'bg-red-50 text-red-600 ring-red-200',        label: 'Critical', valCls: 'text-red-600' },
  inactive: { bar: 'bg-gray-200',  tileBg: 'bg-gray-50/70',     badge: 'bg-gray-100 text-gray-400 ring-gray-200',   label: 'Offline',  valCls: 'text-gray-400' },
};

const alertCfg: Record<AlertSeverity, {
  bar: string; bg: string; ring: string; badge: string; label: string; dot: string; valCls: string;
}> = {
  high:   { bar: 'bg-red-400',   bg: 'bg-red-50/50',   ring: 'ring-red-100/80',   badge: 'bg-red-100 text-red-700',    label: 'High',   dot: 'bg-red-400',   valCls: 'text-red-600'   },
  medium: { bar: 'bg-amber-400', bg: 'bg-amber-50/50', ring: 'ring-amber-100/80', badge: 'bg-amber-100 text-amber-700', label: 'Medium', dot: 'bg-amber-400', valCls: 'text-amber-700' },
};


// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartbeatIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function SiloIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accentBar: string;
  iconWrap: string;
  iconCls: string;
  valueCls?: string;
  pill?: { text: string; cls: string };
}

function MetricCard({ label, value, sub, icon, accentBar, iconWrap, iconCls, valueCls, pill }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className={cn('h-[3px] w-full', accentBar)} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-2">{label}</p>
            <p className={cn('text-[30px] font-black tracking-tight leading-none', valueCls ?? 'text-gray-900')}>
              {value}
            </p>
          </div>
          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110', iconWrap)}>
            <span className={iconCls}>{icon}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100/80">
          <p className="text-[11.5px] text-gray-500 leading-none">{sub}</p>
          {pill && (
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 leading-none', pill.cls)}>
              {pill.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Warehouse tile ───────────────────────────────────────────────────────────

function WarehouseTile({ wh }: { wh: { id: string; status: WHStatus; temp: number | null; humidity: number | null; moisture: number | null } }) {
  const cfg = statusCfg[wh.status];
  return (
    <div className={cn(
      'rounded-xl ring-1 ring-black/[0.07] overflow-hidden',
      'hover:shadow-md hover:-translate-y-[3px] hover:ring-black/[0.12] transition-all duration-200 cursor-pointer group',
      cfg.tileBg || 'bg-white',
    )}>
      <div className={cn('h-[4px]', cfg.bar)} />
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-gray-900 tracking-tight">{wh.id}</span>
          <span className={cn('text-[9.5px] font-bold px-2 py-[3px] rounded-full ring-1 leading-none', cfg.badge)}>
            {cfg.label}
          </span>
        </div>
        {wh.temp !== null ? (
          <div className="space-y-[5px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400">Temp</span>
              <span className={cn('text-[12px] font-bold tabular-nums', cfg.valCls)}>{wh.temp}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400">Humidity</span>
              <span className={cn('text-[12px] font-bold tabular-nums', cfg.valCls)}>{wh.humidity}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400">Moisture</span>
              <span className="text-[12px] font-bold tabular-nums text-gray-700">{wh.moisture}%</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 opacity-20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <span className="text-[9.5px] text-gray-300 font-semibold">No Signal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alert item ───────────────────────────────────────────────────────────────

function AlertItem({ alert }: { alert: DashAlert }) {
  const cfg = alertCfg[alert.severity];
  const isHigh = alert.severity === 'high';
  return (
    <div className={cn('flex rounded-xl ring-1 overflow-hidden hover:shadow-sm transition-shadow duration-150', cfg.bg, cfg.ring)}>
      <div className={cn('w-[3px] flex-shrink-0', cfg.bar)} />
      <div className="flex-1 px-3.5 py-3 min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex-shrink-0">
              <span className={cn('w-[7px] h-[7px] rounded-full block', cfg.dot)} />
              {isHigh && (
                <span className={cn('absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping opacity-50', cfg.dot)} />
              )}
            </span>
            <span className={cn('text-[10px] font-bold px-1.5 py-[3px] rounded-full leading-none', cfg.badge)}>
              {cfg.label}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{alert.time}</span>
        </div>
        {/* Content */}
        <p className="text-[12.5px] font-bold text-gray-800 leading-snug">{alert.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 mb-2.5">{alert.location}</p>
        {/* Threshold row */}
        <div className="flex items-center justify-between bg-white/60 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-gray-400">
            Threshold: <span className="font-semibold text-gray-600">{alert.threshold}</span>
          </span>
          <span className={cn('text-[12.5px] font-black tabular-nums', cfg.valCls)}>
            {alert.value}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { warehouses: warehouseUnits, alerts: activeAlerts, goodCount, watchCount, criticalCount, offlineCount, activeCount } = useDashboardData();
  const alertHigh   = activeAlerts.filter(a => a.severity === 'high').length;
  const alertMedium = activeAlerts.filter(a => a.severity === 'medium').length;
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DashboardHeader
        title="Dashboard"
        subtitle="Grain storage monitoring — at a glance"
      />

      <main className="flex-1 p-6 space-y-5 overflow-auto">

        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="System Health"
            value="Good"
            sub={`${activeCount} of ${warehouseUnits.length} units active`}
            icon={<HeartbeatIcon />}
            accentBar="bg-green-400"
            iconWrap="bg-green-50"
            iconCls="text-green-600"
            valueCls="text-green-600"
            pill={{ text: '↑ Stable', cls: 'bg-green-50 text-green-700' }}
          />
          <MetricCard
            label="Storage Units"
            value={String(warehouseUnits.length)}
            sub={`${activeCount} Active · ${offlineCount} Offline`}
            icon={<SiloIcon />}
            accentBar="bg-blue-400"
            iconWrap="bg-blue-50"
            iconCls="text-blue-600"
          />
          <MetricCard
            label="Active Alerts"
            value={String(activeAlerts.length)}
            sub={`${alertHigh} Critical · ${alertMedium} Medium`}
            icon={<BellIcon />}
            accentBar="bg-red-400"
            iconWrap="bg-red-50"
            iconCls="text-red-500"
            valueCls={activeAlerts.length > 0 ? 'text-red-500' : 'text-gray-900'}
            pill={alertHigh > 0 ? { text: `${alertHigh} urgent`, cls: 'bg-red-50 text-red-600' } : undefined}
          />
          <MetricCard
            label="Spoilage Risk"
            value={criticalCount > 0 ? 'Medium' : 'Low'}
            sub={`${criticalCount} unit${criticalCount !== 1 ? 's' : ''} above threshold`}
            icon={<ShieldIcon />}
            accentBar={criticalCount > 0 ? 'bg-amber-400' : 'bg-green-400'}
            iconWrap={criticalCount > 0 ? 'bg-amber-50' : 'bg-green-50'}
            iconCls={criticalCount > 0 ? 'text-amber-600' : 'text-green-600'}
            valueCls={criticalCount > 0 ? 'text-amber-600' : 'text-green-600'}
          />
        </section>

        {/* ── Warehouse grid + Alerts ───────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Storage Units */}
          <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Storage Units</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Live status across all warehouses</p>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Good',     cls: 'bg-green-400' },
                  { label: 'Watch',    cls: 'bg-amber-400' },
                  { label: 'Critical', cls: 'bg-red-400' },
                  { label: 'Offline',  cls: 'bg-gray-300' },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400">
                    <span className={cn('w-[7px] h-[7px] rounded-full flex-shrink-0', s.cls)} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Tile grid */}
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {warehouseUnits.map((wh) => <WarehouseTile key={wh.id} wh={wh} />)}
              </div>
            </div>

            {/* Summary strip */}
            <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-around gap-2">
              {[
                { count: goodCount,     label: 'Good',     dot: 'bg-green-400' },
                { count: watchCount,    label: 'Watch',    dot: 'bg-amber-400' },
                { count: criticalCount, label: 'Critical', dot: 'bg-red-400' },
                { count: offlineCount,  label: 'Offline',  dot: 'bg-gray-300' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', s.dot)} />
                  <span className="text-[13px] font-bold text-gray-700">{s.count}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Footer link */}
            <div className="px-5 pb-5 mt-auto">
              <Link
                href="/monitor"
                className="group flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-[#1f5135]/[0.07] hover:bg-[#1f5135]/[0.12] text-[12.5px] font-semibold text-[#1f5135] transition-colors duration-150"
              >
                View Realtime Monitor
                <ArrowRightIcon />
              </Link>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Active Alerts</h2>
                <p className="text-[11.5px] text-gray-400 mt-0.5">
                  {activeAlerts.length} alerts requiring attention
                </p>
              </div>
              {alertHigh > 0 && (
                <span className="relative flex-shrink-0">
                  <span className="w-7 h-7 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {activeAlerts.length}
                  </span>
                  <span className="absolute inset-0 w-7 h-7 rounded-full bg-red-400 animate-ping opacity-30" />
                </span>
              )}
            </div>

            {/* Alert list */}
            <div className="flex-1 p-5 space-y-3">
              {activeAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>

            {/* Footer link */}
            <div className="px-5 pb-5 mt-auto">
              <Link
                href="/alerts"
                className="group flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-[#1f5135]/[0.07] hover:bg-[#1f5135]/[0.12] text-[12.5px] font-semibold text-[#1f5135] transition-colors duration-150"
              >
                View All Alerts
                <ArrowRightIcon />
              </Link>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
