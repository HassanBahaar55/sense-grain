'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine,
} from 'recharts';
import { mainForecastData, forecastSeries } from '@/features/predictions/mockData';

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((e) => e.value != null);
  if (!visible.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] p-3 min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {visible.map((entry, i) => (
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

export function PredictionForecastChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={mainForecastData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        {/* Forecast region shading */}
        <ReferenceArea x1="May 27" x2="Jun 02" fill="#f0f9ff" fillOpacity={0.6} />

        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => {
            const parts = v.split(' ');
            return parts[0] === 'Jun' ? `J${parts[1]}` : parts[1];
          }}
          dy={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          domain={[50, 100]}
          ticks={[50, 60, 70, 80, 90, 100]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />

        {/* "Today" divider */}
        <ReferenceLine
          x="May 26"
          stroke="#1f5135"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          label={{ value: 'Today', position: 'top', fontSize: 9, fill: '#1f5135', fontWeight: 700 }}
        />

        {/* Historical lines (solid) */}
        {forecastSeries.map((s) => (
          <Line
            key={`hist-${s.hist}`}
            type="monotone"
            dataKey={s.hist}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color }}
            connectNulls={false}
          />
        ))}

        {/* Forecast lines (dashed) */}
        {forecastSeries.map((s) => (
          <Line
            key={`fore-${s.fore}`}
            type="monotone"
            dataKey={s.fore}
            name={`${s.label} (Forecast)`}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
