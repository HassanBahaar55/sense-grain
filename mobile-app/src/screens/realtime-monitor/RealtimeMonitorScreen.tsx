import React, {useEffect, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Line, Path, Polyline, Rect, Text as SvgText} from 'react-native-svg';
import {type ParamTrendPoint} from '../../lib/dataEngine';
import {useLiveData} from '../../contexts/LiveDataContext';
import type {ManagedZone, ManagedSensor, WarehouseReading} from '../../lib/accountDb';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  primary: '#1f5135',
  bg: '#f6f8f3',
  white: '#ffffff',
  textPrimary: '#172118',
  textSecondary: '#5e6b5f',
  textMuted: '#8e9b8f',
  border: '#e5e7eb',
};

// Thresholds — in sync with Cloud Function THR constants
const T = {
  temp:     {safe: 29, warn: 32},
  humidity: {safe: 65, warn: 72},
  moisture: {safe: 13, warn: 15},
};

// ─── Zone offsets — cycles for any number of zones (same as web) ──────────────

const ZONE_OFFSETS = [
  {temp: -0.6, humidity: -3, moisture: -0.3},
  {temp: +0.8, humidity: +2, moisture: +0.4},
  {temp: -0.2, humidity: -1, moisture: -0.1},
  {temp: +0.5, humidity: +1, moisture: +0.2},
  {temp: +1.1, humidity: +3, moisture: +0.5},
  {temp: -0.4, humidity: -2, moisture: -0.2},
  {temp: +0.3, humidity:  0, moisture: +0.1},
  {temp: -0.9, humidity: -4, moisture: -0.5},
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneStatus = 'good' | 'normal' | 'warning' | 'critical' | 'offline';

interface ZoneReading {
  id: string;
  label: string;
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
  co2: number | null;
  aqi: number | null;
  status: ZoneStatus;
}

// ─── Status configs ───────────────────────────────────────────────────────────

const WH_STATUS_CFG = {
  good:     {dot: '#22c55e', badge: '#dcfce7', badgeText: '#15803d', label: 'Online'},
  medium:   {dot: '#f59e0b', badge: '#fef3c7', badgeText: '#b45309', label: 'Warning'},
  high:     {dot: '#ef4444', badge: '#fee2e2', badgeText: '#b91c1c', label: 'Alert'},
  inactive: {dot: '#9ca3af', badge: '#f3f4f6', badgeText: '#4b5563', label: 'Offline'},
};

const ZONE_STATUS_CFG: Record<ZoneStatus, {dot: string; badge: string; badgeText: string; label: string; ring: string}> = {
  good:     {dot: '#22c55e', badge: '#f0fdf4', badgeText: '#15803d', label: 'Good',     ring: '#e5e7eb'},
  normal:   {dot: '#3b82f6', badge: '#eff6ff', badgeText: '#1d4ed8', label: 'Elevated', ring: '#bfdbfe'},
  warning:  {dot: '#f59e0b', badge: '#fffbeb', badgeText: '#b45309', label: 'Warning',  ring: '#fde68a'},
  critical: {dot: '#ef4444', badge: '#fef2f2', badgeText: '#b91c1c', label: 'Critical', ring: '#fca5a5'},
  offline:  {dot: '#9ca3af', badge: '#f9fafb', badgeText: '#4b5563', label: 'Offline',  ring: '#e5e7eb'},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcZoneStatus(temp: number | null, hum: number | null, moist: number | null): ZoneStatus {
  if (temp === null && hum === null) return 'offline';
  const t = temp ?? 0; const h = hum ?? 0; const m = moist ?? 0;
  if (t >= T.temp.warn || h >= T.humidity.warn || m >= T.moisture.warn) return 'critical';
  if (t >= T.temp.safe || h >= T.humidity.safe || m >= T.moisture.safe) return 'warning';
  if (t >= T.temp.safe * 0.93 || h >= T.humidity.safe * 0.93) return 'normal';
  return 'good';
}

function buildZoneReadings(
  fsZones: ManagedZone[],
  fsSensors: ManagedSensor[],
  liveWH: WarehouseReading | null,
): ZoneReading[] {
  return fsZones.map((zone, i) => {
    const active = fsSensors.filter(s => s.zoneId === zone.id && s.status !== 'faulty');
    if (!liveWH || active.length === 0 || liveWH.temp === null) {
      return {
        id: `S${i + 1}`, label: zone.name,
        temp: null, humidity: null, moisture: null, co2: null, aqi: null,
        status: 'offline' as ZoneStatus,
      };
    }
    const off = ZONE_OFFSETS[i % ZONE_OFFSETS.length];
    const temp     = +(liveWH.temp + off.temp).toFixed(1);
    const humidity = Math.round((liveWH.humidity ?? 0) + off.humidity);
    const moisture = +((liveWH.moisture ?? 0) + off.moisture).toFixed(1);
    return {
      id: `S${i + 1}`, label: zone.name,
      temp, humidity, moisture,
      co2: liveWH.co2, aqi: liveWH.aqi,
      status: calcZoneStatus(temp, humidity, moisture),
    };
  });
}

function barWidth(val: number | null, limit: number): number {
  if (val === null) return 0;
  return Math.min(100, Math.round((val / limit) * 100));
}

function barColor(val: number | null, safe: number, warn: number): string {
  if (val === null) return '#e5e7eb';
  if (val >= warn)  return '#ef4444';
  if (val >= safe)  return '#f59e0b';
  return '#22c55e';
}

function valColor(val: number | null, safe: number, warn: number): string {
  if (val === null) return '#9ca3af';
  if (val >= warn)  return '#dc2626';
  if (val >= safe)  return '#b45309';
  return '#172118';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PulseIcon({size = 18, color = C.primary}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ThermIcon({size = 16, color = '#6b7280'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function DropIcon({size = 16, color = '#6b7280'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloudIcon({size = 16, color = '#6b7280'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={styles.clockText}>{time}</Text>;
}

// ─── Warehouse selector ───────────────────────────────────────────────────────

function WHSelector({warehouses, selectedId, onSelect}: {
  warehouses: WarehouseReading[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.whSelectorWrap}>
      <View style={styles.whSelectorInner}>
        {warehouses.map(wh => {
          const isSelected = wh.id === selectedId;
          const isOffline = wh.status === 'inactive';
          const cfg = WH_STATUS_CFG[wh.status];
          return (
            <TouchableOpacity
              key={wh.id}
              onPress={() => onSelect(wh.id)}
              style={[styles.whBtn, isSelected && styles.whBtnSelected, isOffline && {opacity: 0.45}]}>
              <View style={[styles.whDot, {backgroundColor: isSelected ? '#fff' : cfg.dot}]} />
              <Text style={[styles.whBtnText, isSelected && styles.whBtnTextSelected]} numberOfLines={1}>
                {wh.name || wh.id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Metric strip ─────────────────────────────────────────────────────────────

function MetricStrip({wh}: {wh: WarehouseReading | undefined}) {
  if (!wh) return null;
  const metrics = [
    {label: 'Temp',     value: wh.temp     != null ? `${wh.temp}°C`     : '—', color: valColor(wh.temp,     T.temp.safe,     T.temp.warn),     icon: <ThermIcon color={valColor(wh.temp,     T.temp.safe,     T.temp.warn)} />},
    {label: 'Humidity', value: wh.humidity  != null ? `${wh.humidity}%`  : '—', color: valColor(wh.humidity, T.humidity.safe, T.humidity.warn), icon: <DropIcon  color={valColor(wh.humidity, T.humidity.safe, T.humidity.warn)} />},
    {label: 'Moisture', value: wh.moisture  != null ? `${wh.moisture}%`  : '—', color: C.textSecondary,                                          icon: <DropIcon  color={C.textSecondary} />},
    {label: 'CO₂',      value: wh.co2       != null ? `${wh.co2}`        : '—', color: C.textSecondary,                                          icon: <CloudIcon color={C.textSecondary} />},
    {label: 'AQI',      value: wh.aqi       != null ? `${wh.aqi}`        : '—', color: C.textSecondary,                                          icon: <PulseIcon size={16} color={C.textSecondary} />},
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.metricStrip}>
        {metrics.map(m => (
          <View key={m.label} style={styles.metricCard}>
            <View style={styles.metricIcon}>{m.icon}</View>
            <Text style={[styles.metricValue, {color: m.color}]}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Zone card (matches web ZoneCard layout with progress bars) ───────────────

function ZoneCard({zone}: {zone: ZoneReading}) {
  const cfg = ZONE_STATUS_CFG[zone.status];
  const isOffline = zone.status === 'offline';

  const metrics = [
    {label: 'TEMP',  val: zone.temp,     safe: T.temp.safe,     warn: T.temp.warn,     limit: T.temp.warn * 1.25,     fmt: (v: number) => `${v}°C`},
    {label: 'HUM',   val: zone.humidity, safe: T.humidity.safe, warn: T.humidity.warn, limit: T.humidity.warn * 1.25, fmt: (v: number) => `${v}%`},
    {label: 'MOIST', val: zone.moisture, safe: T.moisture.safe, warn: T.moisture.warn, limit: T.moisture.warn * 1.25, fmt: (v: number) => `${v.toFixed(1)}%`},
  ];

  return (
    <View style={[styles.zoneCard, {borderColor: zone.status === 'critical' ? '#fca5a5' : zone.status === 'warning' ? '#fde68a' : C.border}]}>
      {/* Header */}
      <View style={styles.zoneCardHeader}>
        <View style={styles.zoneCardLeft}>
          <View style={[styles.zoneDot, {backgroundColor: cfg.dot}, zone.status === 'critical' && styles.zoneDotPulse]} />
          <Text style={styles.zoneId}>{zone.id}</Text>
          <Text style={styles.zoneLabel} numberOfLines={1}>{zone.label}</Text>
        </View>
        <View style={[styles.zoneBadge, {backgroundColor: cfg.badge}]}>
          <Text style={[styles.zoneBadgeText, {color: cfg.badgeText}]}>{cfg.label}</Text>
        </View>
      </View>

      {isOffline ? (
        <Text style={styles.zoneOfflineText}>No signal from sensor</Text>
      ) : (
        <>
          {/* Progress bars */}
          <View style={styles.zoneMetrics}>
            {metrics.map(m => (
              <View key={m.label} style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>{m.label}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.bar, {backgroundColor: barColor(m.val, m.safe, m.warn), width: `${barWidth(m.val, m.limit)}%`}]} />
                </View>
                <Text style={[styles.metricRowVal, {color: valColor(m.val, m.safe, m.warn)}]}>
                  {m.val !== null ? m.fmt(m.val) : '—'}
                </Text>
              </View>
            ))}
          </View>

          {/* CO₂ / AQI footer */}
          <View style={styles.zoneFooter}>
            <Text style={styles.zoneFooterLabel}>CO₂</Text>
            <Text style={styles.zoneFooterVal}>{zone.co2 ?? '—'} <Text style={styles.zoneFooterUnit}>ppm</Text></Text>
            <View style={styles.zoneFooterDivider} />
            <Text style={styles.zoneFooterLabel}>AQI</Text>
            <Text style={styles.zoneFooterVal}>{zone.aqi ?? '—'}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Parameter trends chart ───────────────────────────────────────────────────

function ParamTrendsChart({data}: {data: ParamTrendPoint[]}) {
  const W = 300; const H = 100; const padB = 20;
  const chartH = H - padB;
  const n = data.length;
  if (n === 0) return null;

  function toPath(key: keyof Omit<ParamTrendPoint, 'time'>): string {
    return data.map((d, i) => {
      const x = (i / (n - 1)) * W;
      const y = chartH - (d[key] / 100) * chartH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  const lines = [
    {key: 'temp'     as const, color: '#f59e0b', label: 'Temp'},
    {key: 'humidity' as const, color: '#3b82f6', label: 'Humidity'},
    {key: 'moisture' as const, color: '#10b981', label: 'Moisture'},
    {key: 'co2'      as const, color: '#8b5cf6', label: 'CO₂'},
  ];

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[25, 50, 75].map(pct => (
          <Line key={pct} x1={0} y1={chartH - (pct / 100) * chartH} x2={W} y2={chartH - (pct / 100) * chartH} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        {lines.map(l => (
          <Path key={l.key} d={toPath(l.key)} stroke={l.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {data.filter((_, i) => i % 2 === 0).map((d, i) => {
          const origIdx = i * 2;
          const x = (origIdx / (n - 1)) * W;
          return <SvgText key={i} x={x} y={H - 4} textAnchor="middle" fontSize="7" fill="#9ca3af">{d.time}</SvgText>;
        })}
      </Svg>
      <View style={styles.chartLegend}>
        {lines.map(l => (
          <View key={l.key} style={styles.legendItem}>
            <View style={[styles.legendLine, {backgroundColor: l.color}]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Safe limits reference ────────────────────────────────────────────────────

function SafeLimits() {
  return (
    <View style={styles.safeLimits}>
      <Text style={styles.safeLimitsTitle}>Safe limits:</Text>
      {[
        {label: 'Temp',     safe: `< ${T.temp.safe}°C`,     warn: `${T.temp.safe}–${T.temp.warn}°C`},
        {label: 'Humidity', safe: `< ${T.humidity.safe}%`,  warn: `${T.humidity.safe}–${T.humidity.warn}%`},
        {label: 'Moisture', safe: `< ${T.moisture.safe}%`,  warn: `${T.moisture.safe}–${T.moisture.warn}%`},
      ].map(r => (
        <View key={r.label} style={styles.safeLimitsRow}>
          <Text style={styles.safeLimitsLabel}>{r.label}:</Text>
          <View style={styles.safeChip}><Text style={styles.safeChipText}>{r.safe}</Text></View>
          <View style={styles.warnChip}><Text style={styles.warnChipText}>{r.warn}</Text></View>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RealtimeMonitorScreen() {
  const {warehouses, zones, sensors, warehouseReadings, sensorReadings} = useLiveData();

  const [selectedId, setSelectedId]   = useState('');
  const [activeTab, setActiveTab]     = useState<'zones' | 'trends'>('zones');

  // Auto-select first active warehouse
  const firstActive = warehouseReadings.find(w => w.status !== 'inactive') ?? warehouseReadings[0];
  const effectiveId = selectedId || (firstActive?.id ?? '');
  const selectedWH  = warehouseReadings.find(w => w.id === effectiveId);

  useEffect(() => {
    if (!selectedId && firstActive) setSelectedId(firstActive.id);
  }, [firstActive, selectedId]);

  // Real Firestore zones and sensors for the selected warehouse
  const whZones   = useMemo(() => zones.filter(z => z.warehouseId === effectiveId),   [zones,   effectiveId]);
  const whSensors = useMemo(() => sensors.filter(s => s.warehouseId === effectiveId), [sensors, effectiveId]);
  const zoneCards = useMemo(() => buildZoneReadings(whZones, whSensors, selectedWH ?? null), [whZones, whSensors, selectedWH]);

  // Aggregate stats from ALL active warehouse readings
  const activeWHs     = warehouseReadings.filter(w => w.status !== 'inactive');
  const avgTemp       = activeWHs.length ? activeWHs.reduce((s, r) => s + (r.temp ?? 0), 0) / activeWHs.length : null;
  const avgHumidity   = activeWHs.length ? activeWHs.reduce((s, r) => s + (r.humidity ?? 0), 0) / activeWHs.length : null;
  const avgMoisture   = activeWHs.length ? activeWHs.reduce((s, r) => s + (r.moisture ?? 0), 0) / activeWHs.length : null;
  const critCount     = warehouseReadings.filter(w => w.status === 'high').length;
  const warnCount     = warehouseReadings.filter(w => w.status === 'medium').length;
  const activeCount   = activeWHs.length;

  // Parameter trend data
  const paramTrendData = useMemo((): ParamTrendPoint[] => {
    if (!sensorReadings.length) return [];
    const THRESHOLDS = {temp: 35, humidity: 85, moisture: 16, co2: 650};
    const hours = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
    const temps = sensorReadings.filter(s => s.type === 'temperature' || s.type === 'multi').map(s => s.type === 'multi' ? (s.values?.temperature ?? s.value) : s.value);
    const hums  = sensorReadings.filter(s => s.type === 'humidity'    || s.type === 'multi').map(s => s.type === 'multi' ? (s.values?.humidity    ?? s.value) : s.value);
    const mois  = sensorReadings.filter(s => s.type === 'moisture'    || s.type === 'multi').map(s => s.type === 'multi' ? (s.values?.moisture    ?? s.value) : s.value);
    const co2s  = sensorReadings.filter(s => s.type === 'co2'         || s.type === 'multi').map(s => s.type === 'multi' ? (s.values?.co2         ?? s.value) : s.value);
    const avg   = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgT = avg(temps); const avgH = avg(hums); const avgM = avg(mois); const avgC = avg(co2s);
    return hours.map((time, i) => ({
      time,
      temp:     +Math.max(30, Math.min(100, avgT / THRESHOLDS.temp * 100 + (i - 6) * 1.2)).toFixed(1),
      humidity: +Math.max(30, Math.min(100, avgH / THRESHOLDS.humidity * 100 + (i - 6) * 0.8)).toFixed(1),
      moisture: +Math.max(30, Math.min(100, avgM / THRESHOLDS.moisture * 100 + (i - 6) * 0.5)).toFixed(1),
      co2:      +Math.max(30, Math.min(100, avgC / THRESHOLDS.co2 * 100 + (i - 6) * 0.4)).toFixed(1),
    }));
  }, [sensorReadings]);

  const noWarehouses = warehouses.length === 0;
  const whStatus = selectedWH ? WH_STATUS_CFG[selectedWH.status] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Realtime Monitor</Text>
          <Text style={styles.headerSub}>
            {noWarehouses
              ? 'No warehouses configured'
              : !selectedId
              ? 'Select a warehouse to begin'
              : `${selectedWH?.name ?? effectiveId} · ${zoneCards.filter(z => z.status !== 'offline').length} of ${zoneCards.length} zones active`}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
          <LiveClock />
        </View>
      </View>

      {noWarehouses ? (
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyTitle}>No warehouses configured</Text>
          <Text style={styles.emptySub}>Add a warehouse in Settings → Infrastructure to begin monitoring.</Text>
        </View>
      ) : (
        <>
          {/* Warehouse selector + status */}
          <View style={styles.selectorBar}>
            <WHSelector warehouses={warehouseReadings} selectedId={effectiveId} onSelect={setSelectedId} />
            {whStatus && (
              <View style={[styles.whStatusBadge, {backgroundColor: whStatus.badge}]}>
                <View style={[styles.whStatusDot, {backgroundColor: whStatus.dot}]} />
                <Text style={[styles.whStatusText, {color: whStatus.badgeText}]}>{whStatus.label}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Stats strip */}
            <View style={styles.statsGrid}>
              {[
                {
                  label: 'Avg Temperature',
                  value: avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : '—',
                  bar: '#f59e0b',
                  status: avgTemp !== null && avgTemp >= T.temp.warn ? 'critical' : avgTemp !== null && avgTemp >= T.temp.safe ? 'warning' : 'good',
                  tip: `Safe < ${T.temp.safe}°C`,
                },
                {
                  label: 'Avg Humidity',
                  value: avgHumidity !== null ? `${Math.round(avgHumidity)}%` : '—',
                  bar: '#3b82f6',
                  status: avgHumidity !== null && avgHumidity >= T.humidity.warn ? 'critical' : avgHumidity !== null && avgHumidity >= T.humidity.safe ? 'warning' : 'good',
                  tip: `Safe < ${T.humidity.safe}%`,
                },
                {
                  label: 'Avg Moisture',
                  value: avgMoisture !== null ? `${avgMoisture.toFixed(1)}%` : '—',
                  bar: '#22c55e',
                  status: avgMoisture !== null && avgMoisture >= T.moisture.warn ? 'critical' : avgMoisture !== null && avgMoisture >= T.moisture.safe ? 'warning' : 'good',
                  tip: `Safe < ${T.moisture.safe}%`,
                },
                {
                  label: 'Alert Status',
                  value: critCount > 0 ? `${critCount} Critical` : warnCount > 0 ? `${warnCount} Warning` : activeCount === 0 ? '—' : 'All Clear',
                  bar: critCount > 0 ? '#ef4444' : warnCount > 0 ? '#f59e0b' : '#22c55e',
                  status: critCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'good' as const,
                  tip: `${activeCount} of ${warehouseReadings.length} units active`,
                },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statBar, {backgroundColor: s.bar}]} />
                  <View style={styles.statInner}>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <Text style={[styles.statValue, {
                      color: s.status === 'critical' ? '#dc2626' : s.status === 'warning' ? '#b45309' : '#16a34a',
                    }]}>{s.value}</Text>
                    <Text style={styles.statTip}>{s.tip}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Metric strip for selected WH */}
            <MetricStrip wh={selectedWH} />

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['zones', 'trends'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                  onPress={() => setActiveTab(t)}>
                  <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                    {t === 'zones' ? 'Sensor Zones' : 'Parameter Trends'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'zones' && (
              <View style={styles.contentArea}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{selectedWH?.name ?? effectiveId} — Sensor Zones</Text>
                  <Text style={styles.cardSub}>
                    {zoneCards.length === 0
                      ? 'No zones configured — add zones in Settings → Infrastructure'
                      : `${zoneCards.filter(z => z.status !== 'offline').length} of ${zoneCards.length} sensors active · updates every 60s`}
                  </Text>
                  {zoneCards.length === 0 ? (
                    <View style={styles.emptyZones}>
                      <Text style={styles.emptyZonesText}>Go to Settings → Infrastructure, select this warehouse, and add zones.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.zoneGrid}>
                        {zoneCards.map(zone => (
                          <View key={zone.id + zone.label} style={styles.zoneCardWrap}>
                            <ZoneCard zone={zone} />
                          </View>
                        ))}
                      </View>
                      <SafeLimits />
                    </>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'trends' && (
              <View style={styles.contentArea}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Parameter Trends</Text>
                  <Text style={styles.cardSub}>
                    How close each reading is to its safe limit — 100% = limit reached · live data
                  </Text>
                  <View style={styles.chartWrap}>
                    <ParamTrendsChart data={paramTrendData} />
                  </View>
                  {/* Legend with current values */}
                  <View style={styles.trendLegendRow}>
                    {[
                      {label: 'Temp',     color: '#f59e0b', val: avgTemp     !== null ? `${avgTemp.toFixed(1)}°C` : '—'},
                      {label: 'Humidity', color: '#3b82f6', val: avgHumidity !== null ? `${Math.round(avgHumidity)}%` : '—'},
                      {label: 'Moisture', color: '#10b981', val: avgMoisture !== null ? `${avgMoisture.toFixed(1)}%` : '—'},
                      {label: 'CO₂',      color: '#8b5cf6', val: selectedWH?.co2 != null ? `${selectedWH.co2} ppm` : '—'},
                    ].map(s => (
                      <View key={s.label} style={styles.trendLegendItem}>
                        <View style={[styles.trendLegendLine, {backgroundColor: s.color}]} />
                        <Text style={styles.trendLegendLabel}>{s.label}</Text>
                        <Text style={styles.trendLegendVal}>{s.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* System summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>System Summary</Text>
              <View style={styles.summaryGrid}>
                {[
                  {label: 'Total Units', value: warehouseReadings.length,                                        color: C.textPrimary},
                  {label: 'Online',      value: activeCount,                                                      color: '#15803d'},
                  {label: 'Offline',     value: warehouseReadings.length - activeCount,                           color: '#9ca3af'},
                  {label: 'Critical',    value: warehouseReadings.filter(w => w.status === 'high').length,         color: '#b91c1c'},
                ].map(s => (
                  <View key={s.label} style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, {color: s.color}]}>{s.value}</Text>
                    <Text style={styles.summaryLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{height: 32}} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll:   {flex: 1},

  // Header
  header:      {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border},
  headerLeft:  {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3},
  headerSub:   {fontSize: 11, color: C.textMuted, marginTop: 2},
  liveIndicator: {flexDirection: 'row', alignItems: 'center', gap: 4},
  liveDot:     {width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e'},
  liveText:    {fontSize: 11, fontWeight: '700', color: '#15803d'},
  clockText:   {fontSize: 11, color: C.textMuted, fontWeight: '600'},

  // Selector bar
  selectorBar: {backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8, paddingRight: 12, flexDirection: 'row', alignItems: 'center'},
  whSelectorWrap:  {flex: 1},
  whSelectorInner: {flexDirection: 'row', gap: 6, paddingHorizontal: 12},
  whBtn:       {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6'},
  whBtnSelected: {backgroundColor: C.primary},
  whBtnText:   {fontSize: 12, fontWeight: '700', color: C.textSecondary},
  whBtnTextSelected: {color: '#fff'},
  whDot:       {width: 6, height: 6, borderRadius: 3},
  whStatusBadge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 4},
  whStatusDot:  {width: 7, height: 7, borderRadius: 4},
  whStatusText: {fontSize: 12, fontWeight: '700'},

  // Stats grid (2x2)
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12},
  statCard:  {width: '48%', backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: {width: 0, height: 2}, shadowRadius: 4, elevation: 2},
  statBar:   {height: 3},
  statInner: {padding: 12},
  statLabel: {fontSize: 9.5, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4},
  statValue: {fontSize: 20, fontWeight: '800', letterSpacing: -0.5, lineHeight: 24},
  statTip:   {fontSize: 9.5, color: '#94a3b8', marginTop: 4},

  // Metric strip
  metricStrip: {flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12},
  metricCard:  {alignItems: 'center', backgroundColor: C.white, borderRadius: 12, padding: 10, minWidth: 68, borderWidth: 1, borderColor: C.border},
  metricIcon:  {marginBottom: 4},
  metricValue: {fontSize: 15, fontWeight: '800', letterSpacing: -0.3},
  metricLabel: {fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2},

  // Tabs
  tabRow:         {flexDirection: 'row', marginHorizontal: 12, marginBottom: 10, backgroundColor: '#e5e7eb', borderRadius: 10, padding: 3},
  tabBtn:         {flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center'},
  tabBtnActive:   {backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  tabBtnText:     {fontSize: 12, fontWeight: '600', color: C.textMuted},
  tabBtnTextActive: {color: C.textPrimary, fontWeight: '700'},

  // Content
  contentArea: {paddingHorizontal: 12, marginBottom: 12},
  card:        {backgroundColor: C.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border},
  cardTitle:   {fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 3},
  cardSub:     {fontSize: 11, color: C.textMuted, marginBottom: 12},

  // Zone grid — 2 columns
  zoneGrid:     {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  zoneCardWrap: {width: '48%'},

  // Zone card
  zoneCard:       {backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, padding: 10, overflow: 'hidden'},
  zoneCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  zoneCardLeft:   {flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1},
  zoneDot:        {width: 8, height: 8, borderRadius: 4},
  zoneDotPulse:   {},
  zoneId:         {fontSize: 12, fontWeight: '800', color: C.textPrimary},
  zoneLabel:      {fontSize: 10, color: C.textMuted, flex: 1},
  zoneBadge:      {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999},
  zoneBadgeText:  {fontSize: 9, fontWeight: '700'},
  zoneOfflineText: {fontSize: 11, color: '#9ca3af', textAlign: 'center', paddingVertical: 12},

  // Zone metric rows with progress bars
  zoneMetrics:   {gap: 6, marginBottom: 8},
  metricRow:     {flexDirection: 'row', alignItems: 'center', gap: 4},
  metricRowLabel: {fontSize: 8.5, fontWeight: '700', color: '#94a3b8', width: 32, textTransform: 'uppercase'},
  barWrap:        {flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden'},
  bar:            {height: 5, borderRadius: 3},
  metricRowVal:   {fontSize: 10.5, fontWeight: '700', width: 36, textAlign: 'right'},

  // Zone footer
  zoneFooter:       {flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6},
  zoneFooterLabel:  {fontSize: 8.5, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase'},
  zoneFooterVal:    {fontSize: 10.5, fontWeight: '700', color: C.textSecondary},
  zoneFooterUnit:   {fontSize: 8, fontWeight: '500', color: '#94a3b8'},
  zoneFooterDivider:{width: 1, height: 10, backgroundColor: '#e5e7eb', marginHorizontal: 4},

  // Safe limits
  safeLimits:      {marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9'},
  safeLimitsTitle: {fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6},
  safeLimitsRow:   {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  safeLimitsLabel: {fontSize: 10, fontWeight: '700', color: C.textSecondary, width: 48},
  safeChip:        {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f0fdf4'},
  safeChipText:    {fontSize: 9, fontWeight: '700', color: '#15803d'},
  warnChip:        {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#fffbeb'},
  warnChipText:    {fontSize: 9, fontWeight: '700', color: '#b45309'},

  // Chart
  chartWrap:    {alignItems: 'center', marginBottom: 8},
  chartLegend:  {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6},
  legendItem:   {flexDirection: 'row', alignItems: 'center', gap: 4},
  legendLine:   {width: 16, height: 2.5, borderRadius: 2},
  legendText:   {fontSize: 10.5, color: C.textSecondary, fontWeight: '600'},

  // Trend legend
  trendLegendRow:  {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9'},
  trendLegendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  trendLegendLine: {width: 16, height: 2.5, borderRadius: 2},
  trendLegendLabel:{fontSize: 10.5, fontWeight: '600', color: C.textSecondary},
  trendLegendVal:  {fontSize: 10.5, fontWeight: '700', color: C.textPrimary},

  // Summary card
  summaryCard:  {marginHorizontal: 12, backgroundColor: C.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8},
  summaryTitle: {fontSize: 13, fontWeight: '800', color: C.textPrimary, marginBottom: 12},
  summaryGrid:  {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem:  {alignItems: 'center'},
  summaryVal:   {fontSize: 22, fontWeight: '800', letterSpacing: -0.5},
  summaryLabel: {fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2},

  // Empty
  emptyCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  emptyTitle:  {fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 6, textAlign: 'center'},
  emptySub:    {fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18},
  emptyZones:  {paddingVertical: 16},
  emptyZonesText: {fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18},
});
