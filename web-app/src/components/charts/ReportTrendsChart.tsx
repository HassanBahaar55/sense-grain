'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportTrendData, reportTrendSeries } from '@/features/reports/mockData';

interface TooltipEntry {
  name?:  string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] p-3.5 min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 pb-2 border-b border-gray-100">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[3px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
          </div>
          <span className="text-[12px] font-bold text-gray-900 tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportTrendsChart() {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={reportTrendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#f0f1f3" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          dy={5}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          domain={[0, 40]}
          ticks={[0, 10, 20, 30, 40]}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#d1d5db', strokeWidth: 1.5, strokeDasharray: '4 3' }}
        />
        {reportTrendSeries.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2.5, stroke: '#fff', fill: s.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
