import React, {useMemo} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {G, Line, Path, Polyline, Rect, Text as SvgText} from 'react-native-svg';

import {
  type ParamForecastCard,
  type RiskLevel,
  type TrendDir,
  type WHPredRow,
} from '../../lib/dataEngine';
import {useLiveData} from '../../contexts/LiveDataContext';
import {fontWeight} from '../../theme/tokens';

// ─── Predictions computed from live Firestore data ────────────────────────────

function useFirestorePredictions() {
  const {warehouseReadings} = useLiveData();

  return useMemo(() => {
    const active = warehouseReadings.filter(w => w.temp !== null);
    const avgTemp  = active.length ? active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length : 27;
    const avgHum   = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 62;
    const avgMoist = active.length ? +(active.reduce((s, w) => s + (w.moisture ?? 0), 0) / active.length).toFixed(1) : 11.5;
    const avgCO2   = active.length ? Math.round(active.reduce((s, w) => s + (w.co2 ?? 520), 0) / active.length) : 510;
    const avgAQI   = active.length ? Math.round(active.reduce((s, w) => s + (w.aqi ?? 40), 0) / active.length) : 40;
    const avgCap   = active.length ? Math.round(active.reduce((s, w) => s + w.usedPct, 0) / active.length) : 68;

    function mkSpark(base: number, step: number, count = 7): number[] {
      const arr = [+base.toFixed(2)];
      for (let i = 1; i < count; i++) arr.push(+(arr[arr.length - 1] + step).toFixed(2));
      return arr;
    }

    const paramCards: ParamForecastCard[] = [
      {key: 'temp',     label: 'Temperature',     unit: '°C',  current: +avgTemp.toFixed(1), forecast: +(avgTemp + 1.2).toFixed(1), rangeMin: +(avgTemp - 1).toFixed(1), rangeMax: +(avgTemp + 3).toFixed(1), trend: 'up',        confidence: 88, sparkData: mkSpark(avgTemp - 1, 0.3),    colorKey: 'amber'  },
      {key: 'humidity', label: 'Humidity',         unit: '%',   current: avgHum,  forecast: avgHum + 3,  rangeMin: avgHum - 3,  rangeMax: avgHum + 7,  trend: 'slight-up', confidence: 85, sparkData: mkSpark(avgHum - 2, 0.5),     colorKey: 'blue'   },
      {key: 'moisture', label: 'Moisture Content', unit: '%',   current: avgMoist, forecast: +(avgMoist + 0.6).toFixed(1), rangeMin: +(avgMoist - 0.5).toFixed(1), rangeMax: +(avgMoist + 1.5).toFixed(1), trend: 'slight-up', confidence: 82, sparkData: mkSpark(avgMoist - 0.3, 0.08), colorKey: 'green'  },
      {key: 'co2',      label: 'CO₂ Level',        unit: 'ppm', current: avgCO2, forecast: avgCO2 + 12,  rangeMin: avgCO2 - 15, rangeMax: avgCO2 + 25, trend: 'up',        confidence: 79, sparkData: mkSpark(avgCO2 - 5, 2),       colorKey: 'purple' },
      {key: 'aqi',      label: 'Air Quality',      unit: 'AQI', current: avgAQI, forecast: avgAQI + 2,   rangeMin: avgAQI - 5,  rangeMax: avgAQI + 8,  trend: 'stable',    confidence: 90, sparkData: mkSpark(avgAQI - 1, 0.3),     colorKey: 'teal'   },
      {key: 'capacity', label: 'Storage Capacity', unit: '%',   current: avgCap, forecast: Math.min(95, avgCap + 2), rangeMin: avgCap - 2, rangeMax: avgCap + 5, trend: 'up', confidence: 92, sparkData: mkSpark(avgCap - 1, 0.2), colorKey: 'indigo' },
    ];

    const today = new Date();
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function dayLabel(d: Date) { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
    function addDays(d: Date, n: number) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

    const forecastData = Array.from({length: 7}, (_, i) => {
      const d = addDays(today, i + 1);
      const row: Record<string, unknown> = {day: dayLabel(d)};
      for (const wh of active) {
        row[wh.id] = Math.round(((wh.temp ?? 25) + i * 0.2) / 35 * 100);
      }
      return row;
    });

    const whPredTable: WHPredRow[] = active.map(wh => {
      const stressScore = wh.status === 'high' ? 3 : wh.status === 'medium' ? 1.5 : 0;
      const spoilage30d = Math.min(95, Math.max(5, Math.round(stressScore * 20 + 5)));
      return {
        id: wh.id, name: wh.name, overallRisk: wh.risk as RiskLevel,
        spoilage30d,
        tempForecast:  +((wh.temp ?? 25) + 0.8).toFixed(1),
        humForecast:   Math.round((wh.humidity ?? 60) + 1.5),
        moistForecast: +((wh.moisture ?? 11) + 0.4).toFixed(1),
        co2Forecast:   Math.round((wh.co2 ?? 520) + 12),
        aqiForecast:   Math.round((wh.aqi ?? 40) + 2),
        capForecast:   Math.min(99, Math.round(wh.usedPct + 1.5)),
        trend:         (wh.status === 'high' ? 'up' : wh.status === 'medium' ? 'slight-up' : 'stable') as TrendDir,
        confidence:    wh.status === 'good' ? 91 : 82,
      };
    });

    const riskForecastData = Array.from({length: 7}, (_, i) => ({
      day:    dayLabel(addDays(today, i + 1)),
      Low:    warehouseReadings.filter(w => w.risk === 'low').length,
      Medium: warehouseReadings.filter(w => w.risk === 'medium').length,
      High:   warehouseReadings.filter(w => w.risk === 'high').length,
    }));

    return {paramCards, forecastData, whPredTable, riskForecastData};
  }, [warehouseReadings]);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  primary: '#1f5135',
  bg: '#f6f8f3',
  white: '#ffffff',
  textPrimary: '#172118',
  textSecondary: '#5e6b5f',
  textMuted: '#8e9b8f',
  border: '#e5e7eb',
};

const COLOR_MAP: Record<ParamForecastCard['colorKey'], string> = {
  amber:  '#f59e0b',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#8b5cf6',
  teal:   '#14b8a6',
  indigo: '#6366f1',
};

// ─── Trend helpers ────────────────────────────────────────────────────────────

function trendLabel(t: TrendDir): string {
  switch (t) {
    case 'up':        return '↑ Rising';
    case 'slight-up': return '↗ Slight Rise';
    case 'down':      return '↓ Declining';
    default:          return '→ Stable';
  }
}

function trendBg(t: TrendDir): string {
  switch (t) {
    case 'up':        return '#fee2e2';
    case 'slight-up': return '#fef3c7';
    case 'down':      return '#dcfce7';
    default:          return '#f3f4f6';
  }
}

function trendColor(t: TrendDir): string {
  switch (t) {
    case 'up':        return '#dc2626';
    case 'slight-up': return '#d97706';
    case 'down':      return '#16a34a';
    default:          return '#6b7280';
  }
}

// ─── Risk helpers ──────────────────────────────────────────────────────────────

function riskLabel(r: RiskLevel): string {
  switch (r) {
    case 'high':     return 'High';
    case 'medium':   return 'Medium';
    case 'low':      return 'Low';
    default:         return 'Inactive';
  }
}

function riskBg(r: RiskLevel): string {
  switch (r) {
    case 'high':   return '#fee2e2';
    case 'medium': return '#fef3c7';
    case 'low':    return '#dcfce7';
    default:       return '#f3f4f6';
  }
}

function riskTextColor(r: RiskLevel): string {
  switch (r) {
    case 'high':   return '#dc2626';
    case 'medium': return '#d97706';
    case 'low':    return '#16a34a';
    default:       return '#9ca3af';
  }
}

function spoilageBarColor(pct: number): string {
  if (pct > 50) return '#ef4444';
  if (pct >= 20) return '#f59e0b';
  return '#22c55e';
}

// ─── Spark line ───────────────────────────────────────────────────────────────

function SparkLine({data, color}: {data: number[]; color: string}) {
  const W = 80;
  const H = 28;
  const pad = 2;

  if (!data || data.length < 2) return null;

  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const xStep = (W - pad * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = pad + i * xStep;
      const y = H - pad - ((v - minV) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={W} height={H}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Parameter Forecast Card ──────────────────────────────────────────────────

function ParamCard({card}: {card: ParamForecastCard}) {
  const accentColor = COLOR_MAP[card.colorKey];

  return (
    <View style={styles.paramCard}>
      <View style={[styles.paramCardAccent, {backgroundColor: accentColor}]} />
      <View style={styles.paramCardInner}>
        {/* Header row */}
        <View style={styles.paramCardHeader}>
          <Text style={styles.paramCardLabel}>{card.label}</Text>
          <View style={[styles.trendBadge, {backgroundColor: trendBg(card.trend)}]}>
            <Text style={[styles.trendBadgeText, {color: trendColor(card.trend)}]}>
              {trendLabel(card.trend)}
            </Text>
          </View>
        </View>

        {/* Values row */}
        <View style={styles.paramValuesRow}>
          <View>
            <Text style={styles.paramValueLabel}>Current</Text>
            <Text style={[styles.paramValueLarge, {color: accentColor}]}>
              {card.current}
              <Text style={styles.paramUnit}> {card.unit}</Text>
            </Text>
          </View>
          <View style={styles.paramArrow}>
            <Text style={styles.paramArrowText}>→</Text>
          </View>
          <View style={styles.paramForecastWrap}>
            <Text style={styles.paramValueLabel}>7-day Forecast</Text>
            <Text style={styles.paramForecastValue}>
              {card.forecast}
              <Text style={styles.paramUnit}> {card.unit}</Text>
            </Text>
          </View>
        </View>

        {/* Spark + Confidence */}
        <View style={styles.paramSparkRow}>
          <SparkLine data={card.sparkData} color={accentColor} />
          <View style={styles.paramConfidenceWrap}>
            <Text style={styles.paramConfidenceLabel}>Confidence</Text>
            <Text style={[styles.paramConfidenceValue, {color: accentColor}]}>
              {card.confidence}%
            </Text>
          </View>
        </View>

        {/* Range */}
        <View style={[styles.paramRangeBar, {backgroundColor: accentColor + '18'}]}>
          <Text style={styles.paramRangeText}>
            Range: {card.rangeMin} – {card.rangeMax} {card.unit}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Stacked Risk Bar Chart ───────────────────────────────────────────────────

function RiskForecastChart({
  data,
}: {
  data: {day: string; Low: number; Medium: number; High: number}[];
}) {
  const W = 320;
  const H = 140;
  const padL = 20;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.floor(chartW / data.length) - 6;
  const maxVal = Math.max(...data.map(d => d.Low + d.Medium + d.High), 1);

  return (
    <View style={styles.svgWrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {data.map((d, i) => {
          const total = d.Low + d.Medium + d.High;
          const x = padL + i * (chartW / data.length) + (chartW / data.length - barW) / 2;

          const lowH  = (d.Low / maxVal) * chartH;
          const medH  = (d.Medium / maxVal) * chartH;
          const highH = (d.High / maxVal) * chartH;

          const lowY  = padT + chartH - lowH;
          const medY  = lowY - medH;
          const highY = medY - highH;

          return (
            <G key={d.day}>
              {/* Low (green) */}
              {lowH > 0 && (
                <Rect x={x} y={lowY} width={barW} height={lowH} fill="#22c55e" rx={2} />
              )}
              {/* Medium (amber) */}
              {medH > 0 && (
                <Rect x={x} y={medY} width={barW} height={medH} fill="#f59e0b" rx={2} />
              )}
              {/* High (red) */}
              {highH > 0 && (
                <Rect x={x} y={highY} width={barW} height={highH} fill="#ef4444" rx={2} />
              )}
              {/* Day label */}
              <SvgText
                x={x + barW / 2}
                y={H - 6}
                fontSize={9}
                textAnchor="middle"
                fill={C.textMuted}>
                {d.day}
              </SvgText>
              {/* Total label */}
              {total > 0 && (
                <SvgText
                  x={x + barW / 2}
                  y={Math.min(highY, medY, lowY) - 3}
                  fontSize={8}
                  textAnchor="middle"
                  fill={C.textSecondary}>
                  {total}
                </SvgText>
              )}
            </G>
          );
        })}
        {/* Baseline */}
        <Line
          x1={padL}
          y1={padT + chartH}
          x2={W - padR}
          y2={padT + chartH}
          stroke={C.border}
          strokeWidth={1}
        />
      </Svg>

      {/* Legend */}
      <View style={styles.chartLegend}>
        {[
          {label: 'Low', color: '#22c55e'},
          {label: 'Medium', color: '#f59e0b'},
          {label: 'High', color: '#ef4444'},
        ].map(l => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: l.color}]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Warehouse Prediction Table ───────────────────────────────────────────────

function WHPredTableRow({row, isLast}: {row: WHPredRow; isLast: boolean}) {
  const rBg   = riskBg(row.overallRisk);
  const rText = riskTextColor(row.overallRisk);
  const barColor = spoilageBarColor(row.spoilage30d);

  return (
    <View style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
      {/* WH name */}
      <View style={styles.tableColWH}>
        <Text style={styles.tableWHName}>{row.id}</Text>
        <Text style={styles.tableWHSub} numberOfLines={1}>{row.name}</Text>
      </View>

      {/* Risk badge */}
      <View style={styles.tableColRisk}>
        <View style={[styles.riskBadge, {backgroundColor: rBg}]}>
          <Text style={[styles.riskBadgeText, {color: rText}]}>{riskLabel(row.overallRisk)}</Text>
        </View>
      </View>

      {/* Spoilage bar */}
      <View style={styles.tableColSpoilage}>
        <Text style={styles.tableSpoilagePct}>{row.spoilage30d}%</Text>
        <View style={styles.spoilageBarTrack}>
          <View
            style={[
              styles.spoilageBarFill,
              {width: `${row.spoilage30d}%` as any, backgroundColor: barColor},
            ]}
          />
        </View>
      </View>

      {/* Temp */}
      <View style={styles.tableColData}>
        <Text style={styles.tableDataVal}>{row.tempForecast}°</Text>
      </View>

      {/* Humidity */}
      <View style={styles.tableColData}>
        <Text style={styles.tableDataVal}>{row.humForecast}%</Text>
      </View>

      {/* Confidence */}
      <View style={styles.tableColConf}>
        <Text style={[styles.tableConfVal, {color: row.confidence >= 85 ? '#16a34a' : '#d97706'}]}>
          {row.confidence}%
        </Text>
      </View>

      {/* Trend */}
      <View style={styles.tableColTrend}>
        <View style={[styles.trendBadgeSm, {backgroundColor: trendBg(row.trend)}]}>
          <Text style={[styles.trendBadgeSmText, {color: trendColor(row.trend)}]}>
            {trendLabel(row.trend)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WHPredictionTable({rows}: {rows: WHPredRow[]}) {
  return (
    <View style={styles.tableWrap}>
      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={styles.tableColWH}>
          <Text style={styles.tableHeaderText}>WH</Text>
        </View>
        <View style={styles.tableColRisk}>
          <Text style={styles.tableHeaderText}>Risk</Text>
        </View>
        <View style={styles.tableColSpoilage}>
          <Text style={styles.tableHeaderText}>30d Spoilage</Text>
        </View>
        <View style={styles.tableColData}>
          <Text style={styles.tableHeaderText}>Temp</Text>
        </View>
        <View style={styles.tableColData}>
          <Text style={styles.tableHeaderText}>Hum</Text>
        </View>
        <View style={styles.tableColConf}>
          <Text style={styles.tableHeaderText}>Conf</Text>
        </View>
        <View style={styles.tableColTrend}>
          <Text style={styles.tableHeaderText}>Trend</Text>
        </View>
      </View>

      {/* Rows */}
      {rows.map((row, i) => (
        <WHPredTableRow key={row.id} row={row} isLast={i === rows.length - 1} />
      ))}
    </View>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BrainIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.5 2C7 2 5 4 5 6.5c0 .6.1 1.1.3 1.6C3.9 8.7 3 10.2 3 12c0 2.8 2.2 5 5 5h1v3h6v-3h1c2.8 0 5-2.2 5-5 0-1.8-.9-3.3-2.3-4.1C18.9 7.6 19 7 19 6.5 19 4 17 2 14.5 2c-1 0-1.9.3-2.5.9C11.4 2.3 10.5 2 9.5 2z"
        stroke={C.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PredictionsScreen() {
  const data = useFirestorePredictions();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <BrainIcon />
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Predictions</Text>
          <Text style={styles.headerSubtitle}>7-day forecasts powered by environmental AI</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Section: Parameter Forecasts ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parameter Forecasts</Text>
          <Text style={styles.sectionSubtitle}>Predicted values for key environmental parameters</Text>
        </View>

        <View style={styles.paramGrid}>
          {data.paramCards.map(card => (
            <View key={card.key} style={styles.paramCardWrap}>
              <ParamCard card={card} />
            </View>
          ))}
        </View>

        {/* ── Section: Risk Forecast ────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Risk Forecast</Text>
            <Text style={styles.cardSubtitle}>Warehouse risk distribution — next 7 days</Text>
          </View>
          <View style={styles.cardBody}>
            <RiskForecastChart data={data.riskForecastData} />
          </View>
        </View>

        {/* ── Section: Warehouse Predictions Table ──────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Warehouse Predictions</Text>
            <Text style={styles.cardSubtitle}>7-day parameter forecasts per warehouse</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <WHPredictionTable rows={data.whPredTable} />
          </ScrollView>
        </View>

        {/* ── AI Accuracy Note ──────────────────────────────────────────────── */}
        <View style={styles.noteBox}>
          <View style={styles.noteDot} />
          <Text style={styles.noteText}>
            Forecasts are generated by AI models trained on historical sensor data. Accuracy: ~85–93%.
          </Text>
        </View>

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

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e8f0eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: {flex: 1},
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {marginBottom: 2},
  sectionTitle: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: C.textMuted,
    marginTop: 2,
  },

  // ── Param grid ─────────────────────────────────────────────────────────────
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paramCardWrap: {
    width: '48%',
  },

  // ── Param card ─────────────────────────────────────────────────────────────
  paramCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 5,
    elevation: 2,
  },
  paramCardAccent: {
    height: 3,
    width: '100%',
  },
  paramCardInner: {
    padding: 12,
    gap: 8,
  },
  paramCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  paramCardLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: C.textSecondary,
    flex: 1,
  },
  trendBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  trendBadgeText: {
    fontSize: 8.5,
    fontWeight: fontWeight.bold,
    lineHeight: 11,
  },

  // Values row
  paramValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paramValueLabel: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  paramValueLarge: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  paramUnit: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  paramArrow: {
    flex: 1,
    alignItems: 'center',
  },
  paramArrowText: {
    fontSize: 14,
    color: C.textMuted,
  },
  paramForecastWrap: {
    alignItems: 'flex-end',
  },
  paramForecastValue: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  // Spark row
  paramSparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paramConfidenceWrap: {
    alignItems: 'flex-end',
  },
  paramConfidenceLabel: {
    fontSize: 8.5,
    color: C.textMuted,
    marginBottom: 1,
  },
  paramConfidenceValue: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },

  // Range
  paramRangeBar: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paramRangeText: {
    fontSize: 9.5,
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
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
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  cardBody: {
    padding: 12,
  },

  // ── SVG chart wrapper ──────────────────────────────────────────────────────
  svgWrap: {
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },

  // ── Table ──────────────────────────────────────────────────────────────────
  tableWrap: {
    minWidth: 600,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  // Column widths
  tableColWH:       {width: 72},
  tableColRisk:     {width: 74},
  tableColSpoilage: {width: 96},
  tableColData:     {width: 50},
  tableColConf:     {width: 46},
  tableColTrend:    {width: 88},

  tableWHName: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  tableWHSub: {
    fontSize: 9.5,
    color: C.textMuted,
    marginTop: 1,
  },

  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  riskBadgeText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    lineHeight: 12,
  },

  tableSpoilagePct: {
    fontSize: 10.5,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    marginBottom: 3,
    fontVariant: ['tabular-nums'],
  },
  spoilageBarTrack: {
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    width: 80,
    overflow: 'hidden',
  },
  spoilageBarFill: {
    height: 5,
    borderRadius: 999,
  },

  tableDataVal: {
    fontSize: 11.5,
    fontWeight: fontWeight.semibold,
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tableConfVal: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },

  trendBadgeSm: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  trendBadgeSmText: {
    fontSize: 8.5,
    fontWeight: fontWeight.bold,
    lineHeight: 11,
  },

  // ── Note box ───────────────────────────────────────────────────────────────
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginBottom: 8,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginTop: 4,
    flexShrink: 0,
  },
  noteText: {
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 17,
    flex: 1,
  },
});
