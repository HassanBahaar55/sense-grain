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
  ReferenceArea,
} from 'recharts';
import { parameterTrends, trendSeries } from '@/features/monitor/mockData';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black/[0.08] p-3 min-w-[172px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{label}</p>
      {payload.map((entry, i) => {
        const series = trendSeries.find((s) => s.key === entry.dataKey);
        const rawValue = series && entry.value
          ? ((entry.value / 100) * series.threshold).toFixed(series.key === 'co2' ? 0 : 1)
          : entry.value;
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-[3px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-gray-800">{rawValue}{series?.unit}</span>
              <span className="text-[10px] text-gray-400 ml-1">({entry.value?.toFixed(1)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ParameterTrendsChart() {
  return (
    // touch-action: pan-y lets vertical scroll work on mobile while the chart handles horizontal drag
    <div style={{ touchAction: 'pan-y' }}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={parameterTrends} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
        {/* Warning zone shading */}
        <ReferenceArea y1={75} y2={90} fill="#fef3c7" fillOpacity={0.5} />
        <ReferenceArea y1={90} y2={100} fill="#fee2e2" fillOpacity={0.4} />
        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1} label={{ value: 'Warn', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1} label={{ value: 'Crit', position: 'right', fontSize: 9, fill: '#ef4444' }} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          dy={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          domain={[30, 100]}
          ticks={[30, 50, 75, 90, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }} />
        {trendSeries.map((s) => (
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
    </div>
  );
}
