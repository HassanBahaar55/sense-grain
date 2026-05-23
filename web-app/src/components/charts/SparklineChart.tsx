'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SparklineChartProps {
  values: number[];
  color: string;
}

function SparkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
      {payload[0].value}
    </div>
  );
}

export function SparklineChart({ values, color }: SparklineChartProps) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.8}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          isAnimationActive={false}
        />
        <Tooltip content={<SparkTooltip />} cursor={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
