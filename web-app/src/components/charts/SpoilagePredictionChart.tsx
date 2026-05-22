'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { usePredictionsData } from '@/lib/dataEngine';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] p-3.5 min-w-[168px]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 pb-2 border-b border-gray-100">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[3px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
          </div>
          <span className="text-[12px] font-bold text-gray-900 tabular-nums">{entry.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function SpoilagePredictionChart() {
  const { riskForecastData } = usePredictionsData();
  const spoilagePredData = riskForecastData.map(r => ({ day: r.day, 'Low Risk': r.Low * 5, 'Medium Risk': r.Medium * 10, 'High Risk': r.High * 18 }));
  return (
    <ResponsiveContainer width="100%" height={208}>
      <AreaChart data={spoilagePredData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gMed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="#f0f1f3" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.replace('May ', '').replace('Jun ', 'J')}
          dy={5}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#d1d5db', strokeWidth: 1.5, strokeDasharray: '4 3' }}
        />
        <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5} strokeOpacity={0.7} />
        <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} strokeOpacity={0.7} />
        <Area type="monotone" dataKey="Low Risk"    name="Low Risk"    stroke="#22c55e" strokeWidth={2} fill="url(#gLow)"  dot={false} activeDot={{ r: 4, strokeWidth: 2.5, stroke: '#fff', fill: '#22c55e' }} />
        <Area type="monotone" dataKey="Medium Risk" name="Medium Risk" stroke="#f59e0b" strokeWidth={2} fill="url(#gMed)"  dot={false} activeDot={{ r: 4, strokeWidth: 2.5, stroke: '#fff', fill: '#f59e0b' }} />
        <Area type="monotone" dataKey="High Risk"   name="High Risk"   stroke="#ef4444" strokeWidth={2} fill="url(#gHigh)" dot={false} activeDot={{ r: 4, strokeWidth: 2.5, stroke: '#fff', fill: '#ef4444' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
