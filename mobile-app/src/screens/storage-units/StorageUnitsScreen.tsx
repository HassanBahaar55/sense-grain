import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

import {type StorageData, type StabilityPoint} from '../../lib/dataEngine';
import {fontWeight} from '../../theme/tokens';
import {useLiveData} from '../../contexts/LiveDataContext';
import type {WarehouseReading, WHStatus} from '../../lib/accountDb';

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  WHStatus,
  {bar: string; badge: string; badgeBg: string; label: string; tileBg: string}
> = {
  good: {bar: '#22c55e', badge: '#15803d', badgeBg: '#f0fdf4', label: 'Good', tileBg: '#ffffff'},
  medium: {bar: '#f59e0b', badge: '#b45309', badgeBg: '#fffbeb', label: 'Warning', tileBg: '#fffdf5'},
  high: {bar: '#ef4444', badge: '#dc2626', badgeBg: '#fef2f2', label: 'Critical', tileBg: '#fff8f8'},
  inactive: {bar: '#9ca3af', badge: '#6b7280', badgeBg: '#f3f4f6', label: 'Offline', tileBg: '#fafafa'},
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function BuildingIcon({color, size = 18}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 9h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9 21V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x="5" y="12" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="5" y="16" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="11" y="12" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="11" y="16" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="16" y="12" width="3" height="9" rx="0.5" fill={color} />
    </Svg>
  );
}

function DatabaseIcon({color, size = 18}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 4.02 2 6.5S6.48 11 12 11s10-2.02 10-4.5S17.52 2 12 2z" stroke={color} strokeWidth={2} />
      <Path d="M2 6.5v5C2 13.98 6.48 16 12 16s10-2.02 10-4.5v-5" stroke={color} strokeWidth={2} />
      <Path d="M2 11.5v5C2 18.98 6.48 21 12 21s10-2.02 10-4.5v-5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ThermometerIcon({color, size = 18}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldAlertIcon({color, size = 18}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="15" r="0.8" fill={color} stroke={color} strokeWidth={0.5} />
    </Svg>
  );
}

function ChevronDownIcon({color}: {color: string}) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Polyline points="6 9 12 15 18 9" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronUpIcon({color}: {color: string}) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Polyline points="18 15 12 9 6 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AlertTriangleIcon({color, size = 14}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.8" fill={color} stroke={color} strokeWidth={0.5} />
    </Svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricScrollCard({
  label,
  value,
  sub,
  icon,
  accentColor,
  iconBg,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, {backgroundColor: accentColor}]} />
      <View style={styles.metricInner}>
        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={[styles.metricValue, valueColor ? {color: valueColor} : undefined]}>
              {value}
            </Text>
          </View>
          <View style={[styles.metricIconBox, {backgroundColor: iconBg}]}>{icon}</View>
        </View>
        <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── Capacity Bar ─────────────────────────────────────────────────────────────

function CapacityBar({pct, color}: {pct: number; color: string}) {
  return (
    <View style={styles.capBarBg}>
      <View style={[styles.capBarFill, {width: `${Math.min(100, pct)}%` as any, backgroundColor: color}]} />
    </View>
  );
}

// ─── Warehouse Row ────────────────────────────────────────────────────────────

function WarehouseRow({wh}: {wh: WarehouseReading}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[wh.status];

  return (
    <View style={[styles.whRow, {backgroundColor: cfg.tileBg}]}>
      {/* Left bar */}
      <View style={[styles.whLeftBar, {backgroundColor: cfg.bar}]} />

      {/* Content */}
      <View style={styles.whContent}>
        {/* Header row */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpanded(e => !e)}
          style={styles.whHeader}>
          <View style={styles.whHeaderLeft}>
            <Text style={styles.whId}>{wh.id}</Text>
            <Text style={styles.whName}>{wh.name}</Text>
          </View>
          <View style={styles.whHeaderRight}>
            <View style={[styles.statusBadge, {backgroundColor: cfg.badgeBg}]}>
              <Text style={[styles.statusBadgeText, {color: cfg.badge}]}>{cfg.label}</Text>
            </View>
            {wh.status !== 'inactive'
              ? expanded ? <ChevronUpIcon color={C.textMuted} /> : <ChevronDownIcon color={C.textMuted} />
              : null}
          </View>
        </TouchableOpacity>

        {/* Sensor row (always shown for active) */}
        {wh.temp !== null && (
          <View style={styles.sensorRow}>
            <View style={styles.sensorChip}>
              <Text style={styles.sensorKey}>Temp</Text>
              <Text style={[styles.sensorVal, wh.temp >= 30 ? styles.sensorRed : wh.temp >= 28 ? styles.sensorAmber : styles.sensorGreen]}>
                {wh.temp}°C
              </Text>
            </View>
            <View style={styles.sensorChip}>
              <Text style={styles.sensorKey}>Humidity</Text>
              <Text style={[styles.sensorVal, (wh.humidity ?? 0) >= 70 ? styles.sensorRed : (wh.humidity ?? 0) >= 62 ? styles.sensorAmber : styles.sensorGreen]}>
                {wh.humidity}%
              </Text>
            </View>
            <View style={styles.sensorChip}>
              <Text style={styles.sensorKey}>Moisture</Text>
              <Text style={[styles.sensorVal, (wh.moisture ?? 0) >= 14 ? styles.sensorRed : (wh.moisture ?? 0) >= 12.5 ? styles.sensorAmber : styles.sensorGreen]}>
                {wh.moisture}%
              </Text>
            </View>
          </View>
        )}

        {/* Inactive placeholder */}
        {wh.temp === null && (
          <View style={styles.offlineRow}>
            <Text style={styles.offlineText}>No sensor data — unit offline</Text>
          </View>
        )}

        {/* Capacity bar */}
        <View style={styles.capSection}>
          <View style={styles.capLabelRow}>
            <Text style={styles.capLabel}>Capacity</Text>
            <Text style={styles.capPct}>{wh.usedPct}%</Text>
          </View>
          <CapacityBar pct={wh.usedPct} color={wh.usedPct >= 85 ? '#ef4444' : wh.usedPct >= 70 ? '#f59e0b' : C.primary} />
          <Text style={styles.capSub}>{wh.used.toLocaleString()} / {wh.capacity.toLocaleString()} MT</Text>
        </View>

        {/* Expanded detail panel */}
        {expanded && wh.temp !== null && (
          <View style={styles.expandPanel}>
            <View style={styles.expandRow}>
              <View style={styles.expandCell}>
                <Text style={styles.expandKey}>CO₂</Text>
                <Text style={styles.expandVal}>{wh.co2} ppm</Text>
              </View>
              <View style={styles.expandCell}>
                <Text style={styles.expandKey}>AQI</Text>
                <Text style={styles.expandVal}>{wh.aqi}</Text>
              </View>
              <View style={styles.expandCell}>
                <Text style={styles.expandKey}>Trend</Text>
                <Text style={styles.expandVal}>
                  {wh.trend === 'up' ? '↑ Rising' : wh.trend === 'down' ? '↓ Falling' : wh.trend === 'slight-up' ? '↗ Slight' : '→ Stable'}
                </Text>
              </View>
            </View>
            <View style={styles.expandFooter}>
              <Text style={styles.expandFooterText}>
                Last updated: {wh.lastUpdate ?? '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Last update (collapsed) */}
        {!expanded && wh.lastUpdate && (
          <Text style={styles.lastUpdate}>Updated {wh.lastUpdate}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({data}: {data: StorageData['zoneSummary']}) {
  const SIZE = 120;
  const R = 42;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const TWO_PI = Math.PI * 2;
  const STROKE = 16;

  let cumulative = 0;
  const slices = data
    .filter(d => d.count > 0)
    .map(d => {
      const start = cumulative;
      cumulative += d.pct / 100;
      return {...d, start, end: cumulative};
    });

  function describeArc(start: number, end: number): string {
    const s = start * TWO_PI - Math.PI / 2;
    const e = end * TWO_PI - Math.PI / 2;
    const x1 = CX + R * Math.cos(s);
    const y1 = CY + R * Math.sin(s);
    const x2 = CX + R * Math.cos(e);
    const y2 = CY + R * Math.sin(e);
    const large = end - start > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <View style={styles.donutWrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background ring */}
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
        {slices.map((slice, i) => (
          <Path
            key={i}
            d={describeArc(slice.start, slice.end)}
            fill="none"
            stroke={slice.color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
          />
        ))}
        <SvgText
          x={CX}
          y={CY - 7}
          textAnchor="middle"
          fill={C.textPrimary}
          fontSize={20}
          fontWeight="700">
          {total}
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          fill={C.textMuted}
          fontSize={9}>
          units
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.donutLegend}>
        {data.map(d => (
          <View key={d.label} style={styles.donutLegendItem}>
            <View style={[styles.donutDot, {backgroundColor: d.color}]} />
            <Text style={styles.donutLegendLabel}>{d.label}</Text>
            <Text style={styles.donutLegendCount}>{d.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Stability Line Chart ──────────────────────────────────────────────────────

const LINE_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899'];

function StabilityChart({data}: {data: StorageData['stabilityData']}) {
  const W = 300;
  const H = 120;
  const PAD = {top: 10, right: 10, bottom: 24, left: 28};
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minY = 40;
  const maxY = 100;

  const whKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'day') : [];
  const whLines = whKeys.map((key, i) => ({key, color: LINE_COLORS[i % LINE_COLORS.length]}));

  function toX(i: number): number {
    return PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  }
  function toY(v: number): number {
    return PAD.top + innerH - ((v - minY) / (maxY - minY)) * innerH;
  }
  function points(key: string): string {
    return data.map((d, i) => `${toX(i)},${toY(typeof d[key] === 'number' ? (d[key] as number) : 75)}`).join(' ');
  }

  const yTicks = [50, 70, 90];

  return (
    <View>
      <Svg width={W} height={H}>
        {/* Grid lines */}
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
            <SvgText x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fill={C.textMuted} fontSize={8}>
              {v}
            </SvgText>
          </G>
        ))}
        {/* X axis labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={H - 4}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize={8}>
            {d.day}
          </SvgText>
        ))}
        {/* Lines */}
        {whLines.map(({key, color}) => (
          <Polyline
            key={key}
            points={points(key)}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* Dots */}
        {whLines.map(({key, color}) =>
          data.map((d, i) => (
            <Circle
              key={`${key}-${i}`}
              cx={toX(i)}
              cy={toY(typeof d[key] === 'number' ? (d[key] as number) : 75)}
              r={2.5}
              fill="#fff"
              stroke={color}
              strokeWidth={1.5}
            />
          ))
        )}
      </Svg>
      {/* Legend */}
      <View style={styles.chartLegend}>
        {whLines.map(({key, color}) => (
          <View key={key} style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, {backgroundColor: color}]} />
            <Text style={styles.chartLegendText}>{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StorageUnitsScreen() {
  const {warehouseReadings, zones, sensorHistory} = useLiveData();
  const warehouses: WarehouseReading[] = warehouseReadings;

  const totals = useMemo(() => {
    const active   = warehouses.filter(w => w.status !== 'inactive');
    const withTemp = warehouses.filter(w => w.temp !== null);
    const withHum  = warehouses.filter(w => w.humidity !== null);
    const totalCapacity = warehouses.reduce((s, w) => s + w.capacity, 0);
    const totalUsed     = warehouses.reduce((s, w) => s + w.used, 0);
    return {
      totalWarehouses: warehouses.length,
      totalZones:      zones.length,
      totalCapacity,
      totalUsed,
      usedPct:     totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0,
      avgTemp:     withTemp.length > 0 ? Math.round(withTemp.reduce((s, w) => s + (w.temp ?? 0), 0) / withTemp.length * 10) / 10 : 0,
      avgHumidity: withHum.length > 0  ? Math.round(withHum.reduce((s, w)  => s + (w.humidity ?? 0), 0) / withHum.length) : 0,
      activeCount:   active.length,
      highRiskUnits: warehouses.filter(w => w.status === 'high').length,
    };
  }, [warehouses, zones]);

  const zoneSummary = useMemo(() => {
    const total = warehouses.length || 1;
    const counts = {good: warehouses.filter(w => w.status === 'good').length, medium: warehouses.filter(w => w.status === 'medium').length, high: warehouses.filter(w => w.status === 'high').length, inactive: warehouses.filter(w => w.status === 'inactive').length};
    return [
      {label: 'Good',     color: '#22c55e', count: counts.good,     pct: Math.round(counts.good / total * 100)},
      {label: 'Medium',   color: '#f59e0b', count: counts.medium,   pct: Math.round(counts.medium / total * 100)},
      {label: 'High',     color: '#ef4444', count: counts.high,     pct: Math.round(counts.high / total * 100)},
      {label: 'Inactive', color: '#9ca3af', count: counts.inactive, pct: Math.round(counts.inactive / total * 100)},
    ];
  }, [warehouses]);

  const stabilityData = useMemo(() => {
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function dayLabel(d: Date) { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
    function addDays(d: Date, n: number) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
    const whIds = warehouses.filter(w => w.status !== 'inactive').map(w => w.id);
    const today = new Date();
    if (sensorHistory.length > 0) {
      return sensorHistory.slice(0, 7).reverse().map(h => {
        const pt: StabilityPoint = {day: dayLabel(new Date(h.date + 'T00:00:00'))};
        for (const id of whIds) pt[id] = h.warehouseStatus ? Math.round((h.warehouseStatus.good / Math.max(1, h.warehouseStatus.good + h.warehouseStatus.warning + h.warehouseStatus.critical)) * 100) : 75;
        return pt;
      });
    }
    return Array.from({length: 7}, (_, i) => {
      const pt: StabilityPoint = {day: dayLabel(addDays(today, i - 6))};
      for (const id of whIds) pt[id] = 75;
      return pt;
    });
  }, [warehouses, sensorHistory]);

  const topCritical = warehouses.filter(w => w.status === 'high' || w.status === 'medium').slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Storage Units</Text>
        <Text style={styles.headerSubtitle}>Manage and monitor all storage units</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Metric Cards ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsRow}>
          <MetricScrollCard
            label="Total Warehouses"
            value={String(totals.totalWarehouses)}
            sub={`${totals.activeCount} active · ${totals.totalZones} zones`}
            icon={<BuildingIcon color="#2563eb" />}
            accentColor="#3b82f6"
            iconBg="#eff6ff"
          />
          <MetricScrollCard
            label="Total Capacity"
            value={`${(totals.totalCapacity / 1000).toFixed(1)}k MT`}
            sub={`${totals.usedPct}% utilised · ${(totals.totalUsed / 1000).toFixed(1)}k used`}
            icon={<DatabaseIcon color="#7c3aed" />}
            accentColor="#8b5cf6"
            iconBg="#f5f3ff"
            valueColor="#7c3aed"
          />
          <MetricScrollCard
            label="Avg Temperature"
            value={`${totals.avgTemp}°C`}
            sub={`Avg humidity ${totals.avgHumidity}%`}
            icon={<ThermometerIcon color="#d97706" />}
            accentColor="#f59e0b"
            iconBg="#fffbeb"
            valueColor={totals.avgTemp >= 30 ? '#dc2626' : totals.avgTemp >= 28 ? '#d97706' : '#15803d'}
          />
          <MetricScrollCard
            label="High Risk Units"
            value={String(totals.highRiskUnits)}
            sub={totals.highRiskUnits > 0 ? 'Immediate attention needed' : 'All units within safe range'}
            icon={<ShieldAlertIcon color={totals.highRiskUnits > 0 ? '#dc2626' : '#15803d'} />}
            accentColor={totals.highRiskUnits > 0 ? '#ef4444' : '#22c55e'}
            iconBg={totals.highRiskUnits > 0 ? '#fef2f2' : '#f0fdf4'}
            valueColor={totals.highRiskUnits > 0 ? '#dc2626' : '#15803d'}
          />
        </ScrollView>

        {/* ── Top Critical ─────────────────────────────────────────────────── */}
        {topCritical.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <AlertTriangleIcon color="#dc2626" size={15} />
                <Text style={styles.cardTitle}>Top Critical Units</Text>
              </View>
              <Text style={styles.cardSubtitle}>{topCritical.length} units need attention</Text>
            </View>
            <View style={styles.criticalGrid}>
              {topCritical.map(wh => {
                const cfg = STATUS_CFG[wh.status];
                return (
                  <View
                    key={wh.id}
                    style={[styles.criticalCard, {borderLeftColor: cfg.bar, backgroundColor: cfg.tileBg}]}>
                    <View style={styles.criticalHeader}>
                      <Text style={styles.criticalId}>{wh.id}</Text>
                      <View style={[styles.statusBadge, {backgroundColor: cfg.badgeBg}]}>
                        <Text style={[styles.statusBadgeText, {color: cfg.badge}]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={styles.criticalMetrics}>
                      {wh.temp !== null && (
                        <>
                          <Text style={styles.criticalMetric}>{wh.temp}°C</Text>
                          <Text style={styles.criticalSep}>·</Text>
                          <Text style={styles.criticalMetric}>{wh.humidity}% RH</Text>
                          <Text style={styles.criticalSep}>·</Text>
                          <Text style={styles.criticalMetric}>{wh.moisture}% M</Text>
                        </>
                      )}
                    </View>
                    <CapacityBar pct={wh.usedPct} color={cfg.bar} />
                    <Text style={styles.criticalCap}>{wh.usedPct}% capacity</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Warehouse List ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>All Warehouses</Text>
            <Text style={styles.cardSubtitle}>{warehouses.length} storage units</Text>
          </View>
          <View style={styles.whList}>
            {warehouses.map(wh => (
              <WarehouseRow key={wh.id} wh={wh} />
            ))}
          </View>
        </View>

        {/* ── Zone Summary ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Zone Status Distribution</Text>
            <Text style={styles.cardSubtitle}>Current risk classification</Text>
          </View>
          <View style={styles.donutSection}>
            <DonutChart data={zoneSummary} />
          </View>
        </View>

        {/* ── Stability Trend ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Stability Trend</Text>
            <Text style={styles.cardSubtitle}>7-day warehouse stability score (%)</Text>
          </View>
          <View style={styles.chartSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <StabilityChart data={stabilityData} />
            </ScrollView>
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

  // ── Metric cards ────────────────────────────────────────────────────────────
  metricsRow: {
    paddingHorizontal: 14,
    gap: 10,
  },
  metricCard: {
    width: 160,
    backgroundColor: C.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },
  metricAccent: {
    height: 3,
    width: '100%',
  },
  metricInner: {
    padding: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricLeft: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricSub: {
    fontSize: 10,
    color: C.textSecondary,
    lineHeight: 13,
  },

  // ── Cards ────────────────────────────────────────────────────────────────────
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  cardSubtitle: {
    fontSize: 10.5,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Status badge ─────────────────────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },

  // ── Top Critical ─────────────────────────────────────────────────────────────
  criticalGrid: {
    padding: 12,
    gap: 8,
  },
  criticalCard: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  criticalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  criticalId: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  criticalMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  criticalMetric: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },
  criticalSep: {
    fontSize: 11,
    color: C.textMuted,
  },
  criticalCap: {
    fontSize: 9.5,
    color: C.textMuted,
    marginTop: 4,
  },

  // ── Warehouse list ────────────────────────────────────────────────────────────
  whList: {
    gap: 1,
    backgroundColor: '#f1f5f9',
  },
  whRow: {
    flexDirection: 'row',
  },
  whLeftBar: {
    width: 3,
    flexShrink: 0,
  },
  whContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  whHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  whHeaderLeft: {
    flex: 1,
  },
  whHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whId: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  whName: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Sensor chips ──────────────────────────────────────────────────────────────
  sensorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sensorChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  sensorKey: {
    fontSize: 8.5,
    color: C.textMuted,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  sensorVal: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  sensorGreen: {color: '#15803d'},
  sensorAmber: {color: '#b45309'},
  sensorRed: {color: '#dc2626'},

  // ── Offline ───────────────────────────────────────────────────────────────────
  offlineRow: {
    paddingVertical: 8,
    marginBottom: 6,
  },
  offlineText: {
    fontSize: 11,
    color: C.textMuted,
    fontStyle: 'italic',
  },

  // ── Capacity bar ─────────────────────────────────────────────────────────────
  capSection: {
    gap: 4,
  },
  capLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capLabel: {
    fontSize: 9.5,
    fontWeight: fontWeight.semibold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  capPct: {
    fontSize: 10.5,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  capBarBg: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  capBarFill: {
    height: 5,
    borderRadius: 999,
  },
  capSub: {
    fontSize: 9.5,
    color: C.textMuted,
  },

  // ── Expanded panel ────────────────────────────────────────────────────────────
  expandPanel: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  expandCell: {
    alignItems: 'center',
    gap: 2,
  },
  expandKey: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  expandVal: {
    fontSize: 11.5,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  expandFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  expandFooterText: {
    fontSize: 9.5,
    color: C.textMuted,
    textAlign: 'center',
  },

  // ── Last update ───────────────────────────────────────────────────────────────
  lastUpdate: {
    fontSize: 9.5,
    color: C.textMuted,
    marginTop: 4,
  },

  // ── Donut chart ───────────────────────────────────────────────────────────────
  donutSection: {
    padding: 16,
  },
  donutWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  donutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },
  donutLegendCount: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },

  // ── Chart ─────────────────────────────────────────────────────────────────────
  chartSection: {
    padding: 14,
    paddingTop: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
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
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
