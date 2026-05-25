'use client';

import { useState } from 'react';
import { type ReportType } from '@/lib/dataEngine';
import { type ReportItem } from '@/lib/dataEngine';
import { useFirestoreReports as useReportsData } from '@/lib/useFirestoreData';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  getFirestore, doc, setDoc, serverTimestamp,
  collection, query, orderBy, where, getDocs,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useWarehouses, type ManagedWarehouse } from '@/lib/storageManagement';
import { useAuth } from '@/contexts/AuthContext';

const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
  { type: 'environmental', label: 'Environmental Report',  desc: 'Temperature, humidity, moisture, CO₂ across zones' },
  { type: 'compliance',    label: 'Compliance Report',     desc: 'Regulatory adherence and audit trail'              },
  { type: 'performance',   label: 'Performance Report',    desc: 'Efficiency metrics and warehouse scores'           },
  { type: 'alert-summary', label: 'Alert Summary',         desc: 'All alerts grouped by severity'                   },
  { type: 'custom',        label: 'Custom Report',         desc: 'Sensor data for selected warehouse and period'     },
];

const TYPE_CONFIG: Record<ReportType, { label: string; badge: string; dot: string }> = {
  'environmental': { label: 'Environmental', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   dot: 'bg-[#1f5135]' },
  'compliance':    { label: 'Compliance',    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',      dot: 'bg-blue-500'  },
  'performance':   { label: 'Performance',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-500' },
  'alert-summary': { label: 'Alert Summary', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         dot: 'bg-red-500'   },
  'custom':        { label: 'Custom',        badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500'},
};

// ─── CSV generation (real Firestore data) ─────────────────────────────────────

interface SensorHistoryRow {
  date: string;
  averages: { temperature: number; humidity: number; moisture: number; co2: number; aqi: number };
  stability?: Record<string, number>;
}

async function generateCsv(
  uid: string,
  reportId: string,
  reportTitle: string,
  warehouse: string,
  dateRange: '1d' | '7d' | '30d',
  type: ReportType,
  warehouseName?: string,
): Promise<string> {
  const db = getFirestore(firebaseApp);
  const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  let histRows: SensorHistoryRow[] = [];
  try {
    const q = query(
      collection(db, col.sensorHistory(uid)),
      where('date', '>=', sinceStr),
      orderBy('date', 'asc'),
    );
    const snap = await getDocs(q);
    histRows = snap.docs.map(d => d.data() as SensorHistoryRow);
  } catch {
    // fallback: empty rows → CSV still downloads with headers
  }

  const whLabel = warehouse === 'all' ? 'All Warehouses' : `${warehouseName ?? warehouse} (${warehouse})`;
  const periodLabel = days === 1 ? 'Today' : `Last ${days} Days`;

  const metaLines = [
    `# Sense Grain — ${reportTitle}`,
    `# Report ID: ${reportId}`,
    `# Type: ${TYPE_CONFIG[type].label}`,
    `# Warehouse: ${whLabel}`,
    `# Period: ${periodLabel}`,
    `# Generated: ${new Date().toLocaleString('en-GB')}`,
    '',
  ];

  const colHeaders = ['Date', 'Temperature (°C)', 'Humidity (%)', 'Moisture (%)', 'CO2 (ppm)', 'AQI'];
  if (warehouse !== 'all') colHeaders.push(`${warehouseName ?? warehouse} Stability`);

  const dataRows = histRows.map(h => {
    const row = [
      h.date,
      h.averages.temperature?.toFixed(1) ?? '',
      h.averages.humidity ?? '',
      h.averages.moisture?.toFixed(1) ?? '',
      h.averages.co2 ?? '',
      h.averages.aqi ?? '',
    ];
    if (warehouse !== 'all') row.push(String(h.stability?.[warehouse] ?? ''));
    return row.join(',');
  });

  if (dataRows.length === 0) {
    dataRows.push('No data available for the selected date range');
  }

  return [...metaLines, colHeaders.join(','), ...dataRows].join('\n');
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvSizeLabel(csv: string): string {
  const bytes = new TextEncoder().encode(csv).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── Generate Report Modal ────────────────────────────────────────────────────

interface GenerateConfig {
  warehouse: string;
  dateRange: '1d' | '7d' | '30d';
  type: ReportType;
}

function GenerateModal({
  onClose,
  onGenerate,
  warehouses,
}: {
  onClose: () => void;
  onGenerate: (cfg: GenerateConfig) => void;
  warehouses: ManagedWarehouse[];
}) {
  const [warehouse, setWarehouse] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d'>('7d');
  const [type, setType] = useState<ReportType>('environmental');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">Generate Report</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Export real sensor data as CSV</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Warehouse */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Warehouse</label>
            <div className="relative">
              <select
                value={warehouse}
                onChange={e => setWarehouse(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/30 cursor-pointer"
              >
                <option value="all">All Warehouses</option>
                {warehouses.filter(w => w.status === 'active').map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.id})</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Date Range</label>
            <div className="flex gap-2">
              {([['1d', 'Today'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateRange(val)}
                  className={cn(
                    'flex-1 h-8 rounded-xl text-[11px] font-semibold border transition-all',
                    dateRange === val
                      ? 'bg-[#1f5135] text-white border-[#1f5135] shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Report type */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Report Type</label>
            <div className="space-y-1.5">
              {REPORT_TYPES.map(({ type: t, label, desc }) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl transition-all border',
                    type === t
                      ? 'border-[#1f5135] bg-green-50 ring-1 ring-[#1f5135]/20'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', TYPE_CONFIG[t].dot)} />
                    <p className="text-[11px] font-bold text-gray-800">{label}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 ml-3.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onGenerate({ warehouse, dateRange, type }); onClose(); }}
            className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-bold hover:bg-[#174028] transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { toggle: toggleSidebar } = useSidebar();
  const { recentReports } = useReportsData();
  const { uid } = useLiveData();
  const { warehouses: managedWarehouses } = useWarehouses();
  const { user } = useAuth();
  const whNames = Object.fromEntries(managedWarehouses.map(w => [w.id, w.name]));

  const [showGenerate, setShowGenerate]       = useState(false);
  const [localReports, setLocalReports]       = useState<ReportItem[]>([]);
  const [generatingId, setGeneratingId]       = useState<string | null>(null);
  const [downloadingId, setDownloadingId]     = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds]     = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch]                   = useState('');
  const [whFilter, setWhFilter]               = useState<string>('all');
  const [typeFilter, setTypeFilter]           = useState<ReportType | 'all'>('all');
  const [dateFilter, setDateFilter]           = useState<'all' | '7d' | '30d'>('all');

  // ── Generate report ───────────────────────────────────────────────────────

  async function handleGenerate({ warehouse, dateRange, type }: GenerateConfig) {
    const newId = `RPT-${Date.now().toString(36).toUpperCase()}`;
    const whLabel = warehouse === 'all' ? 'All Warehouses' : whNames[warehouse] ?? warehouse;
    const periodLabel = dateRange === '1d' ? 'Today' : dateRange === '7d' ? 'Last 7 Days' : 'Last 30 Days';
    const title = `${TYPE_CONFIG[type].label} — ${whLabel} · ${periodLabel}`;

    const newReport: ReportItem = {
      id: newId,
      title,
      type,
      warehouse: whLabel,
      period: periodLabel,
      generatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      dateGenerated: 'Just now',
      generatedBy: user?.displayName ?? user?.email ?? 'User',
      size: '',
      downloads: 0,
      status: 'processing',
    };

    setLocalReports(prev => [newReport, ...prev]);
    setGeneratingId(newId);

    try {
      const csv = await generateCsv(uid ?? '', newId, title, warehouse, dateRange, type, warehouse !== 'all' ? whNames[warehouse] : undefined);
      const size = csvSizeLabel(csv);
      triggerDownload(csv, `${newId}-${type}.csv`);

      // Save to Firestore (per-user)
      const db = getFirestore(firebaseApp);
      await setDoc(doc(db, uid ? col.reports(uid) : 'reports', newId), {
        ...newReport,
        status: 'ready',
        size,
        createdAt: serverTimestamp(),
      });

      setLocalReports(prev =>
        prev.map(r => r.id === newId ? { ...r, status: 'ready' as const, size } : r),
      );
    } catch {
      setLocalReports(prev =>
        prev.map(r => r.id === newId ? { ...r, status: 'ready' as const, size: '—' } : r),
      );
    } finally {
      setGeneratingId(null);
    }
  }

  // ── Download existing report ───────────────────────────────────────────────

  async function handleDownload(report: ReportItem) {
    if (downloadingId) return;
    setDownloadingId(report.id);
    try {
      const whId = managedWarehouses.find(w => w.name === report.warehouse)?.id ?? 'all';
      const csv = await generateCsv(uid ?? '', report.id, report.title, whId, '30d', report.type, managedWarehouses.find(w => w.id === whId)?.name);
      triggerDownload(csv, `${report.id}-${report.type}.csv`);
      setDownloadedIds(prev => new Set([...prev, report.id]));
      setTimeout(() => setDownloadedIds(prev => { const s = new Set(prev); s.delete(report.id); return s; }), 2500);
    } catch {
      /* silently ignore */
    } finally {
      setDownloadingId(null);
    }
  }

  // ── Filter logic ──────────────────────────────────────────────────────────

  const allReports = [...localReports, ...recentReports];

  const sevenDaysAgo  = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filteredReports = allReports.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;

    if (whFilter !== 'all') {
      const whName = whNames[whFilter] ?? whFilter;
      if (!r.warehouse.toLowerCase().includes(whName.toLowerCase()) &&
          !r.warehouse.toLowerCase().includes(whFilter.toLowerCase())) return false;
    }

    if (dateFilter !== 'all') {
      if (r.dateGenerated === 'Just now') {/* always pass */}
      else {
        // Parse stored date string "May 21, 2026"
        const parsed = new Date(r.dateGenerated);
        if (!isNaN(parsed.getTime())) {
          const cutoff = dateFilter === '7d' ? sevenDaysAgo : thirtyDaysAgo;
          if (parsed < cutoff) return false;
        }
      }
    }

    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.warehouse.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerate={cfg => { void handleGenerate(cfg); }}
          warehouses={managedWarehouses}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20 flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all duration-150 flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-tight tracking-tight">Reports</h1>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate hidden sm:block">
            Generate and download sensor data reports
          </p>
        </div>

        <button
          onClick={() => setShowGenerate(true)}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all duration-150 shadow-sm shadow-green-900/20 select-none flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span className="hidden sm:inline">Generate Report</span>
          <span className="sm:hidden">Generate</span>
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto overflow-x-hidden">

        {/* ── Filter toolbar ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-4">
          <div className="flex flex-wrap gap-2.5 items-center">

            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors"
              />
            </div>

            {/* Warehouse filter */}
            <div className="relative">
              <select
                value={whFilter}
                onChange={e => setWhFilter(e.target.value)}
                className="h-8 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 cursor-pointer"
              >
                <option value="all">All Warehouses</option>
                {managedWarehouses.filter(w => w.status === 'active').map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as ReportType | 'all')}
                className="h-8 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="environmental">Environmental</option>
                <option value="compliance">Compliance</option>
                <option value="performance">Performance</option>
                <option value="alert-summary">Alert Summary</option>
                <option value="custom">Custom</option>
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Date range filter */}
            <div className="flex gap-1">
              {([['all', 'All Time'], ['30d', '30 Days'], ['7d', '7 Days']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all',
                    dateFilter === val
                      ? 'bg-[#1f5135] text-white border-[#1f5135]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── Reports table ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-5 min-w-0 overflow-hidden">

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Recent Reports</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
                {(search || whFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all') && ' · filtered'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
            <table className="w-full text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Report Name', 'Type', 'Warehouse', 'Date Generated', 'Generated By', 'Size', 'Download'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <p className="text-[12px] text-gray-400 font-medium mb-2">No reports match your filters.</p>
                      <button
                        onClick={() => { setSearch(''); setWhFilter('all'); setTypeFilter('all'); setDateFilter('all'); }}
                        className="text-[11px] font-semibold text-[#1f5135] hover:underline"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : filteredReports.map(row => {
                  const tc = TYPE_CONFIG[row.type];
                  const isProcessing = row.status === 'processing' || generatingId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">

                      {/* Report name */}
                      <td className="px-3 py-2.5 max-w-[240px]">
                        <p className="font-semibold text-gray-800 truncate">{row.title}</p>
                        <p className="text-gray-400 text-[9px] font-mono mt-0.5">{row.id}</p>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2.5">
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', tc.badge)}>
                          {tc.label}
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td className="px-3 py-2.5 text-gray-600 font-medium">{row.warehouse}</td>

                      {/* Date */}
                      <td className="px-3 py-2.5 text-gray-500">{row.dateGenerated}</td>

                      {/* Generated by */}
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'text-[10px] font-medium',
                          row.generatedBy === 'Auto-Scheduler' ? 'text-purple-600' : 'text-gray-600',
                        )}>
                          {row.generatedBy}
                        </span>
                      </td>

                      {/* Size / status */}
                      <td className="px-3 py-2.5">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Processing
                          </span>
                        ) : (
                          <span className="text-gray-500 tabular-nums">{row.size || '—'}</span>
                        )}
                      </td>

                      {/* Download */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => !isProcessing && handleDownload(row)}
                          disabled={isProcessing}
                          className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150',
                            isProcessing
                              ? 'text-gray-300 cursor-not-allowed'
                              : downloadedIds.has(row.id)
                              ? 'text-green-600 bg-green-50'
                              : downloadingId === row.id
                              ? 'text-amber-500'
                              : 'text-gray-400 hover:text-[#1f5135] hover:bg-green-50',
                          )}
                          title={downloadedIds.has(row.id) ? 'Downloaded!' : 'Download CSV'}
                        >
                          {downloadedIds.has(row.id) ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : downloadingId === row.id ? (
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
