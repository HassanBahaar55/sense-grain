'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { type AlertTrendPoint } from '@/lib/dataEngine';
import { useFirestoreAlertTrend } from '@/lib/useFirestoreData';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseDayLabel(label: string): Date | null {
  const [mon, d] = label.split(' ');
  const mi = MONTHS.indexOf(mon);
  if (mi === -1 || !d) return null;
  return new Date(new Date().getFullYear(), mi, parseInt(d, 10));
}

function tickLabel(label: string, totalPoints: number): string {
  const date = parseDayLabel(label);
  if (!date) return label;
  if (totalPoints <= 7) {
    return DAYS[date.getDay()];
  }
  return `${d(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

function d(n: number) { return n < 10 ? `0${n}` : `${n}`; }

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const date = label ? parseDayLabel(label) : null;
  const dateStr = date
    ? `${DAYS[date.getDay()]}, ${label}`
    : (label ?? '');
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] p-3 min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{dateStr}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[2px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600">{entry.name}</span>
          </div>
          <span className="text-[11px] font-bold text-gray-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AlertsTrendChart({ data: propData, days = 7 }: { data?: AlertTrendPoint[]; days?: 7 | 30 }) {
  const generated = useFirestoreAlertTrend(days);
  const alertTrendData = propData ?? generated;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={alertTrendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => tickLabel(v, alertTrendData.length)}
          dy={4}
          interval={days === 30 ? 3 : 0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="Info"     name="Info"     stroke="#3b82f6" strokeWidth={1.5} fill="url(#gInfo)" dot={false} />
        <Area type="monotone" dataKey="Warning"  name="Warning"  stroke="#f59e0b" strokeWidth={1.5} fill="url(#gWarn)" dot={false} />
        <Area type="monotone" dataKey="Critical" name="Critical" stroke="#ef4444" strokeWidth={2}   fill="url(#gCrit)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
