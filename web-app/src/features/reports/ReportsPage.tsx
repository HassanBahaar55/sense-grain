'use client';

import { useState, useRef } from 'react';
import { ReportTrendsChart } from '@/components/charts/ReportTrendsChart';
import { ReportTypesChart } from '@/components/charts/ReportTypesChart';
import {
  reportTrendSeries,
  scheduledReports,
  type ReportType,
} from './mockData';
import { useReportsData, type ReportItem } from '@/lib/dataEngine';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const statColorMap = {
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'ring-green-100'  },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100'   },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-100'  },
};

const typeConfig: Record<ReportType, { label: string; badge: string; dot: string }> = {
  'environmental': { label: 'Environmental',  badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',   dot: 'bg-[#1f5135]' },
  'compliance':    { label: 'Compliance',     badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',      dot: 'bg-blue-500'  },
  'performance':   { label: 'Performance',    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-500' },
  'alert-summary': { label: 'Alert Summary',  badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         dot: 'bg-red-500'   },
  'custom':        { label: 'Custom',         badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500'},
};

const scheduleTypeIcon: Record<ReportType, React.ReactNode> = {
  'environmental': (
    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  'compliance': (
    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 12 18 15 13" />
    </svg>
  ),
  'performance': (
    <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  'alert-summary': (
    <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'custom': (
    <svg className="w-3.5 h-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const statIcons: Record<string, React.ReactNode> = {
  'Total Reports': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  'This Week': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'Downloads': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  'Scheduled': (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

// ─── Primitives ───────────────────────────────────────────────────────────────

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
        <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer',
        enabled ? 'bg-[#1f5135]' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ─── Create Schedule Modal ────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_OPTIONS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIME_OPTIONS = ['06:00','08:00','09:00','10:00','12:00','15:00','18:00','20:00'];

interface NewSchedule {
  id: string; name: string; type: ReportType;
  schedule: string; nextRun: string; enabled: boolean;
}

function CreateScheduleModal({ onClose, onSave }: { onClose: () => void; onSave: (s: NewSchedule) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ReportType>('environmental');
  const [freq, setFreq] = useState('daily');
  const [day,  setDay]  = useState('Monday');
  const [time, setTime] = useState('08:00');
  const [saved, setSaved] = useState(false);

  function scheduleLabel() {
    if (freq === 'daily')   return `Daily at ${time}`;
    if (freq === 'weekly')  return `${day} at ${time}`;
    return `1st of month, ${time}`;
  }
  function nextRunLabel() {
    if (freq === 'daily')   return `Today, ${time}`;
    if (freq === 'weekly')  return `${day}, ${time}`;
    return `Jun 1, ${time}`;
  }

  function handleSave() {
    if (!name.trim()) return;
    setSaved(true);
    setTimeout(() => {
      onSave({
        id: `SCH-${Date.now().toString(36).toUpperCase()}`,
        name: name.trim(),
        type,
        schedule: scheduleLabel(),
        nextRun: nextRunLabel(),
        enabled: true,
      });
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">Create Schedule</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Set up automated report generation</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Report name */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Report Name</label>
            <input
              type="text"
              placeholder="e.g. Weekly WH-C Summary"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/30 focus:border-[#1f5135]/40 transition-all"
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Report Type</label>
            <div className="relative">
              <select
                value={type}
                onChange={e => setType(e.target.value as ReportType)}
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/30 cursor-pointer"
              >
                {REPORT_TYPES.map(r => <option key={r.type} value={r.type}>{r.label}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Frequency</label>
            <div className="flex gap-2">
              {FREQ_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFreq(f.value)}
                  className={cn(
                    'flex-1 h-8 rounded-xl text-[11px] font-semibold border transition-all',
                    freq === f.value
                      ? 'bg-[#1f5135] text-white border-[#1f5135] shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day (only for weekly) */}
          {freq === 'weekly' && (
            <div>
              <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Day of Week</label>
              <div className="relative">
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/30 cursor-pointer"
                >
                  {DAY_OPTIONS.map(d => <option key={d}>{d}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          )}

          {/* Time */}
          <div>
            <label className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Time</label>
            <div className="relative">
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/30 cursor-pointer"
              >
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
            <svg className="w-4 h-4 text-[#1f5135] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold">Will run: <span className="text-gray-700 font-bold">{scheduleLabel()}</span></p>
              <p className="text-[10px] text-gray-400 mt-0.5">Next: <span className="text-[#1f5135] font-bold">{nextRunLabel()}</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-bold hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              'flex-1 h-9 rounded-xl text-white text-[12px] font-bold transition-all flex items-center justify-center gap-1.5',
              saved ? 'bg-green-500' : !name.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1f5135] hover:bg-[#174028]',
            )}
          >
            {saved ? (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Saved</>
            ) : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Generate modal ───────────────────────────────────────────────────────────

const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
  { type: 'environmental', label: 'Environmental Report', desc: 'Temperature, humidity, CO₂ across all zones' },
  { type: 'compliance',    label: 'Compliance Report',    desc: 'Regulatory adherence and audit trail' },
  { type: 'performance',   label: 'Performance Report',   desc: 'Efficiency metrics and warehouse scores' },
  { type: 'alert-summary', label: 'Alert Summary',        desc: 'All alerts grouped by severity and warehouse' },
  { type: 'custom',        label: 'Custom Report',        desc: 'Select specific parameters and date range' },
];

function GenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (type: ReportType) => void }) {
  const [selected, setSelected] = useState<ReportType>('environmental');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] w-full max-w-sm animate-fade-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Generate Report</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-4 space-y-2">
          {REPORT_TYPES.map(({ type, label, desc }) => (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={cn(
                'w-full text-left p-3 rounded-xl transition-all border',
                selected === type
                  ? 'border-[#1f5135] bg-green-50 ring-1 ring-[#1f5135]/20'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', typeConfig[type].dot)} />
                <p className="text-[12px] font-bold text-gray-800">{label}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 ml-4">{desc}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-bold hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={() => { onGenerate(selected); onClose(); }}
            className="flex-1 h-9 rounded-xl bg-[#1f5135] text-white text-[12px] font-bold hover:bg-[#174028] transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { stats: reportStats, recentReports, reportTypeData, reportTrendData } = useReportsData();
  const [localSchedules, setLocalSchedules] = useState<NewSchedule[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(scheduledReports.map((s) => [s.id, s.enabled]))
  );
  const [showGenerate, setShowGenerate] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);

  function handleCreateSchedule(s: NewSchedule) {
    setLocalSchedules(prev => [s, ...prev]);
    setScheduleEnabled(prev => ({ ...prev, [s.id]: true }));
  }
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [localReports, setLocalReports] = useState<typeof recentReports>([]);
  const [reportSearch, setReportSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportType | 'all'>('all');
  const [statQuickFilter, setStatQuickFilter] = useState<'all' | 'this-week' | 'scheduled'>('all');
  const [exportingZip, setExportingZip] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scheduledRef = useRef<HTMLDivElement>(null);

  const toggleSchedule = (id: string) =>
    setScheduleEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  function handleGenerate(type: ReportType) {
    const newId = `RPT-${Date.now().toString(36).toUpperCase()}`;
    const newReport: ReportItem = {
      id: newId,
      title: `${typeConfig[type].label} — All Warehouses`,
      type,
      warehouse: 'All Warehouses',
      period: 'Custom',
      generatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      dateGenerated: 'Just now',
      generatedBy: 'You (Admin)',
      size: '',
      downloads: 0,
      status: 'processing',
    };
    setLocalReports(prev => [newReport, ...prev]);
    setGeneratingId(newId);
    setTimeout(() => {
      setLocalReports(prev => prev.map(r =>
        r.id === newId ? { ...r, status: 'ready' as const, size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB` } : r
      ));
      setGeneratingId(null);
    }, 2500);
  }

  function downloadCsv(report: ReportItem) {
    const headers = ['Report ID', 'Title', 'Type', 'Warehouse', 'Date Generated', 'Generated By', 'Size', 'Status'];
    const meta = [report.id, `"${report.title}"`, report.type, report.warehouse, report.dateGenerated, report.generatedBy, report.size || 'N/A', report.status];
    const mockRows = [
      ['Zone 1', '28.5 °C', '62 %', '12.1 %', '525 ppm', '38', 'Normal'],
      ['Zone 2', '31.2 °C', '68 %', '13.4 %', '548 ppm', '46', 'Warning'],
      ['Zone 3', '27.8 °C', '60 %', '11.8 %', '512 ppm', '37', 'Normal'],
      ['Zone 4', '29.1 °C', '64 %', '12.6 %', '530 ppm', '41', 'Normal'],
      ['Ambient', '26.5 °C', '56 %', '10.5 %', '490 ppm', '34', 'Normal'],
    ];
    const dataHeaders = ['Zone', 'Temperature', 'Humidity', 'Moisture', 'CO2 ppm', 'AQI', 'Status'];
    const csv = [
      headers.join(','), meta.join(','),
      '', 'ZONE DATA', dataHeaders.join(','),
      ...mockRows.map(r => r.join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}-${report.type}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function handleDownload(report: ReportItem) {
    setDownloadingId(report.id);
    setTimeout(() => {
      downloadCsv(report);
      setDownloadingId(null);
      setDownloadedIds(prev => new Set([...prev, report.id]));
      setTimeout(() => setDownloadedIds(prev => { const s = new Set(prev); s.delete(report.id); return s; }), 2500);
    }, 1200);
  }

  function handleExportAllZip() {
    if (exportingZip) return;
    setExportingZip(true);
    setTimeout(() => {
      const allR = [...localReports, ...recentReports];
      const headers = ['Report ID', 'Title', 'Type', 'Warehouse', 'Date Generated', 'Generated By', 'Size', 'Status'];
      const rows = allR.map(r => [r.id, `"${r.title}"`, r.type, r.warehouse, r.dateGenerated, r.generatedBy, r.size || 'N/A', r.status].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sense-grain-all-reports-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      setExportingZip(false);
    }, 2000);
  }

  function scrollToTable(filter: 'all' | 'this-week') {
    setStatQuickFilter(filter);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  function scrollToScheduled() {
    setStatQuickFilter('scheduled');
    setTimeout(() => scheduledRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  const allReports = [...localReports, ...recentReports];
  const filteredReports = allReports.filter(r => {
    if (reportTypeFilter !== 'all' && r.type !== reportTypeFilter) return false;
    if (statQuickFilter === 'this-week') {
      const isRecent = r.dateGenerated === 'Just now' || r.dateGenerated?.includes('May 2') || r.dateGenerated?.includes('May 1');
      if (!isRecent) return false;
    }
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.warehouse.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerate={handleGenerate} />}
      {showCreateSchedule && <CreateScheduleModal onClose={() => setShowCreateSchedule(false)} onSave={handleCreateSchedule} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-20 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-gray-900 leading-tight tracking-tight">Reports</h1>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate">
            View, download and share your monitoring reports
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Date range */}
          <button className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 active:scale-[0.97] transition-all duration-150 select-none">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="hidden md:block">May 1 – May 21, 2026</span>
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {/* Filter */}
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 active:scale-[0.97] transition-all duration-150 select-none">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          {/* Notification bell */}
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 active:scale-95 transition-all duration-150">
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">3</span>
          </button>
          <div className="w-px h-5 bg-gray-200 hidden md:block" />
          {/* User */}
          <button className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all duration-150 group">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1f5135] to-[#2d7a4f] flex items-center justify-center text-[11px] font-bold text-white shadow-sm flex-shrink-0">A</div>
            <span className="hidden md:block text-[12px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Admin</span>
            <svg className="hidden md:block w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {/* Generate Report */}
          <button
            onClick={() => setShowGenerate(true)}
            className="hidden lg:flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#1f5135] text-white text-[12px] font-semibold hover:bg-[#174028] active:scale-[0.97] transition-all duration-150 shadow-sm shadow-green-900/20 select-none"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Generate Report
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {reportStats.map((stat) => {
            const col = statColorMap[stat.colorKey];
            const isActive =
              (stat.label === 'Total Reports' && statQuickFilter === 'all') ||
              (stat.label === 'This Week' && statQuickFilter === 'this-week') ||
              (stat.label === 'Scheduled' && statQuickFilter === 'scheduled');
            return (
              <button
                key={stat.label}
                className="text-left w-full"
                onClick={() => {
                  if (stat.label === 'Total Reports') scrollToTable('all');
                  else if (stat.label === 'This Week') scrollToTable('this-week');
                  else if (stat.label === 'Downloads') scrollToTable('all');
                  else if (stat.label === 'Scheduled') scrollToScheduled();
                }}
              >
                <Card className={cn(
                  'p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ring-1',
                  isActive ? 'ring-[#1f5135]/30 shadow-md -translate-y-0.5' : 'ring-transparent',
                )}>
                  <div className="flex items-start justify-between mb-2.5">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ring-1', col.bg, col.ring)}>
                      <span className={col.text}>{statIcons[stat.label]}</span>
                    </div>
                    <span className={cn(
                      'inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                      stat.deltaPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
                    )}>
                      {stat.deltaPositive ? '↑ ' : '↓ '}{stat.delta}
                    </span>
                  </div>
                  <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">{stat.value}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1.5 leading-none">
                    {stat.label}
                    {(stat.label === 'Total Reports' || stat.label === 'This Week' || stat.label === 'Downloads' || stat.label === 'Scheduled') && (
                      <span className="ml-1 text-[8px] text-gray-300">→</span>
                    )}
                  </p>
                </Card>
              </button>
            );
          })}
        </section>

        {/* ── Report Trends + Report Types ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,316px)] gap-5">

          {/* Report Trends */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Report Activity"
              subtitle="Weekly generated, downloaded & shared report counts"
              action={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 font-semibold">8 weeks</span>
                </div>
              }
            />
            <ReportTrendsChart />
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
              {reportTrendSeries.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                  <span className="w-5 h-[2px] rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Card>

          {/* Report Types */}
          <Card className="p-5 min-w-0">
            <SectionHeader
              title="Report Types"
              subtitle="Distribution across all categories"
            />
            <ReportTypesChart />
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {reportTypeData.map((item) => {
                const total = reportTypeData.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 text-[11px] text-gray-600 font-medium">{item.label}</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.85 }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 tabular-nums w-8 text-right flex-shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

        </section>

        {/* ── Recent Reports Table + Scheduled Panel ────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,288px)] gap-5 items-start">

          {/* Recent Reports Table */}
          <div ref={tableRef}>
          <Card className="p-5 min-w-0 overflow-hidden">
            <SectionHeader
              title="Recent Reports"
              subtitle={`${filteredReports.length} report${filteredReports.length !== 1 ? 's' : ''} found${statQuickFilter === 'this-week' ? ' · This week' : ''}`}
              action={
                <button
                  onClick={() => setShowGenerate(true)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#1f5135] text-white text-[11px] font-semibold hover:bg-[#174028] transition-all duration-150 flex-shrink-0"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  New
                </button>
              }
            />

            {/* Search + Type filter */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  className="w-full h-7 pl-8 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors"
                />
              </div>
              <div className="relative">
                <select
                  value={reportTypeFilter}
                  onChange={e => setReportTypeFilter(e.target.value as ReportType | 'all')}
                  className="h-7 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 cursor-pointer"
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
            </div>
            <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Report Name', 'Type', 'Warehouse', 'Date Generated', 'Generated By', 'Size', 'Actions'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-gray-400 font-medium">
                        No reports match your search.
                      </td>
                    </tr>
                  ) : filteredReports.map((row) => {
                    const tc = typeConfig[row.type];
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer group">

                        {/* Report Name */}
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <p className="font-semibold text-gray-800 truncate">{row.title}</p>
                          <p className="text-gray-400 text-[9px] font-mono mt-0.5">{row.id}</p>
                        </td>

                        {/* Type badge */}
                        <td className="px-3 py-2.5">
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', tc.badge)}>
                            {tc.label}
                          </span>
                        </td>

                        {/* Warehouse */}
                        <td className="px-3 py-2.5 text-gray-600 font-medium">{row.warehouse}</td>

                        {/* Date */}
                        <td className="px-3 py-2.5 text-gray-500">{row.dateGenerated}</td>

                        {/* Generated By */}
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            'text-[10px] font-medium',
                            row.generatedBy === 'Auto-Scheduler' ? 'text-purple-600' : 'text-gray-600',
                          )}>
                            {row.generatedBy}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="px-3 py-2.5">
                          {row.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Processing
                            </span>
                          ) : (
                            <span className="text-gray-500 tabular-nums">{row.size}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {/* Download */}
                            <button
                              onClick={() => row.status === 'ready' && handleDownload(row)}
                              className={cn(
                                'w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150',
                                row.status === 'processing'
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : downloadedIds.has(row.id)
                                  ? 'text-green-600 bg-green-50'
                                  : downloadingId === row.id
                                  ? 'text-amber-500 animate-spin'
                                  : 'text-gray-400 hover:text-[#1f5135] hover:bg-green-50',
                              )}
                              disabled={row.status === 'processing'}
                              title={downloadedIds.has(row.id) ? 'Downloaded!' : 'Download CSV'}
                            >
                              {downloadedIds.has(row.id) ? (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              ) : downloadingId === row.id ? (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          </div>

          {/* Scheduled Reports */}
          <div className="flex flex-col gap-4 min-w-0" ref={scheduledRef}>
            <Card className="p-5">
              <SectionHeader
                title="Scheduled Reports"
                subtitle="Automated report generation"
              />
              <div className="space-y-0">
                {[...localSchedules, ...scheduledReports].map((sched, idx) => {
                  const enabled = scheduleEnabled[sched.id] ?? sched.enabled;
                  return (
                    <div
                      key={sched.id}
                      className={cn(
                        'flex items-start gap-3 py-3 transition-colors duration-100',
                        idx < scheduledReports.length - 1 && 'border-b border-gray-50',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-black/[0.05]',
                        sched.type === 'environmental'  && 'bg-green-50',
                        sched.type === 'compliance'     && 'bg-blue-50',
                        sched.type === 'performance'    && 'bg-amber-50',
                        sched.type === 'alert-summary'  && 'bg-red-50',
                        sched.type === 'custom'         && 'bg-purple-50',
                      )}>
                        {scheduleTypeIcon[sched.type]}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[11px] font-bold leading-tight',
                          enabled ? 'text-gray-800' : 'text-gray-400',
                        )}>
                          {sched.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sched.schedule}</p>
                        {enabled && (
                          <p className="text-[9px] text-green-700 font-semibold mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Next: {sched.nextRun}
                          </p>
                        )}
                      </div>

                      {/* Toggle */}
                      <Toggle enabled={enabled} onChange={() => toggleSchedule(sched.id)} />
                    </div>
                  );
                })}
              </div>

              {/* Create Schedule button */}
              <button
                onClick={() => setShowCreateSchedule(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 h-8 rounded-xl border border-dashed border-gray-300 text-[11px] font-semibold text-gray-500 hover:border-[#1f5135] hover:text-[#1f5135] hover:bg-green-50/50 transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Schedule
              </button>
            </Card>

            {/* Quick Actions card */}
            <Card className="p-5">
              <h2 className="text-[13px] font-bold text-gray-900 mb-3 tracking-tight">Quick Actions</h2>
              <div className="space-y-2">
                {/* Export All */}
                <button
                  onClick={handleExportAllZip}
                  disabled={exportingZip}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-150 text-left text-[#1f5135] bg-green-50 hover:bg-green-100 disabled:opacity-60"
                >
                  {exportingZip ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                  )}
                  {exportingZip ? 'Preparing export...' : 'Export All as CSV'}
                </button>
                {/* Schedule New Report */}
                <button
                  onClick={() => setShowGenerate(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-150 text-left text-purple-600 bg-purple-50 hover:bg-purple-100"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Schedule New Report
                </button>
              </div>
            </Card>

          </div>

        </section>

      </main>
    </div>
  );
}
