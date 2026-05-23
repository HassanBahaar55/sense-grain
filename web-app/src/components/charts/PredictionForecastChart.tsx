'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine,
} from 'recharts';
import { useSensorHistory } from '@/lib/useFirestoreData';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SERIES = [
  { key: 'temp',    foreKey: 'tempF',    color: '#f59e0b', label: 'Temperature' },
  { key: 'hum',     foreKey: 'humF',     color: '#3b82f6', label: 'Humidity'    },
  { key: 'moist',   foreKey: 'moistF',   color: '#10b981', label: 'Moisture'    },
  { key: 'co2',     foreKey: 'co2F',     color: '#8b5cf6', label: 'CO₂'         },
];

function dayLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function addDays(d: Date, n: number): Date {
  const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd;
}

// Convert raw averages to a 0–100 stability index
function toStability(avg: { temperature: number; humidity: number; moisture: number; co2: number }) {
  return {
    temp:  Math.max(40, Math.round(100 - Math.max(0, avg.temperature - 24) * 5)),
    hum:   Math.max(40, Math.round(100 - Math.max(0, avg.humidity    - 55) * 2.5)),
    moist: Math.max(40, Math.round(100 - Math.max(0, avg.moisture    - 10) * 8)),
    co2:   Math.min(98, Math.max(60, Math.round(88 - Math.max(0, avg.co2  - 500) * 0.1))),
  };
}

function timeframeToDays(tf: string): number {
  if (tf === '24H') return 3;
  if (tf === '3D')  return 3;
  if (tf === '7D')  return 7;
  if (tf === '14D') return 14;
  return 30;
}
function forecastCount(tf: string): number {
  if (tf === '24H' || tf === '3D') return 3;
  return 7;
}

type ChartPoint = {
  day: string;
  temp: number | null;   hum: number | null;   moist: number | null;   co2: number | null;
  tempF: number | null;  humF: number | null;  moistF: number | null;  co2F: number | null;
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(e => e.value != null);
  if (!visible.length) return null;
  // At the transition point (today), both historical and forecast entries exist.
  // Remove forecast duplicates when a historical entry for the same series is present.
  const deduped = visible.filter(entry => {
    if (!entry.name?.includes('(Forecast)')) return true;
    const baseName = entry.name.replace(' (Forecast)', '');
    return !visible.some(e => e.name === baseName);
  });
  const isForecastOnly = deduped.every(e => e.name?.includes('(Forecast)'));
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] p-3 min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      {isForecastOnly && (
        <p className="text-[9px] text-blue-400 font-semibold mb-1.5">Forecast</p>
      )}
      {deduped.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[2px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] text-gray-600">
              {entry.name?.replace(' (Forecast)', '') ?? entry.name}
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PredictionForecastChart({ timeframe }: { timeframe: string }) {
  const histDays = timeframeToDays(timeframe);
  const foreN    = forecastCount(timeframe);
  const history  = useSensorHistory(histDays);
  const today    = new Date();
  const todayLabel = dayLabel(today);

  const chartData = useMemo((): ChartPoint[] => {
    const result: ChartPoint[] = [];

    // Build historical stability points
    const histPoints: ChartPoint[] = history.map(h => {
      const s = toStability(h.averages);
      return { day: dayLabel(new Date(h.date + 'T00:00:00')), ...s, tempF: null, humF: null, moistF: null, co2F: null };
    });

    // If Firestore not yet seeded, generate placeholder historical data
    if (histPoints.length === 0) {
      for (let i = histDays - 1; i >= 0; i--) {
        histPoints.push({
          day: dayLabel(addDays(today, -i)),
          temp: 75, hum: 70, moist: 72, co2: 85,
          tempF: null, humF: null, moistF: null, co2F: null,
        });
      }
    }

    // Compute linear slope from last 3 historical points for extrapolation
    const nSlope = Math.min(3, histPoints.length);
    const last3  = histPoints.slice(-nSlope);
    const slope  = (key: 'temp' | 'hum' | 'moist' | 'co2') =>
      nSlope >= 2 ? ((last3[last3.length - 1][key]! - last3[0][key]!) / (nSlope - 1)) : 0;

    const slopes = { temp: slope('temp'), hum: slope('hum'), moist: slope('moist'), co2: slope('co2') };

    // Last historical day = transition point (also start of forecast line)
    const lastHist = histPoints[histPoints.length - 1];
    if (lastHist) {
      lastHist.tempF  = lastHist.temp;
      lastHist.humF   = lastHist.hum;
      lastHist.moistF = lastHist.moist;
      lastHist.co2F   = lastHist.co2;
    }
    result.push(...histPoints);

    // Forecast: extrapolate with mean-reversion dampening
    const base = lastHist ?? { temp: 75, hum: 70, moist: 72, co2: 85 };
    for (let i = 1; i <= foreN; i++) {
      const damp = Math.pow(0.85, i); // dampen slope so it doesn't diverge
      result.push({
        day:   dayLabel(addDays(today, i)),
        temp: null, hum: null, moist: null, co2: null,
        tempF:  Math.max(40, Math.min(98, Math.round((base.temp!  ?? 75) + slopes.temp  * i * damp))),
        humF:   Math.max(40, Math.min(98, Math.round((base.hum!   ?? 70) + slopes.hum   * i * damp))),
        moistF: Math.max(40, Math.min(98, Math.round((base.moist! ?? 72) + slopes.moist * i * damp))),
        co2F:   Math.max(40, Math.min(98, Math.round((base.co2!   ?? 85) + slopes.co2   * i * damp))),
      });
    }

    return result;
  }, [history, histDays, foreN]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstForeDay = chartData.find(p => p.temp === null && p.tempF !== null)?.day;
  const labelInterval = histDays >= 14 ? 4 : 'preserveStartEnd';

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        {firstForeDay && <ReferenceArea x1={firstForeDay} fill="#f0f9ff" fillOpacity={0.6} />}

        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          interval={labelInterval as number | 'preserveStartEnd'}
          tickFormatter={(v: string) => {
            const p = v.split(' ');
            return ['Jun','Jul','Aug'].includes(p[0]) ? `J${p[1]}` : p[1];
          }}
          dy={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          domain={[40, 100]}
          ticks={[40, 60, 80, 100]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        <ReferenceLine
          x={todayLabel}
          stroke="#1f5135"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          label={{ value: 'Today', position: 'top', fontSize: 9, fill: '#1f5135', fontWeight: 700 }}
        />

        {SERIES.map(s => (
          <Line key={`h-${s.key}`} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color} strokeWidth={2} dot={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color }}
            connectNulls={false}
          />
        ))}
        {SERIES.map(s => (
          <Line key={`f-${s.foreKey}`} type="monotone" dataKey={s.foreKey} name={`${s.label} (Forecast)`}
            stroke={s.color} strokeWidth={2} strokeDasharray="6 4" dot={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
