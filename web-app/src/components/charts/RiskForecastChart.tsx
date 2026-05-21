'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { riskForecastData } from '@/features/predictions/mockData';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] p-3 min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[2px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600">{entry.name}</span>
          </div>
          <span className="text-[11px] font-bold text-gray-800">{entry.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function RiskForecastChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={riskForecastData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.split(' ')[1]}
          dy={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 70]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        <Line type="monotone" dataKey="Low"    name="Low Risk"    stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#22c55e' }} />
        <Line type="monotone" dataKey="Medium" name="Medium Risk" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#f59e0b' }} />
        <Line type="monotone" dataKey="High"   name="High Risk"   stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#ef4444' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
