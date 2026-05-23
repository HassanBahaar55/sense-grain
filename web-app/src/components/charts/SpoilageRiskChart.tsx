'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { spoilageRiskForecast } from '@/features/dashboard/mockData';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] p-3 min-w-[148px]">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[3px]">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[11px] text-gray-600">{entry.name}</span>
          </div>
          <span className="text-[11px] font-bold text-gray-800">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function SpoilageRiskChart() {
  const { data, series } = spoilageRiskForecast;
  return (
    <ResponsiveContainer width="100%" height={168}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1} opacity={0.5} />
        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1} opacity={0.5} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.replace('May ', '')}
          dy={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: s.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
