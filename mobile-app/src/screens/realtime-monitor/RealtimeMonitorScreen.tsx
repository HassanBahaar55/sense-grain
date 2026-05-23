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
import {getWarehouseReadings, getParamTrendData, type WarehouseReading, type ParamTrendPoint} from '../../lib/dataEngine';

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

// Safe thresholds
const T = {
  temp:     {safe: 27, warn: 30},
  humidity: {safe: 62, warn: 70},
  moisture: {safe: 13, warn: 14},
};

type ViewMode = 'status' | 'temp' | 'humidity';

const STATUS_CFG = {
  good:     {dot: '#22c55e', badge: '#dcfce7', badgeText: '#15803d', label: 'Good'},
  medium:   {dot: '#f59e0b', badge: '#fef3c7', badgeText: '#b45309', label: 'Warning'},
  high:     {dot: '#ef4444', badge: '#fee2e2', badgeText: '#b91c1c', label: 'Critical'},
  inactive: {dot: '#9ca3af', badge: '#f3f4f6', badgeText: '#4b5563', label: 'Offline'},
};

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

// ─── Value color helper ───────────────────────────────────────────────────────

function valColor(val: number | null, safe: number, warn: number): string {
  if (val === null) return '#9ca3af';
  if (val >= warn)  return '#dc2626';
  if (val >= safe)  return '#b45309';
  return '#172118';
}

// ─── Sensor dot color ─────────────────────────────────────────────────────────

function sensorFill(wh: WarehouseReading, mode: ViewMode): {fill: string; stroke: string; text: string} {
  if (mode === 'temp' && wh.temp !== null) {
    if (wh.temp >= T.temp.warn)  return {fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626'};
    if (wh.temp >= T.temp.safe)  return {fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309'};
    return {fill: '#dcfce7', stroke: '#22c55e', text: '#15803d'};
  }
  if (mode === 'humidity' && wh.humidity !== null) {
    if (wh.humidity >= T.humidity.warn) return {fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626'};
    if (wh.humidity >= T.humidity.safe) return {fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309'};
    return {fill: '#dcfce7', stroke: '#22c55e', text: '#15803d'};
  }
  const map: Record<string, {fill: string; stroke: string; text: string}> = {
    good:     {fill: '#dcfce7', stroke: '#22c55e', text: '#15803d'},
    medium:   {fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309'},
    high:     {fill: '#fee2e2', stroke: '#ef4444', text: '#dc2626'},
    inactive: {fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280'},
  };
  return map[wh.status] ?? map.inactive;
}

// ─── Floor plan (SVG schematic of warehouse zones) ────────────────────────────

function WarehouseFloorPlan({warehouses, selectedId, viewMode}: {
  warehouses: WarehouseReading[];
  selectedId: string;
  viewMode: ViewMode;
}) {
  const wh = warehouses.find(w => w.id === selectedId);
  if (!wh || wh.status === 'inactive') {
    return (
      <View style={styles.floorOffline}>
        <Text style={styles.floorOfflineText}>Warehouse Offline — No Data</Text>
      </View>
    );
  }

  // Lay out 4 zone boxes in a 2×2 grid
  const zones = [
    {x: 10, y: 10, w: 120, h: 80, label: 'Zone 1'},
    {x: 140, y: 10, w: 120, h: 80, label: 'Zone 2'},
    {x: 10, y: 100, w: 120, h: 70, label: 'Zone 3'},
    {x: 140, y: 100, w: 120, h: 70, label: 'Zone 4'},
  ];

  const colors_map = sensorFill(wh, viewMode);

  return (
    <Svg width="100%" height={190} viewBox="0 0 270 180">
      {/* Outer border */}
      <Rect x="5" y="5" width="260" height="170" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* Zone boxes */}
      {zones.map((z, i) => (
        <React.Fragment key={i}>
          <Rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={colors_map.fill} stroke={colors_map.stroke} strokeWidth="1.5" />
          <SvgText x={z.x + z.w / 2} y={z.y + 14} textAnchor="middle" fontSize="9" fontWeight="700" fill={colors_map.text}>{z.label}</SvgText>
          {/* Sensor dot */}
          <Circle cx={z.x + z.w / 2} cy={z.y + z.h / 2 + 4} r="14" fill={colors_map.stroke} opacity="0.15" />
          <Circle cx={z.x + z.w / 2} cy={z.y + z.h / 2 + 4} r="6" fill={colors_map.stroke} />
          {/* Value label */}
          <SvgText
            x={z.x + z.w / 2}
            y={z.y + z.h / 2 + 26}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill={colors_map.text}
          >
            {viewMode === 'temp' && wh.temp !== null ? `${wh.temp}°C` :
             viewMode === 'humidity' && wh.humidity !== null ? `${wh.humidity}%` :
             wh.temp !== null ? `${wh.temp}°C` : '—'}
          </SvgText>
        </React.Fragment>
      ))}
      {/* WH label */}
      <SvgText x="135" y="176" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">{selectedId} — Floor Plan</SvgText>
    </Svg>
  );
}

// ─── Parameter trends chart ───────────────────────────────────────────────────

function ParamTrendsChart({data}: {data: ParamTrendPoint[]}) {
  const W = 300; const H = 100; const padL = 0; const padB = 20;
  const chartH = H - padB;
  const n = data.length;
  if (n === 0) return null;

  function toPath(key: keyof Omit<ParamTrendPoint, 'time'>): string {
    return data.map((d, i) => {
      const x = padL + (i / (n - 1)) * (W - padL);
      const y = chartH - (d[key] / 100) * chartH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  const lines: {key: keyof Omit<ParamTrendPoint, 'time'>; color: string; label: string}[] = [
    {key: 'temp',     color: '#f59e0b', label: 'Temp'},
    {key: 'humidity', color: '#3b82f6', label: 'Humidity'},
    {key: 'moisture', color: '#10b981', label: 'Moisture'},
    {key: 'co2',      color: '#8b5cf6', label: 'CO₂'},
  ];

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid lines */}
        {[25, 50, 75].map(pct => (
          <Line key={pct} x1={padL} y1={chartH - (pct / 100) * chartH} x2={W} y2={chartH - (pct / 100) * chartH} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        {/* Data lines */}
        {lines.map(l => (
          <Path key={l.key} d={toPath(l.key)} stroke={l.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* X axis labels */}
        {data.filter((_, i) => i % 2 === 0).map((d, i) => {
          const origIdx = i * 2;
          const x = padL + (origIdx / (n - 1)) * (W - padL);
          return <SvgText key={i} x={x} y={H - 4} textAnchor="middle" fontSize="7" fill="#9ca3af">{d.time}</SvgText>;
        })}
      </Svg>
      {/* Legend */}
      <View style={styles.chartLegend}>
        {lines.map(l => (
          <View key={l.key} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: l.color}]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Warehouse selector ───────────────────────────────────────────────────────

function WHSelector({warehouses, selectedId, onSelect}: {
  warehouses: WarehouseReading[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.whSelector}>
      <View style={{flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10}}>
        {warehouses.map(wh => {
          const isSelected = wh.id === selectedId;
          const isOffline = wh.status === 'inactive';
          const cfg = STATUS_CFG[wh.status];
          return (
            <TouchableOpacity
              key={wh.id}
              onPress={() => !isOffline && onSelect(wh.id)}
              disabled={isOffline}
              style={[
                styles.whBtn,
                isSelected ? styles.whBtnSelected : null,
                isOffline ? styles.whBtnOffline : null,
              ]}
            >
              <View style={[styles.whDot, {backgroundColor: isSelected ? '#fff' : cfg.dot}]} />
              <Text style={[styles.whBtnText, isSelected && styles.whBtnTextSelected, isOffline && styles.whBtnTextOffline]}>
                {wh.id}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Zone readings table ──────────────────────────────────────────────────────

function ZoneReadings({wh}: {wh: WarehouseReading}) {
  if (!wh.temp) {
    return (
      <View style={styles.emptyZone}>
        <Text style={styles.emptyZoneText}>No sensor data available</Text>
      </View>
    );
  }

  const zones = [
    {name: 'Zone 1', temp: wh.temp, humidity: wh.humidity, moisture: wh.moisture},
    {name: 'Zone 2', temp: wh.temp !== null ? +(wh.temp + 0.5).toFixed(1) : null, humidity: wh.humidity !== null ? wh.humidity + 2 : null, moisture: wh.moisture},
    {name: 'Zone 3', temp: wh.temp !== null ? +(wh.temp - 0.3).toFixed(1) : null, humidity: wh.humidity !== null ? wh.humidity - 1 : null, moisture: wh.moisture},
    {name: 'Zone 4', temp: wh.temp !== null ? +(wh.temp + 0.8).toFixed(1) : null, humidity: wh.humidity !== null ? wh.humidity + 3 : null, moisture: wh.moisture},
  ];

  return (
    <View style={styles.zoneTable}>
      {/* Header */}
      <View style={styles.zoneHeaderRow}>
        <Text style={[styles.zoneCell, styles.zoneHeader, {flex: 1.2}]}>Zone</Text>
        <Text style={[styles.zoneCell, styles.zoneHeader]}>Temp</Text>
        <Text style={[styles.zoneCell, styles.zoneHeader]}>Humidity</Text>
        <Text style={[styles.zoneCell, styles.zoneHeader]}>Moisture</Text>
        <Text style={[styles.zoneCell, styles.zoneHeader]}>Status</Text>
      </View>
      {zones.map((z, i) => {
        const tColor = z.temp !== null ? (z.temp >= T.temp.warn ? '#b91c1c' : z.temp >= T.temp.safe ? '#b45309' : '#15803d') : '#9ca3af';
        const status = z.temp !== null && (z.temp >= T.temp.warn || (z.humidity ?? 0) >= T.humidity.warn) ? 'high' :
                       z.temp !== null && (z.temp >= T.temp.safe || (z.humidity ?? 0) >= T.humidity.safe) ? 'medium' : 'good';
        const cfg = STATUS_CFG[status];
        return (
          <View key={i} style={[styles.zoneRow, i % 2 === 0 ? styles.zoneRowAlt : null]}>
            <Text style={[styles.zoneCell, {flex: 1.2, fontWeight: '700', color: C.textPrimary}]}>{z.name}</Text>
            <Text style={[styles.zoneCell, {color: tColor, fontWeight: '700'}]}>{z.temp !== null ? `${z.temp}°C` : '—'}</Text>
            <Text style={[styles.zoneCell, {color: valColor(z.humidity, T.humidity.safe, T.humidity.warn), fontWeight: '600'}]}>{z.humidity !== null ? `${z.humidity}%` : '—'}</Text>
            <Text style={[styles.zoneCell, {color: C.textSecondary, fontWeight: '600'}]}>{z.moisture !== null ? `${z.moisture}%` : '—'}</Text>
            <View style={[styles.statusBadge, {backgroundColor: cfg.badge}]}>
              <Text style={[styles.statusBadgeText, {color: cfg.badgeText}]}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Real-time metrics strip ──────────────────────────────────────────────────

function MetricStrip({wh}: {wh: WarehouseReading}) {
  const metrics = [
    {label: 'Temp', value: wh.temp !== null ? `${wh.temp}°C` : '—', color: valColor(wh.temp, T.temp.safe, T.temp.warn), icon: <ThermIcon color={valColor(wh.temp, T.temp.safe, T.temp.warn)} />},
    {label: 'Humidity', value: wh.humidity !== null ? `${wh.humidity}%` : '—', color: valColor(wh.humidity, T.humidity.safe, T.humidity.warn), icon: <DropIcon color={valColor(wh.humidity, T.humidity.safe, T.humidity.warn)} />},
    {label: 'Moisture', value: wh.moisture !== null ? `${wh.moisture}%` : '—', color: C.textSecondary, icon: <DropIcon color={C.textSecondary} />},
    {label: 'CO₂', value: wh.co2 !== null ? `${wh.co2}` : '—', color: C.textSecondary, icon: <CloudIcon color={C.textSecondary} />},
    {label: 'AQI', value: wh.aqi !== null ? `${wh.aqi}` : '—', color: C.textSecondary, icon: <PulseIcon size={16} color={C.textSecondary} />},
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RealtimeMonitorScreen() {
  const warehouses = useMemo(() => getWarehouseReadings(new Date()), []);
  const paramTrendData = useMemo(() => getParamTrendData(new Date()), []);

  const [selectedId, setSelectedId] = useState(warehouses.find(w => w.status !== 'inactive')?.id ?? warehouses[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');
  const [activeTab, setActiveTab] = useState<'zones' | 'floorplan' | 'trends'>('zones');

  const selectedWH = warehouses.find(w => w.id === selectedId) ?? warehouses[0];
  const activeCount = warehouses.filter(w => w.status !== 'inactive').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Realtime Monitor</Text>
          <Text style={styles.headerSub}>Live sensor data across all warehouses</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
          <LiveClock />
        </View>
      </View>

      {/* WH Selector */}
      <View style={styles.selectorBg}>
        <WHSelector warehouses={warehouses} selectedId={selectedId} onSelect={setSelectedId} />
        {/* Time range */}
        <View style={styles.timeRangeRow}>
          {(['1h', '6h', '24h'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.timeBtn, timeRange === t && styles.timeBtnActive]} onPress={() => setTimeRange(t)}>
              <Text style={[styles.timeBtnText, timeRange === t && styles.timeBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Selected warehouse overview */}
        <View style={styles.whOverview}>
          <View style={styles.whOverviewLeft}>
            <Text style={styles.whId}>{selectedId}</Text>
            <Text style={styles.whName}>{selectedWH.name}</Text>
            {selectedWH.lastUpdate && <Text style={styles.whLastUpdate}>Updated: {selectedWH.lastUpdate}</Text>}
          </View>
          <View style={[styles.whStatusBadge, {backgroundColor: STATUS_CFG[selectedWH.status].badge}]}>
            <View style={[styles.whDotLg, {backgroundColor: STATUS_CFG[selectedWH.status].dot}]} />
            <Text style={[styles.whStatusText, {color: STATUS_CFG[selectedWH.status].badgeText}]}>
              {STATUS_CFG[selectedWH.status].label}
            </Text>
          </View>
        </View>

        {/* Metric strip */}
        <MetricStrip wh={selectedWH} />

        {/* View mode selector */}
        <View style={styles.viewModeRow}>
          <Text style={styles.viewModeLabel}>View:</Text>
          {(['status', 'temp', 'humidity'] as ViewMode[]).map(m => (
            <TouchableOpacity key={m} style={[styles.modeBtn, viewMode === m && styles.modeBtnActive]} onPress={() => setViewMode(m)}>
              <Text style={[styles.modeBtnText, viewMode === m && styles.modeBtnTextActive]}>
                {m === 'status' ? 'Status' : m === 'temp' ? 'Temp' : 'Humidity'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View mode legend */}
        <View style={styles.legendRow}>
          {viewMode === 'status' && (
            <>
              {[{color: '#22c55e', label: 'Good'}, {color: '#f59e0b', label: 'Warning'}, {color: '#ef4444', label: 'Critical'}].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: l.color}]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </>
          )}
          {viewMode === 'temp' && (
            <>
              {[{color: '#22c55e', label: `<${T.temp.safe}°C Safe`}, {color: '#f59e0b', label: `${T.temp.safe}–${T.temp.warn}°C`}, {color: '#ef4444', label: `≥${T.temp.warn}°C Critical`}].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: l.color}]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </>
          )}
          {viewMode === 'humidity' && (
            <>
              {[{color: '#22c55e', label: `<${T.humidity.safe}% Safe`}, {color: '#f59e0b', label: `${T.humidity.safe}–${T.humidity.warn}%`}, {color: '#ef4444', label: `≥${T.humidity.warn}% Critical`}].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: l.color}]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Content tabs */}
        <View style={styles.contentTabRow}>
          {(['zones', 'floorplan', 'trends'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.contentTab, activeTab === t && styles.contentTabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[styles.contentTabText, activeTab === t && styles.contentTabTextActive]}>
                {t === 'zones' ? 'Zone Status' : t === 'floorplan' ? 'Floor Plan' : 'Trends'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {activeTab === 'zones' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Zone Readings — {selectedId}</Text>
              <Text style={styles.cardSub}>Real-time sensor data per zone</Text>
              <ZoneReadings wh={selectedWH} />
            </View>
          )}

          {activeTab === 'floorplan' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Floor Plan — {selectedId}</Text>
              <Text style={styles.cardSub}>Zone layout with {viewMode} overlay</Text>
              <WarehouseFloorPlan warehouses={warehouses} selectedId={selectedId} viewMode={viewMode} />
            </View>
          )}

          {activeTab === 'trends' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parameter Trends</Text>
              <Text style={styles.cardSub}>24h sensor readings as % of threshold</Text>
              <View style={styles.chartWrap}>
                <ParamTrendsChart data={paramTrendData} />
              </View>
            </View>
          )}
        </View>

        {/* System summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>System Summary</Text>
          <View style={styles.summaryGrid}>
            {[
              {label: 'Total Units', value: warehouses.length, color: C.textPrimary},
              {label: 'Online', value: activeCount, color: '#15803d'},
              {label: 'Offline', value: warehouses.length - activeCount, color: '#9ca3af'},
              {label: 'Critical', value: warehouses.filter(w => w.status === 'high').length, color: '#b91c1c'},
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8},
  headerTitle: {fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5},
  headerSub: {fontSize: 12, color: C.textMuted, marginTop: 2},
  liveIndicator: {flexDirection: 'row', alignItems: 'center', gap: 4},
  liveDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e'},
  liveText: {fontSize: 11, fontWeight: '700', color: '#15803d'},
  clockText: {fontSize: 11, color: C.textMuted, fontWeight: '600'},
  selectorBg: {backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border},
  timeRangeRow: {flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingBottom: 10},
  timeBtn: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f3f4f6'},
  timeBtnActive: {backgroundColor: C.primary},
  timeBtnText: {fontSize: 12, fontWeight: '600', color: C.textMuted},
  timeBtnTextActive: {color: '#fff'},
  whSelector: {flexDirection: 'row'},
  whBtn: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f3f4f6'},
  whBtnSelected: {backgroundColor: C.primary},
  whBtnOffline: {opacity: 0.4},
  whBtnText: {fontSize: 12, fontWeight: '700', color: C.textSecondary},
  whBtnTextSelected: {color: '#fff'},
  whBtnTextOffline: {color: C.textMuted},
  whDot: {width: 6, height: 6, borderRadius: 3},
  whOverview: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12},
  whOverviewLeft: {},
  whId: {fontSize: 18, fontWeight: '800', color: C.textPrimary},
  whName: {fontSize: 13, color: C.textSecondary},
  whLastUpdate: {fontSize: 11, color: C.textMuted, marginTop: 2},
  whStatusBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20},
  whDotLg: {width: 8, height: 8, borderRadius: 4},
  whStatusText: {fontSize: 13, fontWeight: '700'},
  metricStrip: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  metricCard: {alignItems: 'center', backgroundColor: C.white, borderRadius: 12, padding: 12, minWidth: 72, borderWidth: 1, borderColor: C.border},
  metricIcon: {marginBottom: 4},
  metricValue: {fontSize: 16, fontWeight: '800', letterSpacing: -0.5},
  metricLabel: {fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2},
  viewModeRow: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 8},
  viewModeLabel: {fontSize: 12, color: C.textMuted, fontWeight: '600'},
  modeBtn: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f3f4f6'},
  modeBtnActive: {backgroundColor: C.primary},
  modeBtnText: {fontSize: 12, fontWeight: '600', color: C.textSecondary},
  modeBtnTextActive: {color: '#fff'},
  legendRow: {flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 12, flexWrap: 'wrap'},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendText: {fontSize: 11, color: C.textSecondary},
  contentTabRow: {flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e5e7eb', borderRadius: 10, padding: 3},
  contentTab: {flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center'},
  contentTabActive: {backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  contentTabText: {fontSize: 12, fontWeight: '600', color: C.textMuted},
  contentTabTextActive: {color: C.textPrimary, fontWeight: '700'},
  contentArea: {paddingHorizontal: 16, marginBottom: 12},
  card: {backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border},
  cardTitle: {fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 2},
  cardSub: {fontSize: 11, color: C.textMuted, marginBottom: 12},
  zoneTable: {borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border},
  zoneHeaderRow: {flexDirection: 'row', backgroundColor: '#f9fafb', paddingVertical: 8},
  zoneRow: {flexDirection: 'row', paddingVertical: 10, alignItems: 'center'},
  zoneRowAlt: {backgroundColor: '#fafafa'},
  zoneCell: {flex: 1, fontSize: 12, color: C.textSecondary, paddingHorizontal: 8},
  zoneHeader: {fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase'},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8},
  statusBadgeText: {fontSize: 10, fontWeight: '700'},
  emptyZone: {alignItems: 'center', paddingVertical: 24},
  emptyZoneText: {fontSize: 13, color: C.textMuted},
  floorOffline: {alignItems: 'center', paddingVertical: 40, backgroundColor: '#f9fafb', borderRadius: 12},
  floorOfflineText: {fontSize: 13, color: C.textMuted},
  chartWrap: {alignItems: 'center'},
  chartLegend: {flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 8},
  summaryCard: {marginHorizontal: 16, backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border},
  summaryTitle: {fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 12},
  summaryGrid: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {alignItems: 'center'},
  summaryVal: {fontSize: 22, fontWeight: '800', letterSpacing: -0.5},
  summaryLabel: {fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 2},
});
