'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { PredictionForecastChart } from '@/components/charts/PredictionForecastChart';
import { RiskForecastChart } from '@/components/charts/RiskForecastChart';
import {
  forecastSeries,
  type TrendDir,
  type RiskLevel,
  type Timeframe,
} from './mockData';
import { type ParamForecastCard } from '@/lib/dataEngine';
import { useFirestorePredictions as usePredictionsData, useSensorHistory } from '@/lib/useFirestoreData';
import { useLiveData } from '@/contexts/LiveDataContext';
import { cn } from '@/lib/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const paramColorMap = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  bar: 'bg-amber-400',  hex: '#f59e0b' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   bar: 'bg-blue-400',   hex: '#3b82f6' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  bar: 'bg-green-400',  hex: '#10b981' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-400', hex: '#8b5cf6' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   bar: 'bg-teal-400',   hex: '#14b8a6' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-400', hex: '#6366f1' },
};

const riskConfig: Record<RiskLevel, { badge: string; label: string }> = {
  low:      { badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',    label: 'Low'      },
  medium:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',    label: 'Medium'   },
  high:     { badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',          label: 'High'     },
  inactive: { badge: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',      label: 'Inactive' },
};

const trendLabels: Record<string, { label: string; cls: string }> = {
  up:          { label: '↑ Rising',      cls: 'bg-red-50 text-red-600'      },
  'slight-up': { label: '↗ Slight Rise', cls: 'bg-amber-50 text-amber-700' },
  stable:      { label: '→ Stable',      cls: 'bg-gray-100 text-gray-500'   },
  down:        { label: '↓ Declining',   cls: 'bg-green-50 text-green-700'  },
};

const paramIcons: Record<string, React.ReactNode> = {
  temp:     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>,
  humidity: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>,
  moisture: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /><path d="M12 2.69v15" /></svg>,
  co2:      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6M12 9v6" /><circle cx="12" cy="12" r="10" /></svg>,
  aqi:      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  capacity: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm', className)}>
      {children}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-20 h-9 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Trend icon for table ─────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: TrendDir | null }) {
  if (!trend) return <span className="text-gray-300 font-bold">—</span>;
  if (trend === 'stable') return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
  if (trend === 'slight-up') return <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="18" x2="19" y2="8" /><polyline points="12 5 19 8 19 15" /></svg>;
  return <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="18" x2="19" y2="6" /><polyline points="12 4 19 6 19 13" /></svg>;
}

// ─── Parameter card ───────────────────────────────────────────────────────────

function ParamCard({ card }: { card: ParamForecastCard }) {
  const cfg = paramColorMap[card.colorKey];
  const tCfg = (card.trend ? trendLabels[card.trend] : null) ?? { label: '—', cls: 'bg-gray-100 text-gray-400' };
  return (
    <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
            <span className={cfg.text}>{paramIcons[card.key]}</span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight">{card.label}</p>
        </div>
        <SparkLine data={card.sparkData} color={cfg.hex} />
      </div>

      <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
        <span className="text-[22px] font-bold text-gray-900 leading-none tabular-nums">{card.current}</span>
        <span className="text-[11px] text-gray-400 font-medium">{card.unit}</span>
        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        <span className={cn('text-[22px] font-bold leading-none tabular-nums', cfg.text)}>{card.forecast}</span>
        <span className="text-[11px] text-gray-400 font-medium">{card.unit}</span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', tCfg.cls)}>{tCfg.label}</span>
        <span className="text-[10px] text-gray-400 font-medium">{card.confidence}% confidence</span>
      </div>

      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div className={cn('h-full rounded-full', cfg.bar)} style={{ width: `${card.confidence}%` }} />
      </div>

      <p className="text-[10px] text-gray-400 font-medium">
        Range: {card.rangeMin}–{card.rangeMax} {card.unit}
      </p>
    </Card>
  );
}

// ─── Prediction Summary Panel (live data) ────────────────────────────────────

function PredictionSummaryPanel({ timeframe }: { timeframe: Timeframe }) {
  const { readings, tick } = useLiveData();
  const history = useSensorHistory(7);

  const { condition, conditionLevel, trend, attention, confidence } = useMemo(() => {
    const whList = Object.values(readings);
    const highCount   = whList.filter(w => w.status === 'high').length;
    const mediumCount = whList.filter(w => w.status === 'medium').length;

    const conditionLevel: RiskLevel = highCount > 0 ? 'high' : mediumCount > 1 ? 'medium' : 'low';
    const condition =
      highCount > 0 ? 'High Risk' :
      mediumCount > 1 ? 'Moderate Risk' : 'Good Condition';

    // Trend from last 7 days of history
    let trend = 'Stable conditions across all warehouses';
    if (history.length >= 4) {
      const half   = Math.floor(history.length / 2);
      const recent = history.slice(half);
      const older  = history.slice(0, half);
      const avg = (arr: typeof history, k: 'temperature' | 'humidity') =>
        arr.reduce((s, h) => s + h.averages[k], 0) / arr.length;
      const dT = avg(recent, 'temperature') - avg(older, 'temperature');
      const dH = avg(recent, 'humidity')    - avg(older, 'humidity');
      if (dT > 1 && dH > 2) trend = `Temperature +${dT.toFixed(1)}°C & humidity +${Math.round(dH)}% rising over 7 days`;
      else if (dT > 1)       trend = `Temperature rising +${dT.toFixed(1)}°C over last 7 days`;
      else if (dH > 2)       trend = `Humidity trending up +${Math.round(dH)}% over last 7 days`;
      else if (dT < -1)      trend = 'Temperature declining — conditions improving';
    }

    // Attention: worst warehouse by spoilage risk
    const worst = [...whList]
      .filter(w => w.status !== 'good')
      .sort((a, b) => b.spoilageRisk - a.spoilageRisk)[0];
    const attention = worst
      ? `${worst.warehouseId}: ${worst.status === 'high' ? 'Critical' : 'Elevated'} risk · spoilage index ${Math.round(worst.spoilageRisk)}%`
      : 'All warehouses operating within safe parameters';

    // Confidence based on how much history we have
    const confidence = history.length >= 14 ? 91 : history.length >= 7 ? 85 : history.length >= 3 ? 72 : 60;

    return { condition, conditionLevel, trend, attention, confidence };
  }, [readings, history]);

  const nextUpdateMin = useMemo(() => {
    const secPast = Math.floor(Date.now() / 1000) % 120;
    return Math.max(1, Math.ceil((120 - secPast) / 60));
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const conditionBg   = conditionLevel === 'high' ? 'bg-red-50 ring-red-100'   : conditionLevel === 'medium' ? 'bg-amber-50 ring-amber-100' : 'bg-green-50 ring-green-100';
  const conditionIcon = conditionLevel === 'high'
    ? <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>;
  const conditionIconColor = conditionLevel === 'high' ? 'text-red-500' : conditionLevel === 'medium' ? 'text-amber-600' : 'text-green-600';
  const conditionIconBg    = conditionLevel === 'high' ? 'bg-red-100'   : conditionLevel === 'medium' ? 'bg-amber-100'   : 'bg-green-100';
  const conditionTextColor = conditionLevel === 'high' ? 'text-red-600' : conditionLevel === 'medium' ? 'text-amber-600' : 'text-green-600';

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-gray-900">Prediction Summary</h2>
        <span className="flex items-center gap-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
          </span>
          Live · {timeframe}
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Overall Condition — live */}
        <div className={cn('flex items-start gap-3 p-3 rounded-xl ring-1', conditionBg)}>
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', conditionIconBg)}>
            <svg className={cn('w-3.5 h-3.5', conditionIconColor)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{conditionIcon}</svg>
          </div>
          <div>
            <p className={cn('text-[9px] font-bold uppercase tracking-wider', conditionTextColor)}>Overall Condition</p>
            <p className="text-[13px] font-bold text-gray-800 mt-0.5">{condition}</p>
          </div>
        </div>

        {/* Trend — computed from history */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 ring-1 ring-blue-100">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">7-Day Trend</p>
            <p className="text-[12px] font-semibold text-gray-700 mt-0.5 leading-snug">{trend}</p>
          </div>
        </div>

        {/* Attention — highest-risk warehouse from live data */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 ring-1 ring-red-100">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Attention Required</p>
            <p className="text-[12px] font-semibold text-gray-700 mt-0.5 leading-snug">{attention}</p>
          </div>
        </div>

        {/* Confidence — based on available data */}
        <div className="p-3 rounded-xl bg-gray-50 ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Forecast Confidence</p>
            <span className="text-[14px] font-bold text-[#1f5135]">{confidence}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#1f5135] rounded-full transition-all duration-500" style={{ width: `${confidence}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 mt-1.5">Based on {history.length} days of sensor history</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="text-center p-2.5 rounded-xl bg-gray-50">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Data Source</p>
            <p className="text-[10px] font-bold text-gray-700 mt-0.5 leading-tight">Live Sensors</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-green-50">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Next Sync</p>
            <p className="text-[13px] font-bold text-[#1f5135] mt-0.5">{nextUpdateMin} min</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Timeframe adjustment for parameter cards ────────────────────────────────

const timeframeMeta: Record<Timeframe, { confDelta: number; mult: number }> = {
  '24H': { confDelta: +5,  mult: 0.15 },
  '3D':  { confDelta: +2,  mult: 0.45 },
  '7D':  { confDelta: 0,   mult: 1.0  },
  '14D': { confDelta: -5,  mult: 1.55 },
  '30D': { confDelta: -12, mult: 2.3  },
};

function adjustCards(cards: ParamForecastCard[], timeframe: Timeframe) {
  const tf = timeframeMeta[timeframe];
  return cards.map(card => {
    const delta = (card.forecast - card.current) * tf.mult;
    const raw = card.current + delta;
    const dec = String(card.forecast).includes('.') ? String(card.forecast).split('.')[1].length : 0;
    return {
      ...card,
      forecast: dec > 0 ? parseFloat(raw.toFixed(dec)) : Math.round(raw),
      confidence: Math.min(99, Math.max(55, card.confidence + tf.confDelta)),
    };
  });
}

// ─── Tab: Parameter Forecasts ─────────────────────────────────────────────────

function ParamForecastsTab({ timeframe, warehouse }: { timeframe: Timeframe; warehouse: string }) {
  const { paramCards: rawCards } = usePredictionsData();
  const paramForecastCards = adjustCards(rawCards, timeframe);

  return (
    <div className="space-y-5">
      {/* 6 Parameter cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {paramForecastCards.map((card) => <ParamCard key={card.key} card={card} />)}
      </section>

      {/* Forecast chart + summary panel */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] gap-5">
        <Card className="p-5 min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Environmental Forecast</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Stability index — Historical (solid) & AI Forecast (dashed) · {warehouse}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#1f5135] bg-green-50 px-2 py-1 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {timeframe} Forecast
            </div>
          </div>
          <PredictionForecastChart timeframe={timeframe} />
          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
            {forecastSeries.map((s) => (
              <span key={s.hist} className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} (Historical)
                <span className="w-5 border-t-2 border-dashed" style={{ borderColor: s.color }} />
                (Forecast)
              </span>
            ))}
          </div>
        </Card>
        <PredictionSummaryPanel timeframe={timeframe} />
      </section>
    </div>
  );
}

// ─── Tab: Warehouse Forecasts ─────────────────────────────────────────────────

function WarehouseForecastsTab({ timeframe, warehouse }: { timeframe: Timeframe; warehouse: string }) {
  const { whPredTable } = usePredictionsData();
  const filtered = warehouse === 'All Warehouses'
    ? whPredTable
    : whPredTable.filter(r => r.id === warehouse || r.name.includes(warehouse.replace('WH-', '')));
  const displayTable = filtered.length > 0 ? filtered : whPredTable;

  return (
    <Card className="p-5 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Warehouse-wise Forecasts</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-predicted values · {timeframe} horizon · {warehouse}</p>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#1f5135] bg-green-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Predictions
        </span>
      </div>
      <div className="overflow-x-auto max-w-full rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Warehouse', 'Overall Risk', `Temp (${timeframe})`, `Humidity (${timeframe})`, `Moisture (${timeframe})`, `CO₂ (${timeframe})`, `AQI (${timeframe})`, `Capacity (${timeframe})`, 'Trend'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayTable.map((row) => {
              const rc = riskConfig[row.overallRisk];
              const isInactive = row.overallRisk === 'inactive';
              const nullCell = <span className="text-gray-300">—</span>;
              return (
                <tr key={row.id} className="hover:bg-gray-50/80 transition-colors cursor-pointer">
                  <td className="px-3 py-3">
                    <p className="font-bold text-gray-800">{row.name}</p>
                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">{row.id}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', rc.badge)}>{rc.label}</span>
                  </td>
                  <td className={cn('px-3 py-3 font-bold tabular-nums', isInactive ? 'text-gray-300' : row.tempForecast >= 34 ? 'text-red-600' : row.tempForecast >= 30 ? 'text-orange-600' : row.tempForecast >= 28 ? 'text-amber-600' : 'text-gray-700')}>
                    {row.tempForecast.toFixed(1)}
                  </td>
                  <td className={cn('px-3 py-3 font-semibold tabular-nums', isInactive ? 'text-gray-300' : row.humForecast >= 75 ? 'text-amber-600' : 'text-gray-700')}>
                    {row.humForecast}%
                  </td>
                  <td className={cn('px-3 py-3 font-semibold tabular-nums', isInactive ? 'text-gray-300' : row.moistForecast >= 14 ? 'text-amber-600' : 'text-gray-700')}>
                    {row.moistForecast.toFixed(1)}%
                  </td>
                  <td className={cn('px-3 py-3 font-semibold tabular-nums', isInactive ? 'text-gray-300' : row.co2Forecast >= 580 ? 'text-red-600' : 'text-gray-700')}>
                    {row.co2Forecast}
                  </td>
                  <td className={cn('px-3 py-3 font-semibold tabular-nums', isInactive ? 'text-gray-300' : row.aqiForecast >= 50 ? 'text-amber-600' : 'text-gray-700')}>
                    {row.aqiForecast}
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-700 tabular-nums">
                    {row.capForecast ?? nullCell}
                  </td>
                  <td className="px-3 py-3">
                    <TrendIcon trend={row.trend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-3 font-medium">
        Predictions are extrapolated from live sensor readings · Updates every 2 minutes
      </p>
    </Card>
  );
}

// ─── Tab: Risk Forecast ───────────────────────────────────────────────────────

function RiskForecastTab() {
  const { riskForecastData } = usePredictionsData();
  const lastDay = riskForecastData[riskForecastData.length - 1];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] gap-5">
      <Card className="p-5 min-w-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">Risk Level Forecast</h2>
            <p className="text-xs text-gray-400 mt-0.5">7-day projected zone risk distribution</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {[{ l: 'Low', c: '#22c55e' }, { l: 'Medium', c: '#f59e0b' }, { l: 'High', c: '#ef4444' }].map((s) => (
              <span key={s.l} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: s.c }} />{s.l}
              </span>
            ))}
          </div>
        </div>
        <RiskForecastChart />
      </Card>

      <Card className="p-5 min-w-0">
        <h2 className="text-[15px] font-bold text-gray-900 mb-4">Risk Projection</h2>
        <div className="space-y-4">
          {[
            { label: 'Low Risk Zones',    key: 'Low',    color: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50', val: lastDay.Low    },
            { label: 'Medium Risk Zones', key: 'Medium', color: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', val: lastDay.Medium  },
            { label: 'High Risk Zones',   key: 'High',   color: 'bg-red-400',   text: 'text-red-600',   bg: 'bg-red-50',   val: lastDay.High   },
          ].map((item) => (
            <div key={item.key} className={cn('p-3.5 rounded-xl', item.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-700">{item.label}</span>
                <span className={cn('text-[18px] font-bold', item.text)}>{item.val.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', item.color)} style={{ width: `${item.val}%` }} />
              </div>
              <p className="text-[9px] text-gray-500 mt-1 font-medium">Projected · 7-day outlook</p>
            </div>
          ))}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-700 mb-2">7-Day Risk Change</p>
            <div className="space-y-1.5">
              {[
                { label: 'Low Risk',    delta: `${(riskForecastData[6].Low    - riskForecastData[0].Low).toFixed(1)}%`,    col: 'text-red-600'   },
                { label: 'Medium Risk', delta: `+${(riskForecastData[6].Medium - riskForecastData[0].Medium).toFixed(1)}%`, col: 'text-amber-600' },
                { label: 'High Risk',   delta: `+${(riskForecastData[6].High   - riskForecastData[0].High).toFixed(1)}%`,   col: 'text-red-600'   },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-medium">{r.label}</span>
                  <span className={cn('text-[11px] font-bold', r.col)}>{r.delta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'params' | 'warehouses' | 'risk';

const TABS: { id: Tab; label: string }[] = [
  { id: 'params',     label: 'Parameter Forecasts' },
  { id: 'warehouses', label: 'Warehouse Forecasts' },
  { id: 'risk',       label: 'Risk Forecast'       },
];

const TIMEFRAMES: Timeframe[] = ['24H', '3D', '7D', '14D', '30D'];
const WAREHOUSES = ['All Warehouses', 'WH-A', 'WH-B', 'WH-C', 'WH-D', 'WH-E', 'WH-F', 'WH-G'];

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('params');
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [warehouse, setWarehouse] = useState('All Warehouses');
  const [isRunning, setIsRunning] = useState(false);
  const [runToast,  setRunToast]  = useState<{ timeframe: string; warehouse: string } | null>(null);

  function handleRunPrediction() {
    if (isRunning) return;
    setIsRunning(true);
    setRunToast(null);
    setTimeout(() => {
      setIsRunning(false);
      setRunToast({ timeframe, warehouse });
      setTimeout(() => setRunToast(null), 4000);
    }, 2500);
  }

  const selectCls = 'h-8 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1f5135]/20 transition-colors appearance-none cursor-pointer';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
      {/* Run Prediction toast */}
      {runToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white rounded-2xl shadow-xl ring-1 ring-black/[0.08] px-5 py-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black text-gray-900">Forecast Updated</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{runToast.timeframe} · {runToast.warehouse}</p>
            <p className="text-[10.5px] text-[#1f5135] font-semibold mt-1">Predictions refreshed from live data</p>
          </div>
          <button onClick={() => setRunToast(null)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 flex-shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      <DashboardHeader
        title="Predictions"
        subtitle="AI-powered forecasts for all environmental parameters and overall risk"
      />

      <main className="flex-1 p-6 space-y-5 overflow-y-auto overflow-x-hidden">

        {/* ── Tab Navigation ──────────────────────────────────────────────── */}
        <Card className="p-1.5 flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-[#1f5135] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </Card>

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        <Card className="px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Warehouse selector */}
            <div className="relative">
              <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={selectCls}>
                {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {/* Timeframe pills */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    'h-6 px-2.5 rounded-lg text-[10px] font-bold transition-all duration-150',
                    timeframe === t ? 'bg-[#1f5135] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="ml-auto">
              <button
                onClick={handleRunPrediction}
                disabled={isRunning}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-4 rounded-lg text-white text-[11px] font-semibold transition-all shadow-sm',
                  isRunning ? 'bg-[#1f5135]/70 cursor-not-allowed' : 'bg-[#1f5135] hover:bg-[#174028] active:scale-95',
                )}
              >
                {isRunning ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                    Run Prediction
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        {activeTab === 'params'     && <ParamForecastsTab     timeframe={timeframe} warehouse={warehouse} />}
        {activeTab === 'warehouses' && <WarehouseForecastsTab timeframe={timeframe} warehouse={warehouse} />}
        {activeTab === 'risk'       && <RiskForecastTab />}

      </main>
    </div>
  );
}
