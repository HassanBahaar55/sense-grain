import React, {useMemo} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import {
  type AnalyticsData,
  type AnalyticsKPI,
  type EnvTrendPoint,
  type WHPerformancePoint,
} from '../../lib/dataEngine';
import {fontWeight} from '../../theme/tokens';
import {useLiveData} from '../../contexts/LiveDataContext';

// ─── Design constants ─────────────────────────────────────────────────────────

const C = {
  primary: '#1f5135',
  bg: '#f6f8f3',
  white: '#ffffff',
  textPrimary: '#172118',
  textSecondary: '#5e6b5f',
  textMuted: '#8e9b8f',
  border: '#e5e7eb',
};

const COLOR_KEY: Record<AnalyticsKPI['colorKey'], string> = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
};

const ENV_LINE_COLORS: Record<keyof Omit<EnvTrendPoint, 'day'>, string> = {
  Temperature: '#f59e0b',
  Humidity: '#3b82f6',
  Moisture: '#22c55e',
  CO2: '#8b5cf6',
  AQI: '#14b8a6',
};

// ─── Static events data ───────────────────────────────────────────────────────

const RECENT_EVENTS = [
  {id: 'e1', color: '#8b5cf6', dot: '#c4b5fd', label: 'AI Model retrained — 94.2% accuracy', time: '09:14 AM'},
  {id: 'e2', color: '#14b8a6', dot: '#99f6e4', label: 'Sync complete — 7 warehouses updated', time: '08:52 AM'},
  {id: 'e3', color: '#22c55e', dot: '#86efac', label: 'WH-D alert resolved — humidity normalized', time: '08:30 AM'},
  {id: 'e4', color: '#f59e0b', dot: '#fcd34d', label: 'WH-B temperature elevated — monitoring', time: '07:55 AM'},
  {id: 'e5', color: '#3b82f6', dot: '#93c5fd', label: 'Sensor calibration complete — WH-A, WH-C', time: '07:10 AM'},
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrendUpIcon({color, size = 13}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="17 6 23 6 23 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrendDownIcon({color, size = 13}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="17 18 23 18 23 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrendStableIcon({color, size = 13}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function TrophyIcon({color, size = 16}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9H3V4h3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 9h3V4h-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 17c-2.76 0-5-2.24-5-5V4h10v8c0 2.76-2.24 5-5 5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 17v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 21h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AlertIcon({color, size = 16}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.8" fill={color} stroke={color} strokeWidth={0.5} />
    </Svg>
  );
}

function WifiIcon({color, size = 14}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1.42 9a16 16 0 0 1 21.16 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({kpi}: {kpi: AnalyticsKPI}) {
  const accent = COLOR_KEY[kpi.colorKey];
  const isGoodTrend = kpi.invertedTrend
    ? kpi.trend === 'down'
    : kpi.trend === 'up' || kpi.trend === 'slight-up';
  const isBadTrend = kpi.invertedTrend
    ? kpi.trend === 'up' || kpi.trend === 'slight-up'
    : kpi.trend === 'down';

  const trendColor = isGoodTrend ? '#15803d' : isBadTrend ? '#dc2626' : '#6b7280';

  return (
    <View style={[styles.kpiCard, {borderTopColor: accent, borderTopWidth: 3}]}>
      <Text style={styles.kpiLabel}>{kpi.label}</Text>
      <View style={styles.kpiValueRow}>
        <Text style={[styles.kpiValue, {color: accent}]}>
          {kpi.value}
          <Text style={styles.kpiUnit}>{kpi.unit}</Text>
        </Text>
      </View>
      <View style={styles.kpiDeltaRow}>
        {kpi.trend === 'up' || kpi.trend === 'slight-up' ? (
          <TrendUpIcon color={trendColor} />
        ) : kpi.trend === 'down' ? (
          <TrendDownIcon color={trendColor} />
        ) : (
          <TrendStableIcon color={trendColor} />
        )}
        <Text style={[styles.kpiDelta, {color: trendColor}]}>{kpi.delta}</Text>
      </View>
    </View>
  );
}

// ─── Overall Stability Gauge ──────────────────────────────────────────────────

function StabilityGauge({value}: {value: number}) {
  const SIZE = 160;
  const R = 60;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 14;

  // Arc from -210° to 30° (240° sweep for a gauge)
  const START_ANGLE = -210 * (Math.PI / 180);
  const END_ANGLE = 30 * (Math.PI / 180);
  const TOTAL_SWEEP = END_ANGLE - START_ANGLE;

  // Value arc end
  const fillFraction = Math.min(1, Math.max(0, value / 100));
  const fillAngle = START_ANGLE + TOTAL_SWEEP * fillFraction;

  function arcPath(startA: number, endA: number): string {
    const x1 = CX + R * Math.cos(startA);
    const y1 = CY + R * Math.sin(startA);
    const x2 = CX + R * Math.cos(endA);
    const y2 = CY + R * Math.sin(endA);
    const large = Math.abs(endA - startA) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  }

  const gaugeColor =
    value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.gaugeWrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background arc */}
        <Path
          d={arcPath(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Fill arc */}
        {fillFraction > 0 && (
          <Path
            d={arcPath(START_ANGLE, fillAngle)}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <SvgText
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          fill={gaugeColor}
          fontSize={28}
          fontWeight="700">
          {value}
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 12}
          textAnchor="middle"
          fill={C.textMuted}
          fontSize={10}>
          overall stability
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fill={gaugeColor}
          fontSize={11}
          fontWeight="600">
          {value >= 80 ? 'Excellent' : value >= 60 ? 'Fair' : 'Poor'}
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── Environmental Trend Chart ─────────────────────────────────────────────────

const ENV_PARAMS: (keyof Omit<EnvTrendPoint, 'day'>)[] = [
  'Temperature',
  'Humidity',
  'Moisture',
  'CO2',
  'AQI',
];

function EnvTrendChart({data}: {data: EnvTrendPoint[]}) {
  const W = 320;
  const H = 150;
  const PAD = {top: 12, right: 12, bottom: 28, left: 28};
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const minY = 40;
  const maxY = 100;

  function toX(i: number): number {
    return PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  }
  function toY(v: number): number {
    return PAD.top + innerH - ((v - minY) / (maxY - minY)) * innerH;
  }
  function polyPoints(key: keyof Omit<EnvTrendPoint, 'day'>): string {
    return data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' ');
  }

  const xTicks = [0, 3, 6, 9, 12, 13];
  const yTicks = [50, 70, 90];

  return (
    <View>
      <Svg width={W} height={H}>
        {yTicks.map(v => (
          <G key={v}>
            <Line
              x1={PAD.left}
              y1={toY(v)}
              x2={W - PAD.right}
              y2={toY(v)}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
            <SvgText x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fill={C.textMuted} fontSize={7.5}>
              {v}
            </SvgText>
          </G>
        ))}
        {xTicks.map(i => (
          data[i] ? (
            <SvgText
              key={i}
              x={toX(i)}
              y={H - 6}
              textAnchor="middle"
              fill={C.textMuted}
              fontSize={7.5}>
              {data[i].day}
            </SvgText>
          ) : null
        ))}
        {ENV_PARAMS.map(key => (
          <Polyline
            key={key}
            points={polyPoints(key)}
            fill="none"
            stroke={ENV_LINE_COLORS[key]}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View style={styles.chartLegend}>
        {ENV_PARAMS.map(key => (
          <View key={key} style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, {backgroundColor: ENV_LINE_COLORS[key]}]} />
            <Text style={styles.chartLegendText}>{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Warehouse Performance Table ──────────────────────────────────────────────

function PerformanceBar({value, color}: {value: number; color: string}) {
  return (
    <View style={styles.perfBarBg}>
      <View style={[styles.perfBarFill, {width: `${Math.min(100, value)}%` as any, backgroundColor: color}]} />
      <Text style={styles.perfBarLabel}>{value}%</Text>
    </View>
  );
}

function PerformanceTable({data}: {data: WHPerformancePoint[]}) {
  return (
    <View style={styles.perfTable}>
      {/* Header */}
      <View style={[styles.perfRow, styles.perfHeaderRow]}>
        <Text style={[styles.perfCell, styles.perfWHCell, styles.perfHeaderText]}>WH</Text>
        <Text style={[styles.perfCell, styles.perfMetricCell, styles.perfHeaderText]}>Efficiency</Text>
        <Text style={[styles.perfCell, styles.perfMetricCell, styles.perfHeaderText]}>Stability</Text>
        <Text style={[styles.perfCell, styles.perfMetricCell, styles.perfHeaderText]}>Utilization</Text>
      </View>
      {data.map((row, i) => (
        <View key={row.warehouse} style={[styles.perfRow, i % 2 === 1 && styles.perfRowAlt]}>
          <Text style={[styles.perfCell, styles.perfWHCell, styles.perfWHText]}>{row.warehouse}</Text>
          <View style={[styles.perfCell, styles.perfMetricCell]}>
            <PerformanceBar value={row.Efficiency} color="#3b82f6" />
          </View>
          <View style={[styles.perfCell, styles.perfMetricCell]}>
            <PerformanceBar value={row.Stability} color="#22c55e" />
          </View>
          <View style={[styles.perfCell, styles.perfMetricCell]}>
            <PerformanceBar value={row.Utilization} color="#8b5cf6" />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function useAnalyticsData(): AnalyticsData {
  const {sensorHistory, warehouseReadings} = useLiveData();

  return useMemo(() => {
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function dayLabel(d: Date) { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
    function addDays(d: Date, n: number) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

    const active = warehouseReadings.filter(w => w.temp !== null);
    const avgTemp = active.length ? active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length : 0;
    const avgHum  = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 0;
    const avgCap  = active.length ? Math.round(active.reduce((s, w) => s + (w.usedPct ?? 0), 0) / active.length) : 0;
    const goodPct = warehouseReadings.length > 0 ? (warehouseReadings.filter(w => w.status === 'good').length / warehouseReadings.length) * 100 : 100;
    const spoilRisk = active.length ? +(Math.max(1, Math.min(30, 30 - goodPct / 4)).toFixed(1)) : 0;
    const tempStability = active.length ? Math.max(0, Math.round(100 - Math.max(0, avgTemp - 25) * 5)) : 0;
    const humStability  = active.length ? Math.max(0, Math.round(100 - Math.max(0, avgHum  - 60) * 2.5)) : 0;

    let tempDelta = '+0.0%'; let humDelta = '+0.0%'; let capDelta = '+1.3%';
    if (sensorHistory.length >= 4) {
      const half = Math.floor(sensorHistory.length / 2);
      const recent = sensorHistory.slice(0, half);
      const older  = sensorHistory.slice(half);
      const rTS = Math.round(recent.filter(h => (h.averages.temperature ?? 99) < 29).length / recent.length * 100);
      const oTS = older.length > 0 ? Math.round(older.filter(h => (h.averages.temperature ?? 99) < 29).length / older.length * 100) : rTS;
      const td = rTS - oTS; tempDelta = `${td >= 0 ? '+' : ''}${td.toFixed(1)}%`;
      const rHS = Math.round(recent.filter(h => (h.averages.humidity ?? 99) < 65).length / recent.length * 100);
      const oHS = older.length > 0 ? Math.round(older.filter(h => (h.averages.humidity ?? 99) < 65).length / older.length * 100) : rHS;
      const hd = rHS - oHS; humDelta = `${hd >= 0 ? '+' : ''}${hd.toFixed(1)}%`;
    }

    const totalWH   = warehouseReadings.length || 1;
    const onlineWHs = warehouseReadings.filter(w => w.status !== 'inactive').length;
    const sensorHealth = Math.round(Math.min(onlineWHs / totalWH, 1) * 100);
    const sensorDelta  = sensorHealth === 100 ? '+0.0%' : `-${(100 - sensorHealth).toFixed(1)}%`;

    const kpis: AnalyticsKPI[] = [
      {label: 'Temp Stability',       value: tempStability, unit: '%', delta: tempDelta,  trend: tempDelta.startsWith('-') ? 'down' : 'up',  colorKey: 'amber',  invertedTrend: false},
      {label: 'Humidity Stability',   value: humStability,  unit: '%', delta: humDelta,   trend: humDelta.startsWith('-')  ? 'down' : 'up',  colorKey: 'blue',   invertedTrend: false},
      {label: 'Capacity Utilization', value: avgCap,        unit: '%', delta: capDelta,   trend: 'up',                                       colorKey: 'green',  invertedTrend: false},
      {label: 'Spoilage Risk',        value: spoilRisk,     unit: '%', delta: '-0.8%',    trend: 'down', invertedTrend: true,                colorKey: 'red'},
      {label: 'Sensor Health',        value: sensorHealth,  unit: '%', delta: sensorDelta, trend: sensorHealth === 100 ? 'stable' : 'down',  colorKey: 'teal',   invertedTrend: false},
    ];

    const history30 = sensorHistory.slice(0, 30);
    const today = new Date();
    const envTrendData: EnvTrendPoint[] = history30.slice(-14).length > 0
      ? history30.slice(-14).map(h => ({
          day:         dayLabel(new Date(h.date + 'T00:00:00')),
          Temperature: Math.max(40, Math.round(100 - Math.max(0, (h.averages.temperature ?? 25) - 24) * 5)),
          Humidity:    Math.max(40, Math.round(100 - Math.max(0, (h.averages.humidity ?? 60)    - 55) * 2.5)),
          Moisture:    Math.max(40, Math.round(100 - Math.max(0, (h.averages.moisture ?? 10)    - 10) * 8)),
          CO2:         Math.min(98, Math.max(60, Math.round(88 - Math.max(0, (h.averages.co2 ?? 500) - 500) * 0.1))),
          AQI:         Math.min(98, Math.max(60, Math.round(90 - Math.max(0, (h.averages.aqi ?? 40)  - 40)  * 0.5))),
        }))
      : Array.from({length: 14}, (_, i) => ({day: dayLabel(addDays(today, i - 13)), Temperature: 75, Humidity: 70, Moisture: 72, CO2: 88, AQI: 90}));

    const whPerformanceData: WHPerformancePoint[] = warehouseReadings
      .filter(w => w.temp !== null)
      .map(w => ({
        warehouse:   w.name,
        Efficiency:  Math.max(20, w.status === 'good' ? 90 : w.status === 'medium' ? 65 : 40),
        Stability:   Math.max(20, Math.round(100 - (w.status === 'high' ? 60 : w.status === 'medium' ? 30 : 5))),
        Utilization: Math.round(w.usedPct),
      }))
      .sort((a, b) => a.warehouse.localeCompare(b.warehouse));

    const ranked = whPerformanceData.slice().sort((a, b) => (b.Efficiency + b.Stability) - (a.Efficiency + a.Stability));
    const best  = ranked[0] ?? null;
    const worst = ranked.length > 0 ? ranked[ranked.length - 1] : null;
    const bestWH  = best  ? warehouseReadings.find(w => w.name === best.warehouse)  : null;
    const worstWH = worst ? warehouseReadings.find(w => w.name === worst.warehouse) : null;

    return {
      kpis, envTrendData, whPerformanceData,
      topWarehouse: {
        name:   best?.warehouse ?? '—',
        detail: bestWH ? `${bestWH.temp?.toFixed(1)}°C · ${bestWH.humidity}% RH · ${bestWH.usedPct}% cap` : 'Optimal conditions',
        score:  best?.Efficiency ?? 0,
      },
      worstWarehouse: {
        name:   worst?.warehouse ?? '—',
        detail: worstWH ? `${worstWH.temp?.toFixed(1)}°C · ${worstWH.humidity}% RH · status: ${worstWH.status}` : 'Needs attention',
        score:  worst?.Efficiency ?? 0,
      },
      overallStability: Math.round((tempStability + humStability) / 2),
      sensorSummary: {online: onlineWHs * 5, offline: Math.max(0, totalWH - onlineWHs) * 5, warning: warehouseReadings.filter(w => w.status !== 'good' && w.status !== 'inactive').length, total: Math.max(totalWH, onlineWHs) * 5},
    };
  }, [sensorHistory, warehouseReadings]);
}

export default function AnalyticsScreen() {
  const data = useAnalyticsData();
  const {
    kpis,
    envTrendData,
    whPerformanceData,
    topWarehouse,
    worstWarehouse,
    overallStability,
    sensorSummary,
  } = data;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Environmental performance &amp; insights</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
        <View style={styles.kpiGrid}>
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </View>

        {/* ── Overall Stability + Sensor Summary ────────────────────────────── */}
        <View style={styles.row2}>
          {/* Stability Gauge */}
          <View style={[styles.card, styles.gaugeCard]}>
            <Text style={styles.cardTitle}>Stability</Text>
            <Text style={styles.cardSubtitle}>Overall score</Text>
            <StabilityGauge value={overallStability} />
          </View>

          {/* Sensor Summary */}
          <View style={[styles.card, styles.sensorCard]}>
            <Text style={styles.cardTitle}>Sensors</Text>
            <Text style={styles.cardSubtitle}>Network status</Text>
            <View style={styles.sensorBody}>
              <View style={styles.sensorStatRow}>
                <View style={[styles.sensorDot, {backgroundColor: '#22c55e'}]} />
                <Text style={styles.sensorStatLabel}>Online</Text>
                <Text style={styles.sensorStatVal}>{sensorSummary.online}</Text>
              </View>
              <View style={styles.sensorStatRow}>
                <View style={[styles.sensorDot, {backgroundColor: '#f59e0b'}]} />
                <Text style={styles.sensorStatLabel}>Warning</Text>
                <Text style={styles.sensorStatVal}>{sensorSummary.warning}</Text>
              </View>
              <View style={styles.sensorStatRow}>
                <View style={[styles.sensorDot, {backgroundColor: '#ef4444'}]} />
                <Text style={styles.sensorStatLabel}>Offline</Text>
                <Text style={styles.sensorStatVal}>{sensorSummary.offline}</Text>
              </View>
              <View style={[styles.sensorStatRow, styles.sensorTotalRow]}>
                <WifiIcon color={C.primary} />
                <Text style={[styles.sensorStatLabel, styles.sensorTotalLabel]}>Total</Text>
                <Text style={[styles.sensorStatVal, styles.sensorTotalVal]}>{sensorSummary.total}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Top & Worst Warehouse ─────────────────────────────────────────── */}
        <View style={styles.row2}>
          {/* Top */}
          <View style={[styles.card, styles.halfCard, {borderTopColor: '#22c55e', borderTopWidth: 3}]}>
            <View style={styles.whHighlightHeader}>
              <TrophyIcon color="#15803d" />
              <Text style={styles.whHighlightTitle}>Top Performer</Text>
            </View>
            <Text style={styles.whHighlightName}>{topWarehouse.name}</Text>
            <Text style={styles.whHighlightDetail}>{topWarehouse.detail}</Text>
            <View style={styles.whScoreRow}>
              <Text style={styles.whScoreLabel}>Score</Text>
              <Text style={[styles.whScore, {color: '#15803d'}]}>{topWarehouse.score}%</Text>
            </View>
          </View>

          {/* Worst */}
          <View style={[styles.card, styles.halfCard, {borderTopColor: '#ef4444', borderTopWidth: 3}]}>
            <View style={styles.whHighlightHeader}>
              <AlertIcon color="#dc2626" />
              <Text style={styles.whHighlightTitle}>Needs Attention</Text>
            </View>
            <Text style={styles.whHighlightName}>{worstWarehouse.name}</Text>
            <Text style={styles.whHighlightDetail}>{worstWarehouse.detail}</Text>
            <View style={styles.whScoreRow}>
              <Text style={styles.whScoreLabel}>Risk</Text>
              <Text style={[styles.whScore, {color: '#dc2626'}]}>{worstWarehouse.score}%</Text>
            </View>
          </View>
        </View>

        {/* ── Environmental Trends ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Environmental Trends</Text>
            <Text style={styles.cardSubtitle}>14-day stability scores (%)</Text>
          </View>
          <View style={styles.chartSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <EnvTrendChart data={envTrendData} />
            </ScrollView>
          </View>
        </View>

        {/* ── Warehouse Performance ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Warehouse Performance</Text>
            <Text style={styles.cardSubtitle}>Efficiency · Stability · Utilization</Text>
          </View>
          <View style={styles.perfSection}>
            <PerformanceTable data={whPerformanceData} />
          </View>
        </View>

        {/* ── Recent Events ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Events</Text>
            <Text style={styles.cardSubtitle}>System activity feed</Text>
          </View>
          <View style={styles.eventsList}>
            {RECENT_EVENTS.map((ev, i) => (
              <View
                key={ev.id}
                style={[
                  styles.eventItem,
                  i < RECENT_EVENTS.length - 1 && styles.eventItemBorder,
                ]}>
                <View style={[styles.eventDot, {backgroundColor: ev.dot}]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventLabel}>{ev.label}</Text>
                  <Text style={styles.eventTime}>{ev.time}</Text>
                </View>
                <View style={[styles.eventTag, {backgroundColor: `${ev.color}18`}]}>
                  <Text style={[styles.eventTagText, {color: ev.color}]}>
                    {ev.id === 'e1' ? 'AI' : ev.id === 'e2' ? 'Sync' : ev.id === 'e3' ? 'Resolved' : ev.id === 'e4' ? 'Alert' : 'System'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  bottomSpacer: {
    height: 8,
  },

  // ── KPI Grid ─────────────────────────────────────────────────────────────────
  kpiGrid: {
    marginHorizontal: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '47.5%',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  kpiValueRow: {
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  kpiUnit: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  kpiDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiDelta: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },

  // ── Two-column row ────────────────────────────────────────────────────────────
  row2: {
    marginHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  cardSubtitle: {
    fontSize: 10.5,
    color: C.textMuted,
    marginTop: 2,
  },

  // ── Gauge card ────────────────────────────────────────────────────────────────
  gaugeCard: {
    flex: 1,
    padding: 14,
    marginHorizontal: 0,
    alignItems: 'center',
  },
  gaugeWrap: {
    marginTop: 4,
  },

  // ── Sensor card ───────────────────────────────────────────────────────────────
  sensorCard: {
    flex: 1,
    padding: 14,
    marginHorizontal: 0,
  },
  sensorBody: {
    marginTop: 12,
    gap: 8,
  },
  sensorStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sensorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sensorStatLabel: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },
  sensorStatVal: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  sensorTotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sensorTotalLabel: {
    fontWeight: fontWeight.bold,
  },
  sensorTotalVal: {
    fontSize: 18,
    color: C.primary,
  },

  // ── WH Highlight cards ────────────────────────────────────────────────────────
  halfCard: {
    flex: 1,
    padding: 14,
    marginHorizontal: 0,
  },
  whHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  whHighlightTitle: {
    fontSize: 10.5,
    fontWeight: fontWeight.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whHighlightName: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    marginBottom: 4,
  },
  whHighlightDetail: {
    fontSize: 10,
    color: C.textSecondary,
    lineHeight: 14,
    marginBottom: 10,
  },
  whScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  whScoreLabel: {
    fontSize: 10.5,
    color: C.textMuted,
    fontWeight: fontWeight.semibold,
  },
  whScore: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },

  // ── Chart section ─────────────────────────────────────────────────────────────
  chartSection: {
    padding: 14,
    paddingTop: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontSize: 10.5,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },

  // ── Performance table ─────────────────────────────────────────────────────────
  perfSection: {
    padding: 12,
  },
  perfTable: {
    gap: 0,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  perfRowAlt: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  perfHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
    marginBottom: 2,
  },
  perfCell: {
    paddingHorizontal: 4,
  },
  perfWHCell: {
    width: 50,
  },
  perfMetricCell: {
    flex: 1,
  },
  perfHeaderText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perfWHText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  perfBarBg: {
    height: 18,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    opacity: 0.85,
  },
  perfBarLabel: {
    position: 'absolute',
    right: 5,
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },

  // ── Events feed ───────────────────────────────────────────────────────────────
  eventsList: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  eventItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventLabel: {
    fontSize: 12,
    color: C.textPrimary,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
  },
  eventTime: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  eventTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  eventTagText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
  },
});
