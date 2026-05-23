'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface CapacityGaugeChartProps {
  capacity: number;
  used: number;
}

export function CapacityGaugeChart({ capacity, used }: CapacityGaugeChartProps) {
  const safeCap = Math.round(capacity * 0.8);
  const safeUsed = Math.min(used, safeCap);
  const overUsed = Math.max(0, used - safeCap);
  const remaining = capacity - used;
  const usedPct = Math.round((used / capacity) * 100);

  const segments = [
    { value: safeUsed, color: '#1f5135' },
    { value: overUsed, color: '#f59e0b' },
    { value: remaining, color: '#f3f4f6' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={74}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              paddingAngle={overUsed > 0 ? 1 : 0}
              strokeWidth={0}
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-bold text-gray-900 leading-none">{usedPct}<span className="text-[16px]">%</span></span>
          <span className="text-[11px] font-semibold text-gray-400 mt-0.5">Used</span>
        </div>
      </div>
      <p className="text-[13px] font-bold text-gray-600 mt-1">
        {used.toLocaleString()} / {capacity.toLocaleString()} Tons
      </p>
    </div>
  );
}
