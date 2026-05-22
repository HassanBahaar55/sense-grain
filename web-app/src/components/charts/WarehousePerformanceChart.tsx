'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useWhPerformanceData, type WHPerformancePoint } from '@/lib/dataEngine';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] p-3.5 min-w-[152px]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 pb-2 border-b border-gray-100">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[3px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
          </div>
          <span className="text-[12px] font-bold text-gray-900 tabular-nums">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

const barSeries = [
  { key: 'Efficiency'  as const, color: '#1f5135', label: 'Efficiency'  },
  { key: 'Stability'   as const, color: '#3b82f6', label: 'Stability'   },
  { key: 'Utilization' as const, color: '#f59e0b', label: 'Utilization' },
];

export function WarehousePerformanceChart({ data: propData }: { data?: WHPerformancePoint[] } = {}) {
  const generated = useWhPerformanceData();
  const whPerformanceData = propData ?? generated;
  return (
    <ResponsiveContainer width="100%" height={208}>
      <BarChart data={whPerformanceData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 6" stroke="#f0f1f3" vertical={false} />
        <XAxis
          dataKey="warehouse"
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          dy={5}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
        {barSeries.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={11} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
