import React, {useMemo, useState} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Line, Path, Polyline, Rect} from 'react-native-svg';
import {type Alert, type AlertSeverity, type AlertStatus, type AlertParamType} from '../../lib/dataEngine';
import {useLiveData} from '../../contexts/LiveDataContext';
import {useAuth} from '../../app/AuthProvider';
import {setAlertStatus, resolveAlert} from '../../lib/firestoreService';
import type {LiveAlert} from '../../lib/accountDb';

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

const SEV_CFG: Record<AlertSeverity, {bar: string; bg: string; badge: string; badgeText: string; dot: string; label: string; rowBg: string}> = {
  critical: {bar: '#ef4444', bg: '#fef2f2', badge: '#fee2e2', badgeText: '#b91c1c', dot: '#ef4444', label: 'Critical', rowBg: '#fef2f2'},
  high:     {bar: '#f97316', bg: '#fff7ed', badge: '#ffedd5', badgeText: '#c2410c', dot: '#f97316', label: 'High',     rowBg: '#fff7ed'},
  medium:   {bar: '#f59e0b', bg: '#fffbeb', badge: '#fef3c7', badgeText: '#b45309', dot: '#f59e0b', label: 'Medium',   rowBg: '#fffbeb'},
  low:      {bar: '#3b82f6', bg: '#eff6ff', badge: '#dbeafe', badgeText: '#1d4ed8', dot: '#3b82f6', label: 'Low',      rowBg: '#eff6ff'},
  info:     {bar: '#9ca3af', bg: '#f9fafb', badge: '#f3f4f6', badgeText: '#4b5563', dot: '#9ca3af', label: 'Info',     rowBg: '#f9fafb'},
};

const STATUS_CFG: Record<AlertStatus, {label: string; bg: string; text: string; dot: string}> = {
  active:       {label: 'Active',       bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444'},
  acknowledged: {label: 'Acknowledged', bg: '#fef3c7', text: '#b45309', dot: '#f59e0b'},
  resolved:     {label: 'Resolved',     bg: '#dcfce7', text: '#15803d', dot: '#22c55e'},
  muted:        {label: 'Muted',        bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af'},
};

const TYPE_FILTERS: {label: string; value: AlertParamType | 'all'}[] = [
  {label: 'All', value: 'all'},
  {label: 'Temp', value: 'temperature'},
  {label: 'Humidity', value: 'humidity'},
  {label: 'Moisture', value: 'moisture'},
  {label: 'CO₂', value: 'co2'},
  {label: 'AQI', value: 'aqi'},
  {label: 'System', value: 'system'},
];

const SEV_FILTERS: {label: string; value: AlertSeverity | 'all'}[] = [
  {label: 'All', value: 'all'},
  {label: 'Critical', value: 'critical'},
  {label: 'High', value: 'high'},
  {label: 'Medium', value: 'medium'},
  {label: 'Low', value: 'low'},
  {label: 'Info', value: 'info'},
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function BellIcon({size = 18, color = C.primary}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FilterIcon({size = 16, color = C.primary}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDown({size = 14, color = C.textMuted}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="6 9 12 15 18 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({size = 14, color = C.textMuted}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({size = 14, color = '#fff'}: {size?: number; color?: string}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({data}: {data: {Critical: number; Warning: number; Info: number}[]}) {
  const maxVal = Math.max(...data.map(d => d.Critical + d.Warning + d.Info), 1);
  const W = 280; const H = 80;
  const barW = Math.floor(W / data.length) - 3;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((d, i) => {
        const x = i * (W / data.length);
        const critH = Math.round((d.Critical / maxVal) * (H - 20));
        const warnH = Math.round((d.Warning / maxVal) * (H - 20));
        const infoH = Math.round((d.Info / maxVal) * (H - 20));
        return (
          <React.Fragment key={i}>
            {d.Critical > 0 && <Rect x={x + 1} y={H - 16 - critH - warnH - infoH} width={barW} height={critH} fill="#ef4444" rx="1" />}
            {d.Warning > 0 && <Rect x={x + 1} y={H - 16 - warnH - infoH} width={barW} height={warnH} fill="#f59e0b" rx="1" />}
            {d.Info > 0 && <Rect x={x + 1} y={H - 16 - infoH} width={barW} height={infoH} fill="#9ca3af" rx="1" />}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_BLOCKS = ['00', '03', '06', '09', '12', '15', '18', '21'];

function heatColor(val: number): string {
  if (val === 0) return '#f3f4f6';
  if (val <= 2) return '#fef3c7';
  if (val <= 4) return '#fde68a';
  if (val <= 6) return '#fca5a5';
  return '#f87171';
}

// ─── Alert detail modal ───────────────────────────────────────────────────────

function AlertDetailModal({alert, onClose, onAcknowledge}: {
  alert: Alert; onClose: () => void; onAcknowledge: (id: string) => void;
}) {
  const sev = SEV_CFG[alert.severity];
  const sta = STATUS_CFG[alert.status];
  const [acked, setAcked] = useState(false);

  function handleAck() {
    setAcked(true);
    onAcknowledge(alert.id);
    setTimeout(onClose, 800);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalPanel} onPress={() => {}}>
          <View style={[styles.modalAccent, {backgroundColor: sev.bar}]} />
          <View style={[styles.modalHeader, {backgroundColor: sev.bg}]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.sevBadge, {backgroundColor: sev.badge}]}>
                <View style={[styles.dot, {backgroundColor: sev.dot}]} />
                <Text style={[styles.sevBadgeText, {color: sev.badgeText}]}>{sev.label} Priority</Text>
              </View>
              <Text style={styles.modalTitle}>{alert.title}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <CloseIcon />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.metaRow}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>LOCATION</Text>
                <Text style={styles.metaValue}>{alert.warehouse} · {alert.zone}</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>DETECTED</Text>
                <Text style={styles.metaValue}>{alert.time}</Text>
              </View>
            </View>
            <View style={[styles.readingBox, {backgroundColor: sev.bg, borderColor: sev.bar + '40'}]}>
              <View>
                <Text style={styles.metaLabel}>SAFE THRESHOLD</Text>
                <Text style={styles.thresholdVal}>{alert.threshold}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.metaLabel}>CURRENT READING</Text>
                <Text style={[styles.currentVal, {color: sev.badgeText}]}>{alert.value}</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.metaLabel}>STATUS</Text>
              <View style={[styles.statusBadge, {backgroundColor: sta.bg}]}>
                <View style={[styles.dot, {backgroundColor: sta.dot}]} />
                <Text style={[styles.statusText, {color: sta.text}]}>{sta.label}</Text>
              </View>
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.metaLabel}>PARAMETER</Text>
              <Text style={styles.paramText}>{alert.parameter}</Text>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            {acked ? (
              <View style={styles.ackedBtn}>
                <CheckIcon color="#15803d" />
                <Text style={styles.ackedText}>Acknowledged</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: sev.bar}]} onPress={handleAck}>
                <CheckIcon />
                <Text style={styles.actionBtnText}>Acknowledge</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={onClose}>
              <Text style={styles.actionBtnSecondaryText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({alert, onPress}: {alert: Alert; onPress: () => void}) {
  const sev = SEV_CFG[alert.severity];
  const sta = STATUS_CFG[alert.status];
  return (
    <TouchableOpacity style={[styles.alertRow, {backgroundColor: sev.rowBg}]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.alertBar, {backgroundColor: sev.bar}]} />
      <View style={styles.alertContent}>
        <View style={styles.alertTopRow}>
          <View style={styles.alertBadges}>
            <View style={[styles.smallBadge, {backgroundColor: sev.badge}]}>
              <View style={[styles.dot, {backgroundColor: sev.dot}]} />
              <Text style={[styles.smallBadgeText, {color: sev.badgeText}]}>{sev.label}</Text>
            </View>
            <View style={[styles.smallBadge, {backgroundColor: sta.bg}]}>
              <Text style={[styles.smallBadgeText, {color: sta.text}]}>{sta.label}</Text>
            </View>
          </View>
          <Text style={styles.alertTime}>{alert.time}</Text>
        </View>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertMeta}>{alert.warehouse} · {alert.zone} · {alert.parameter}</Text>
        <View style={styles.alertThreshRow}>
          <Text style={styles.alertThreshLabel}>Threshold: <Text style={styles.alertThreshVal}>{alert.threshold}</Text></Text>
          <Text style={[styles.alertCurrVal, {color: sev.badgeText}]}>{alert.value}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function liveAlertToAlert(a: LiveAlert): Alert {
  const sevMap: Record<string, AlertSeverity> = {critical: 'critical', high: 'high', medium: 'medium', low: 'low', info: 'info'};
  const typeMap: Record<string, AlertParamType> = {
    temperature: 'temperature', humidity: 'humidity', moisture: 'moisture',
    co2: 'co2', aqi: 'aqi', capacity: 'capacity',
  };
  return {
    id: a.id,
    severity: sevMap[a.severity] ?? 'medium',
    title: a.message,
    warehouse: a.warehouseId,
    zone: '—',
    parameter: a.param,
    value: `${a.value}${a.unit}`,
    threshold: `${a.threshold}${a.unit}`,
    time: new Date(a.timestamp).toLocaleString('en-US', {hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'}),
    status: (a.status ?? 'active') as AlertStatus,
    type: (typeMap[a.param] ?? 'system') as AlertParamType,
  };
}

export default function AlertsScreen() {
  const {user} = useAuth();
  const {alerts: liveAlerts, alertHistory, sensorHistory} = useLiveData();

  // Combine active + history into one list, map to Alert shape
  const allAlerts = useMemo(() => {
    const active  = liveAlerts.map(liveAlertToAlert);
    const history = alertHistory.map(liveAlertToAlert);
    const seen    = new Set(active.map(a => a.id));
    return [...active, ...history.filter(a => !seen.has(a.id))];
  }, [liveAlerts, alertHistory]);

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [sevFilter, setSevFilter] = useState<AlertSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AlertParamType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<'list' | 'trends' | 'heatmap'>('list');

  const filtered = useMemo(() => {
    return allAlerts.filter(a => {
      if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [allAlerts, sevFilter, typeFilter, statusFilter]);

  function handleAcknowledge(id: string) {
    setAcknowledgedIds(prev => new Set([...prev, id]));
    if (user?.uid) setAlertStatus(user.uid, id, 'acknowledged').catch(() => undefined);
  }

  function handleResolve(id: string) {
    if (user?.uid) resolveAlert(user.uid, id).catch(() => undefined);
  }

  const summary = useMemo(() => ({
    total:    allAlerts.length,
    critical: allAlerts.filter(a => a.severity === 'critical').length,
    warning:  allAlerts.filter(a => a.severity === 'high' || a.severity === 'medium').length,
    info:     allAlerts.filter(a => a.severity === 'low' || a.severity === 'info').length,
    resolved: allAlerts.filter(a => a.status === 'resolved').length,
  }), [allAlerts]);

  const {trendData, heatmapData} = useMemo(() => {
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function dayLabel(d: Date) { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
    function addDays(d: Date, n: number) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
    const today = new Date();

    const trend = sensorHistory.length > 0
      ? sensorHistory.slice(0, 7).reverse().map(h => ({
          day:      dayLabel(new Date(h.date + 'T00:00:00')),
          Critical: h.alertCounts?.critical ?? 0,
          Warning:  (h.alertCounts?.high ?? 0) + (h.alertCounts?.medium ?? 0),
          Info:     h.alertCounts?.total ? Math.max(0, h.alertCounts.total - (h.alertCounts.critical ?? 0) - (h.alertCounts.high ?? 0) - (h.alertCounts.medium ?? 0)) : 0,
        }))
      : Array.from({length: 7}, (_, i) => ({day: dayLabel(addDays(today, i - 6)), Critical: 0, Warning: 2, Info: 8}));

    const hmap: number[][] = Array.from({length: 7}, (_, di) => {
      const h = sensorHistory[di];
      const warehouseStatus = h?.warehouseStatus;
      const stress = warehouseStatus ? (warehouseStatus.critical * 3 + warehouseStatus.warning) : 1;
      return Array.from({length: 8}, (_, ti) => Math.max(0, Math.round(stress * (ti >= 2 && ti <= 5 ? 2 : 0.5))));
    });

    return {trendData: trend, heatmapData: hmap};
  }, [sensorHistory]);

  const alertsByType = useMemo(() => {
    const typeMap: Record<string, number> = {};
    allAlerts.forEach(a => { typeMap[a.type] = (typeMap[a.type] ?? 0) + 1; });
    return [
      {label: 'Temperature', count: typeMap.temperature ?? 0, color: '#f59e0b'},
      {label: 'Humidity',    count: typeMap.humidity ?? 0,    color: '#3b82f6'},
      {label: 'Moisture',    count: typeMap.moisture ?? 0,    color: '#10b981'},
      {label: 'CO₂',         count: typeMap.co2 ?? 0,         color: '#8b5cf6'},
      {label: 'AQI',         count: typeMap.aqi ?? 0,         color: '#ef4444'},
      {label: 'Capacity',    count: typeMap.capacity ?? 0,    color: '#f97316'},
      {label: 'System',      count: typeMap.system ?? 0,      color: '#9ca3af'},
    ].filter(t => t.count > 0);
  }, [allAlerts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={handleAcknowledge}
        />
      )}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerSub}>Monitor and manage system alerts</Text>
          </View>
          <View style={[styles.headerBadge, {backgroundColor: summary.critical > 0 ? '#ef4444' : '#9ca3af'}]}>
            <Text style={styles.headerBadgeText}>{summary.total}</Text>
          </View>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          {[
            {label: 'Total',    value: summary.total,    bg: '#eff6ff', text: '#1d4ed8'},
            {label: 'Critical', value: summary.critical, bg: '#fee2e2', text: '#b91c1c'},
            {label: 'Warning',  value: summary.warning,  bg: '#fef3c7', text: '#b45309'},
            {label: 'Resolved', value: summary.resolved, bg: '#dcfce7', text: '#15803d'},
          ].map(s => (
            <View key={s.label} style={[styles.summaryCard, {backgroundColor: s.bg}]}>
              <Text style={[styles.summaryVal, {color: s.text}]}>{s.value}</Text>
              <Text style={[styles.summaryLabel, {color: s.text}]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['list', 'trends', 'heatmap'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'list' ? 'Alert List' : t === 'trends' ? 'Trends' : 'Heatmap'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'list' && (
          <>
            {/* Filters */}
            <View style={styles.filtersSection}>
              <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(v => !v)}>
                <FilterIcon size={15} color={C.primary} />
                <Text style={styles.filterToggleText}>Filters</Text>
                <ChevronDown />
              </TouchableOpacity>
              {showFilters && (
                <View style={styles.filtersPanel}>
                  <Text style={styles.filterGroupLabel}>SEVERITY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{flexDirection: 'row', gap: 6, marginBottom: 10}}>
                      {SEV_FILTERS.map(f => (
                        <TouchableOpacity key={f.value} style={[styles.filterChip, sevFilter === f.value && styles.filterChipActive]} onPress={() => setSevFilter(f.value)}>
                          <Text style={[styles.filterChipText, sevFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>TYPE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{flexDirection: 'row', gap: 6, marginBottom: 10}}>
                      {TYPE_FILTERS.map(f => (
                        <TouchableOpacity key={f.value} style={[styles.filterChip, typeFilter === f.value && styles.filterChipActive]} onPress={() => setTypeFilter(f.value)}>
                          <Text style={[styles.filterChipText, typeFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>STATUS</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                    {(['all', 'active', 'acknowledged', 'resolved', 'muted'] as const).map(s => (
                      <TouchableOpacity key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
                        <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                          {s === 'all' ? 'All' : STATUS_CFG[s].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Text style={styles.resultCount}>{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</Text>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <BellIcon size={32} color={C.textMuted} />
                  <Text style={styles.emptyText}>No alerts match your filters</Text>
                </View>
              ) : (
                filtered.map(a => <AlertRow key={a.id} alert={a} onPress={() => setSelectedAlert(a)} />)
              )}
            </View>
          </>
        )}

        {tab === 'trends' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alert Trends — Last 7 Days</Text>
            <Text style={styles.cardSub}>Critical · Warning · Info alerts per day</Text>
            <View style={styles.chartWrap}>
              <MiniBarChart data={trendData} />
            </View>
            <View style={styles.legendRow}>
              {[{color: '#ef4444', label: 'Critical'}, {color: '#f59e0b', label: 'Warning'}, {color: '#9ca3af', label: 'Info'}].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: l.color}]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.dayLabels}>
              {trendData.map(d => <Text key={d.day} style={styles.dayLabel}>{d.day}</Text>)}
            </View>
            <Text style={[styles.cardTitle, {marginTop: 20}]}>By Parameter Type</Text>
            {alertsByType.map(t => (
              <View key={t.label} style={styles.typeRow}>
                <View style={[styles.typeDot, {backgroundColor: t.color}]} />
                <Text style={styles.typeLabel}>{t.label}</Text>
                <View style={styles.typeBarWrap}>
                  <View style={[styles.typeBar, {backgroundColor: t.color, width: `${Math.round(t.count / Math.max(summary.total, 1) * 100)}%` as any}]} />
                </View>
                <Text style={styles.typeCount}>{t.count}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'heatmap' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alert Activity Heatmap</Text>
            <Text style={styles.cardSub}>Alert frequency by time of day — last 7 days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.heatmapTimeRow}>
                  <View style={{width: 36}} />
                  {HEATMAP_BLOCKS.map(b => <Text key={b} style={styles.heatmapTimeLabel}>{b}h</Text>)}
                </View>
                {heatmapData.map((row, di) => (
                  <View key={di} style={styles.heatmapRow}>
                    <Text style={styles.heatmapDayLabel}>{HEATMAP_DAYS[di]}</Text>
                    {row.map((val, ti) => (
                      <View key={ti} style={[styles.heatCell, {backgroundColor: heatColor(val)}]}>
                        {val > 0 && <Text style={styles.heatCellText}>{val}</Text>}
                      </View>
                    ))}
                  </View>
                ))}
                <View style={styles.heatLegend}>
                  <Text style={styles.heatLegendLabel}>Low</Text>
                  {['#f3f4f6', '#fef3c7', '#fde68a', '#fca5a5', '#f87171'].map((c, i) => (
                    <View key={i} style={[styles.heatLegendCell, {backgroundColor: c}]} />
                  ))}
                  <Text style={styles.heatLegendLabel}>High</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12},
  headerTitle: {fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5},
  headerSub: {fontSize: 12, color: C.textMuted, marginTop: 2},
  headerBadge: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  headerBadgeText: {fontSize: 12, fontWeight: '800', color: '#fff'},
  summaryRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12},
  summaryCard: {flex: 1, borderRadius: 12, padding: 10, alignItems: 'center'},
  summaryVal: {fontSize: 20, fontWeight: '800', letterSpacing: -0.5},
  summaryLabel: {fontSize: 10, fontWeight: '700', marginTop: 2},
  tabRow: {flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e5e7eb', borderRadius: 10, padding: 3},
  tabBtn: {flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center'},
  tabBtnActive: {backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  tabBtnText: {fontSize: 12, fontWeight: '600', color: C.textMuted},
  tabBtnTextActive: {color: C.textPrimary, fontWeight: '700'},
  filtersSection: {paddingHorizontal: 16, marginBottom: 8},
  filterToggle: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
  filterToggleText: {fontSize: 13, fontWeight: '700', color: C.primary},
  filtersPanel: {backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border},
  filterGroupLabel: {fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: 6},
  filterChip: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f3f4f6'},
  filterChipActive: {backgroundColor: C.primary},
  filterChipText: {fontSize: 12, fontWeight: '600', color: C.textSecondary},
  filterChipTextActive: {color: '#fff'},
  resultCount: {fontSize: 12, color: C.textMuted, fontWeight: '600'},
  listContainer: {paddingHorizontal: 16, gap: 8},
  alertRow: {flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 8},
  alertBar: {width: 4},
  alertContent: {flex: 1, padding: 12},
  alertTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  alertBadges: {flexDirection: 'row', gap: 6},
  smallBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20},
  smallBadgeText: {fontSize: 10, fontWeight: '700'},
  alertTime: {fontSize: 11, color: C.textMuted, fontWeight: '500'},
  alertTitle: {fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2},
  alertMeta: {fontSize: 11, color: C.textMuted, marginBottom: 8},
  alertThreshRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6},
  alertThreshLabel: {fontSize: 11, color: C.textMuted},
  alertThreshVal: {fontWeight: '600', color: C.textSecondary},
  alertCurrVal: {fontSize: 14, fontWeight: '800'},
  card: {marginHorizontal: 16, marginBottom: 12, backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border},
  cardTitle: {fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 2},
  cardSub: {fontSize: 11, color: C.textMuted, marginBottom: 12},
  chartWrap: {alignItems: 'center', marginBottom: 8},
  legendRow: {flexDirection: 'row', gap: 12, marginBottom: 4},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendText: {fontSize: 11, color: C.textSecondary, fontWeight: '600'},
  dayLabels: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16},
  dayLabel: {fontSize: 10, color: C.textMuted},
  typeRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
  typeDot: {width: 8, height: 8, borderRadius: 4},
  typeLabel: {fontSize: 12, color: C.textSecondary, width: 80},
  typeBarWrap: {flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden'},
  typeBar: {height: 6, borderRadius: 3},
  typeCount: {fontSize: 12, fontWeight: '700', color: C.textPrimary, width: 24, textAlign: 'right'},
  heatmapTimeRow: {flexDirection: 'row', marginBottom: 4, alignItems: 'center'},
  heatmapTimeLabel: {width: 36, fontSize: 9, color: C.textMuted, textAlign: 'center'},
  heatmapRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 3},
  heatmapDayLabel: {width: 36, fontSize: 10, color: C.textMuted, fontWeight: '600'},
  heatCell: {width: 36, height: 22, borderRadius: 4, marginRight: 2, alignItems: 'center', justifyContent: 'center'},
  heatCellText: {fontSize: 9, fontWeight: '700', color: '#4b5563'},
  heatLegend: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10},
  heatLegendLabel: {fontSize: 10, color: C.textMuted},
  heatLegendCell: {width: 20, height: 14, borderRadius: 3},
  emptyState: {alignItems: 'center', paddingVertical: 40, gap: 12},
  emptyText: {fontSize: 14, color: C.textMuted, fontWeight: '600'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16},
  modalPanel: {width: '100%', maxWidth: 420, backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', maxHeight: '90%'},
  modalAccent: {height: 4, width: '100%'},
  modalHeader: {padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  modalHeaderLeft: {flex: 1},
  modalTitle: {fontSize: 16, fontWeight: '800', color: C.textPrimary, marginTop: 6, lineHeight: 22},
  closeBtn: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginLeft: 8},
  sevBadge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start'},
  sevBadgeText: {fontSize: 11, fontWeight: '700'},
  modalBody: {padding: 16, maxHeight: 280},
  metaRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  metaBox: {flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12},
  metaLabel: {fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginBottom: 4},
  metaValue: {fontSize: 13, fontWeight: '700', color: C.textPrimary},
  readingBox: {borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  thresholdVal: {fontSize: 14, fontWeight: '700', color: C.textSecondary},
  currentVal: {fontSize: 22, fontWeight: '800'},
  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  statusBadge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20},
  statusText: {fontSize: 12, fontWeight: '700'},
  paramRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  paramText: {fontSize: 13, fontWeight: '700', color: C.textPrimary},
  modalActions: {flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.border},
  actionBtn: {flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  actionBtnText: {fontSize: 13, fontWeight: '800', color: '#fff'},
  actionBtnSecondary: {flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(31,81,53,0.08)', alignItems: 'center', justifyContent: 'center'},
  actionBtnSecondaryText: {fontSize: 13, fontWeight: '700', color: C.primary},
  ackedBtn: {flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  ackedText: {fontSize: 13, fontWeight: '700', color: '#15803d'},
  dot: {width: 7, height: 7, borderRadius: 4},
});
