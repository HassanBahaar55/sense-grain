'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportTypeData } from '@/features/reports/mockData';

interface TooltipEntry {
  name?:  string;
  value?: number;
  payload?: { color?: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black/[0.07] p-3 min-w-[140px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.payload?.color }}
          />
          <span className="text-[11px] text-gray-600 font-medium">{entry.name}</span>
        </div>
        <span className="text-[12px] font-bold text-gray-900 tabular-nums">{entry.value}%</span>
      </div>
    </div>
  );
}

export function ReportTypesChart() {
  const total = reportTypeData.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={reportTypeData}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {reportTypeData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-[22px] font-bold text-gray-900 leading-none tabular-nums">{total}</p>
          <p className="text-[10px] text-gray-400 font-semibold mt-1">Reports</p>
        </div>
      </div>
    </div>
  );
}
