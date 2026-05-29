import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Line, Path, Polyline, Rect} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

import {colors, fontWeight} from '../../theme/tokens';
import {useLiveData} from '../../contexts/LiveDataContext';
import {useAuth} from '../../app/AuthProvider';
import {setAlertStatus} from '../../lib/firestoreService';
import type {WHStatus, WarehouseReading} from '../../lib/accountDb';
import type {RootTabParamList} from '../../navigation/RootNavigator';

// ─── Local types ──────────────────────────────────────────────────────────────

interface DashAlert {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  location: string;
  time: string;
  value: string;
  threshold: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function useDashboard() {
  const {warehouseReadings, alerts: liveAlerts} = useLiveData();

  const dashAlerts: DashAlert[] = liveAlerts
    .filter(a => ['critical', 'high', 'medium'].includes(a.severity))
    .slice(0, 4)
    .map(a => ({
      id: a.id,
      severity: (a.severity === 'critical' ? 'high' : a.severity) as 'high' | 'medium',
      title: a.message,
      location: a.warehouseId,
      time: new Date(a.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}),
      value: `${a.value}${a.unit}`,
      threshold: `${a.threshold}${a.unit}`,
    }));

  const goodCount    = warehouseReadings.filter(w => w.status === 'good').length;
  const watchCount   = warehouseReadings.filter(w => w.status === 'medium').length;
  const criticalCount = warehouseReadings.filter(w => w.status === 'high').length;
  const offlineCount = warehouseReadings.filter(w => w.status === 'inactive').length;
  const activeCount  = warehouseReadings.filter(w => w.status !== 'inactive').length;

  return {warehouses: warehouseReadings, alerts: dashAlerts, goodCount, watchCount, criticalCount, offlineCount, activeCount};
}

// ─── Status configs ───────────────────────────────────────────────────────────

const statusCfg: Record<
  WHStatus,
  {barColor: string; tileBg: string; badgeBg: string; badgeText: string; label: string; valColor: string}
> = {
  good: {
    barColor: '#4ade80',
    tileBg: '#ffffff',
    badgeBg: '#f0fdf4',
    badgeText: '#15803d',
    label: 'Good',
    valColor: '#1f2937',
  },
  medium: {
    barColor: '#fbbf24',
    tileBg: '#fffbeb',
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    label: 'Watch',
    valColor: '#92400e',
  },
  high: {
    barColor: '#f87171',
    tileBg: '#fff5f5',
    badgeBg: '#fef2f2',
    badgeText: '#dc2626',
    label: 'Critical',
    valColor: '#dc2626',
  },
  inactive: {
    barColor: '#e5e7eb',
    tileBg: '#f9fafb',
    badgeBg: '#f3f4f6',
    badgeText: '#9ca3af',
    label: 'Offline',
    valColor: '#9ca3af',
  },
};

const alertCfg: Record<
  'high' | 'medium',
  {barColor: string; bg: string; badgeBg: string; badgeText: string; label: string; dotColor: string; valColor: string}
> = {
  high: {
    barColor: '#f87171',
    bg: '#fff5f5',
    badgeBg: '#fee2e2',
    badgeText: '#b91c1c',
    label: 'High',
    dotColor: '#f87171',
    valColor: '#dc2626',
  },
  medium: {
    barColor: '#fbbf24',
    bg: '#fffbeb',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    label: 'Medium',
    dotColor: '#fbbf24',
    valColor: '#b45309',
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartbeatIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SiloIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({color}: {color: string}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke="#15803d" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke="#6b7280" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke="#6b7280" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowRightIcon({color}: {color: string}) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Polyline points="12 5 19 12 12 19" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NoSignalIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#d1d5db" strokeWidth={1.5} />
      <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#d1d5db" strokeWidth={1.5} />
    </Svg>
  );
}

function EmailIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={4} width={20} height={16} rx={2} stroke="#059669" strokeWidth={2} />
      <Path d="M22 7L12 14L2 7" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Alert descriptions ───────────────────────────────────────────────────────

const alertDescriptions: Record<string, string> = {
  'High Temperature Detected':
    'Temperature has exceeded the critical threshold. Elevated heat accelerates grain respiration and may lead to rapid moisture loss or spoilage. Immediate ventilation or cooling is recommended.',
  'Temperature Elevated':
    'Temperature is above the safe storage range. Continued exposure may promote mold growth and reduce grain quality. Inspect the unit and adjust ventilation settings.',
  'Humidity Threshold Exceeded':
    'Relative humidity is critically high inside this unit. High moisture levels create ideal conditions for fungal growth and mycotoxin production. Check sealing and dehumidifiers.',
  'Humidity Warning':
    'Humidity is above the recommended storage level. Monitor grain moisture content and ensure proper aeration to prevent moisture migration.',
  'Moisture Level Rising':
    'Grain moisture content is rising above safe storage limits. High moisture increases risk of mold, heating, and spoilage. Consider drying or aeration treatment.',
};

function getAlertDescription(title: string): string {
  return (
    alertDescriptions[title] ??
    'This alert was triggered because a sensor reading exceeded the defined safety threshold for this storage unit. Review conditions and take corrective action.'
  );
}

// ─── Alert Detail Modal ───────────────────────────────────────────────────────

function AlertDetailModal({
  alert,
  onClose,
  onAcknowledge,
  onViewAlerts,
}: {
  alert: DashAlert;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onViewAlerts: () => void;
}) {
  const cfg = alertCfg[alert.severity];
  const isHigh = alert.severity === 'high';
  const [acknowledged, setAcknowledged] = useState(false);

  function handleAcknowledge() {
    setAcknowledged(true);
    onAcknowledge(alert.id);
    setTimeout(onClose, 800);
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalPanel} onPress={() => {}}>
          {/* Accent bar */}
          <View style={[styles.modalAccentBar, {backgroundColor: cfg.barColor}]} />

          {/* Header */}
          <View style={[styles.modalHeader, {backgroundColor: cfg.bg}]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.alertDot, {backgroundColor: cfg.dotColor}]} />
              <View style={styles.modalTitleWrap}>
                <View style={[styles.alertBadge, {backgroundColor: cfg.badgeBg}]}>
                  <Text style={[styles.alertBadgeText, {color: cfg.badgeText}]}>
                    {cfg.label} Priority
                  </Text>
                </View>
                <Text style={styles.modalTitle}>{alert.title}</Text>
              </View>
            </View>
            <Pressable style={styles.modalClose} onPress={onClose}>
              <CloseIcon />
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            {/* Meta row */}
            <View style={styles.metaRow}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue}>{alert.location}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Detected</Text>
                <Text style={styles.metaValue}>{alert.time}</Text>
              </View>
            </View>

            {/* Reading vs Threshold */}
            <View style={[styles.readingCard, {backgroundColor: cfg.bg, borderColor: isHigh ? '#fecaca' : '#fde68a'}]}>
              <View>
                <Text style={styles.readingLabel}>Safe Threshold</Text>
                <Text style={styles.readingThreshold}>{alert.threshold}</Text>
              </View>
              <View style={styles.readingRight}>
                <Text style={styles.readingLabel}>Current Reading</Text>
                <Text style={[styles.readingValue, {color: cfg.valColor}]}>{alert.value}</Text>
              </View>
            </View>

            {/* Description */}
            <View>
              <Text style={styles.detailsLabel}>Details</Text>
              <Text style={styles.detailsText}>{getAlertDescription(alert.title)}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            {acknowledged ? (
              <View style={styles.acknowledgedBtn}>
                <CheckIcon />
                <Text style={styles.acknowledgedText}>Acknowledged</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.ackBtn, {backgroundColor: isHigh ? '#ef4444' : '#f59e0b'}]}
                onPress={handleAcknowledge}>
                <CheckIcon />
                <Text style={styles.ackBtnText}>Acknowledge</Text>
              </Pressable>
            )}
            <Pressable
              style={({pressed}) => [styles.viewAlertsBtn, pressed ? {opacity: 0.75} : undefined]}
              onPress={() => { onClose(); onViewAlerts(); }}>
              <Text style={styles.viewAlertsBtnText}>View in Alerts</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Alert Item ───────────────────────────────────────────────────────────────

function AlertItem({alert, onPress}: {alert: DashAlert; onPress: () => void}) {
  const cfg = alertCfg[alert.severity];
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.alertItem, {backgroundColor: cfg.bg, opacity: pressed ? 0.9 : 1}]}>
      <View style={[styles.alertSideBar, {backgroundColor: cfg.barColor}]} />
      <View style={styles.alertContent}>
        {/* Top row */}
        <View style={styles.alertTopRow}>
          <View style={styles.alertTopLeft}>
            <View style={[styles.alertDot, {backgroundColor: cfg.dotColor}]} />
            <View style={[styles.alertBadge, {backgroundColor: cfg.badgeBg}]}>
              <Text style={[styles.alertBadgeText, {color: cfg.badgeText}]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={styles.alertTime}>{alert.time}</Text>
        </View>
        {/* Title */}
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertLocation}>{alert.location}</Text>
        {/* Threshold row */}
        <View style={styles.alertThresholdRow}>
          <Text style={styles.alertThresholdLabel}>
            Threshold: <Text style={styles.alertThresholdVal}>{alert.threshold}</Text>
          </Text>
          <Text style={[styles.alertCurrentVal, {color: cfg.valColor}]}>{alert.value}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon,
  accentColor,
  iconBg,
  valueColor,
  pillText,
  pillBg,
  pillTextColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  valueColor?: string;
  pillText?: string;
  pillBg?: string;
  pillTextColor?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccentBar, {backgroundColor: accentColor}]} />
      <View style={styles.metricInner}>
        <View style={styles.metricTop}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={[styles.metricValue, valueColor ? {color: valueColor} : undefined]}>
              {value}
            </Text>
          </View>
          <View style={[styles.metricIconWrap, {backgroundColor: iconBg}]}>{icon}</View>
        </View>
        <View style={styles.metricBottom}>
          <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text>
          {pillText && pillBg && pillTextColor && (
            <View style={[styles.pill, {backgroundColor: pillBg}]}>
              <Text style={[styles.pillText, {color: pillTextColor}]}>{pillText}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Warehouse Tile ───────────────────────────────────────────────────────────

function WarehouseTile({
  wh,
}: {
  wh: WarehouseReading;
}) {
  const cfg = statusCfg[wh.status];
  return (
    <View style={[styles.whTile, {backgroundColor: cfg.tileBg}]}>
      <View style={[styles.whTileBar, {backgroundColor: cfg.barColor}]} />
      <View style={styles.whTileInner}>
        <View style={styles.whTileHeader}>
          <Text style={styles.whTileId} numberOfLines={1}>{wh.name || wh.id}</Text>
          <View style={[styles.whBadge, {backgroundColor: cfg.badgeBg}]}>
            <Text style={[styles.whBadgeText, {color: cfg.badgeText}]}>{cfg.label}</Text>
          </View>
        </View>
        {wh.temp !== null ? (
          <View style={styles.whMetrics}>
            <View style={styles.whMetricRow}>
              <Text style={styles.whMetricKey}>Temp</Text>
              <Text style={[styles.whMetricVal, {color: cfg.valColor}]}>{wh.temp}°C</Text>
            </View>
            <View style={styles.whMetricRow}>
              <Text style={styles.whMetricKey}>Humidity</Text>
              <Text style={[styles.whMetricVal, {color: cfg.valColor}]}>{wh.humidity}%</Text>
            </View>
            <View style={styles.whMetricRow}>
              <Text style={styles.whMetricKey}>Moisture</Text>
              <Text style={[styles.whMetricVal, {color: '#374151'}]}>{wh.moisture}%</Text>
            </View>
          </View>
        ) : (
          <View style={styles.whNoSignal}>
            <NoSignalIcon />
            <Text style={styles.whNoSignalText}>No Signal</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const {warehouses, alerts: activeAlerts, goodCount, watchCount, criticalCount, offlineCount, activeCount} = useDashboard();
  const alertHigh = activeAlerts.filter(a => a.severity === 'high').length;
  const alertMedium = activeAlerts.filter(a => a.severity === 'medium').length;

  const {user} = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [selectedAlert, setSelectedAlert] = useState<DashAlert | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  function handleAcknowledge(id: string) {
    setAcknowledgedIds(prev => new Set([...prev, id]));
    if (user?.uid) {
      setAlertStatus(user.uid, id, 'acknowledged').catch(() => undefined);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Grain storage monitoring — at a glance</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Metric Cards ─────────────────────────────────────────────────── */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="System Health"
            value="Good"
            sub={`${activeCount} of ${warehouses.length} units active`}
            icon={<HeartbeatIcon color="#16a34a" />}
            accentColor="#4ade80"
            iconBg="#f0fdf4"
            valueColor="#16a34a"
            pillText="↑ Stable"
            pillBg="#f0fdf4"
            pillTextColor="#15803d"
          />
          <MetricCard
            label="Storage Units"
            value={String(warehouses.length)}
            sub={`${activeCount} Active · ${offlineCount} Offline`}
            icon={<SiloIcon color="#2563eb" />}
            accentColor="#60a5fa"
            iconBg="#eff6ff"
          />
          <MetricCard
            label="Active Alerts"
            value={String(activeAlerts.length)}
            sub={`${alertHigh} Critical · ${alertMedium} Medium`}
            icon={<BellIcon color="#ef4444" />}
            accentColor="#f87171"
            iconBg="#fef2f2"
            valueColor={activeAlerts.length > 0 ? '#ef4444' : undefined}
            pillText={alertHigh > 0 ? `${alertHigh} urgent` : undefined}
            pillBg={alertHigh > 0 ? '#fef2f2' : undefined}
            pillTextColor={alertHigh > 0 ? '#dc2626' : undefined}
          />
          <MetricCard
            label="Spoilage Risk"
            value={criticalCount > 0 ? 'Medium' : 'Low'}
            sub={`${criticalCount} unit${criticalCount !== 1 ? 's' : ''} above threshold`}
            icon={<ShieldIcon color={criticalCount > 0 ? '#d97706' : '#16a34a'} />}
            accentColor={criticalCount > 0 ? '#fbbf24' : '#4ade80'}
            iconBg={criticalCount > 0 ? '#fffbeb' : '#f0fdf4'}
            valueColor={criticalCount > 0 ? '#d97706' : '#16a34a'}
          />
        </View>

        {/* ── Storage Units ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Storage Units</Text>
              <Text style={styles.cardSubtitle}>Live status across all warehouses</Text>
            </View>
            <View style={styles.legendWrap}>
              {([
                {label: 'Good', color: '#4ade80'},
                {label: 'Watch', color: '#fbbf24'},
                {label: 'Critical', color: '#f87171'},
                {label: 'Offline', color: '#d1d5db'},
              ] as const).map(s => (
                <View key={s.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: s.color}]} />
                  <Text style={styles.legendText}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Warehouse tile grid */}
          <View style={styles.whGrid}>
            {warehouses.map(wh => (
              <View key={wh.id} style={styles.whTileWrap}>
                <WarehouseTile wh={wh} />
              </View>
            ))}
          </View>

          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            {[
              {count: goodCount, label: 'Good', color: '#4ade80'},
              {count: watchCount, label: 'Watch', color: '#fbbf24'},
              {count: criticalCount, label: 'Critical', color: '#f87171'},
              {count: offlineCount, label: 'Offline', color: '#d1d5db'},
            ].map(s => (
              <View key={s.label} style={styles.summaryItem}>
                <View style={[styles.summaryDot, {backgroundColor: s.color}]} />
                <Text style={styles.summaryCount}>{s.count}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Footer link */}
          <Pressable
            style={({pressed}) => [styles.footerBtn, pressed ? styles.footerBtnPressed : undefined]}
            onPress={() => navigation.navigate('Monitor')}>
            <Text style={styles.footerBtnText}>View Realtime Monitor</Text>
            <ArrowRightIcon color="#1f5135" />
          </Pressable>
        </View>

        {/* ── Active Alerts ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Active Alerts</Text>
              <Text style={styles.cardSubtitle}>{activeAlerts.length} alerts requiring attention</Text>
            </View>
            {alertHigh > 0 && (
              <View style={styles.alertBadgeCircle}>
                <Text style={styles.alertBadgeCircleText}>{activeAlerts.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.alertList}>
            {activeAlerts.length === 0 ? (
              <View style={styles.noAlerts}>
                <EmailIcon />
                <Text style={styles.noAlertsText}>No active alerts</Text>
              </View>
            ) : (
              activeAlerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onPress={() => setSelectedAlert(alert)}
                />
              ))
            )}
          </View>

          <Pressable
            style={({pressed}) => [styles.footerBtn, pressed ? styles.footerBtnPressed : undefined]}
            onPress={() => navigation.navigate('Alerts')}>
            <Text style={styles.footerBtnText}>View All Alerts</Text>
            <ArrowRightIcon color="#1f5135" />
          </Pressable>
        </View>

      </ScrollView>

      {/* Alert detail modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={handleAcknowledge}
          onViewAlerts={() => navigation.navigate('Alerts')}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // ── Metric cards ────────────────────────────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 2,
  },
  metricAccentBar: {
    height: 3,
    width: '100%',
  },
  metricInner: {
    padding: 14,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  metricLeft: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    gap: 4,
  },
  metricSub: {
    fontSize: 10.5,
    color: '#64748b',
    flex: 1,
    lineHeight: 14,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    lineHeight: 12,
  },

  // ── Cards ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 1,
  },

  // ── Legend ────────────────────────────────────────────────────────────────
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 130,
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: fontWeight.semibold,
  },

  // ── Warehouse grid ────────────────────────────────────────────────────────
  whGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  whTileWrap: {
    width: '48%',
  },
  whTile: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  whTileBar: {
    height: 4,
    width: '100%',
  },
  whTileInner: {
    padding: 10,
  },
  whTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  whTileId: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  whBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  whBadgeText: {
    fontSize: 9.5,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },
  whMetrics: {
    gap: 4,
  },
  whMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whMetricKey: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: fontWeight.medium,
  },
  whMetricVal: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  whNoSignal: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  whNoSignalText: {
    fontSize: 9.5,
    color: '#d1d5db',
    fontWeight: fontWeight.semibold,
  },

  // ── Summary strip ─────────────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  summaryCount: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: '#374151',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: fontWeight.medium,
  },

  // ── Footer button ──────────────────────────────────────────────────────────
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    backgroundColor: 'rgba(31,81,53,0.07)',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  footerBtnPressed: {
    backgroundColor: 'rgba(31,81,53,0.12)',
  },
  footerBtnText: {
    fontSize: 12.5,
    fontWeight: fontWeight.semibold,
    color: '#1f5135',
  },

  // ── Alert badge circle ────────────────────────────────────────────────────
  alertBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeCircleText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },

  // ── Alert list ────────────────────────────────────────────────────────────
  alertList: {
    padding: 12,
    gap: 10,
  },
  alertItem: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  alertSideBar: {
    width: 3,
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  alertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },
  alertTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: fontWeight.medium,
  },
  alertTitle: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    color: '#1f2937',
    lineHeight: 17,
  },
  alertLocation: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 8,
  },
  alertThresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertThresholdLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  alertThresholdVal: {
    fontWeight: fontWeight.semibold,
    color: '#64748b',
  },
  alertCurrentVal: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },

  // ── No alerts ─────────────────────────────────────────────────────────────
  noAlerts: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noAlertsText: {
    fontSize: 13,
    color: '#94a3b8',
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 12},
    shadowRadius: 32,
    elevation: 12,
  },
  modalAccentBar: {
    height: 4,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  modalTitleWrap: {
    flex: 1,
    gap: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    lineHeight: 20,
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: '#1f2937',
  },
  readingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  readingLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  readingThreshold: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: '#374151',
  },
  readingRight: {
    alignItems: 'flex-end',
  },
  readingValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  detailsLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  ackBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ackBtnText: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  acknowledgedBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  acknowledgedText: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    color: '#15803d',
  },
  viewAlertsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(31,81,53,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAlertsBtnText: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    color: '#1f5135',
  },
});
