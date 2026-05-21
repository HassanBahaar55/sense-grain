'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { riskDistribution } from '@/features/dashboard/mockData';

const pieData = riskDistribution.map((d) => ({
  name: d.label,
  value: d.count,
  color: d.color,
}));

interface TooltipEntry {
  name?: string;
  value?: number;
  payload?: { color?: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: d.payload?.color }}
        />
        <span className="text-[11px] font-semibold text-gray-700">{d.name}</span>
        <span className="text-[11px] font-bold text-gray-900 ml-1">{d.value}</span>
      </div>
    </div>
  );
}

export function RiskDonutChart() {
  const total = riskDistribution.reduce((s, d) => s + d.count, 0);
  return (
    <div className="relative w-full" style={{ height: 148 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={66}
            paddingAngle={3}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[22px] font-bold text-gray-900 leading-none">{total}</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
          Units
        </span>
      </div>
    </div>
  );
}
