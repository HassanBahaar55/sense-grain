import React, {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Line, Path, Polyline, Rect, Text as SvgText} from 'react-native-svg';

import {
  type ReportItem,
  type ReportType,
} from '../../lib/dataEngine';
import {fontWeight} from '../../theme/tokens';
import {useLiveData} from '../../contexts/LiveDataContext';
import {useUser} from '../../contexts/UserContext';
import {useAuth} from '../../app/AuthProvider';
import {generateReport} from '../../lib/firestoreService';

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

const COLOR_KEY_MAP: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#8b5cf6',
  amber:  '#f59e0b',
};

const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  'environmental': '#1f5135',
  'compliance':    '#3b82f6',
  'performance':   '#f59e0b',
  'alert-summary': '#ef4444',
  'custom':        '#8b5cf6',
};

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'environmental': 'Environmental',
  'compliance':    'Compliance',
  'performance':   'Performance',
  'alert-summary': 'Alert Summary',
  'custom':        'Custom',
};

const STATUS_CFG = {
  ready:      {bg: '#dcfce7', text: '#16a34a', label: 'Ready'},
  processing: {bg: '#fef3c7', text: '#d97706', label: 'Processing'},
  scheduled:  {bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled'},
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function FileTextIcon({color, size = 16}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="14 2 14 8 20 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Polyline
        points="10 9 9 9 8 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DownloadIcon({color, size = 14}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="7 10 12 15 17 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({color, size = 16}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={2} />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

function UserIcon({color, size = 12}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function BarChartIcon({color, size = 20}: {color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  colorKey,
}: {
  label: string;
  value: number;
  delta: string;
  deltaPositive: boolean;
  colorKey: string;
}) {
  const accent = COLOR_KEY_MAP[colorKey] ?? C.primary;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statAccentBar, {backgroundColor: accent}]} />
      <View style={styles.statInner}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, {color: C.textPrimary}]}>{value}</Text>
        <View style={styles.statDeltaRow}>
          <Text style={[styles.statDelta, {color: deltaPositive ? '#16a34a' : '#d97706'}]}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </Text>
          <Text style={styles.statDeltaSub}>this period</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Report Type Horizontal Bar Chart ─────────────────────────────────────────

function ReportTypeChart({data}: {data: {label: string; count: number; color: string}[]}) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <View style={styles.typeChartWrap}>
      {data.map(item => (
        <View key={item.label} style={styles.typeChartRow}>
          <Text style={styles.typeChartLabel}>{item.label}</Text>
          <View style={styles.typeChartBarTrack}>
            <View
              style={[
                styles.typeChartBarFill,
                {
                  width: `${(item.count / maxCount) * 100}%` as any,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.typeChartCount}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Report Trend Dual Line Chart ─────────────────────────────────────────────

function ReportTrendChart({
  data,
}: {
  data: {day: string; Generated: number; Downloaded: number}[];
}) {
  const W = 320;
  const H = 130;
  const padL = 24;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = data.flatMap(d => [d.Generated, d.Downloaded]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals, 1);
  const range = maxV - minV || 1;

  function toX(i: number) {
    return padL + (i / (data.length - 1)) * chartW;
  }
  function toY(v: number) {
    return padT + chartH - ((v - minV) / range) * chartH;
  }

  const genPoints = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.Generated).toFixed(1)}`).join(' ');
  const dlPoints  = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.Downloaded).toFixed(1)}`).join(' ');

  return (
    <View style={styles.svgWrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => {
          const y = padT + chartH * (1 - f);
          return (
            <Line
              key={f}
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          );
        })}

        {/* Generated line (primary green) */}
        <Polyline
          points={genPoints}
          fill="none"
          stroke={C.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Downloaded line (blue) */}
        <Polyline
          points={dlPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots — Generated */}
        {data.map((d, i) => (
          <Circle
            key={`g${i}`}
            cx={toX(i)}
            cy={toY(d.Generated)}
            r={3}
            fill={C.primary}
          />
        ))}

        {/* Data point dots — Downloaded */}
        {data.map((d, i) => (
          <Circle
            key={`dl${i}`}
            cx={toX(i)}
            cy={toY(d.Downloaded)}
            r={3}
            fill="#3b82f6"
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <SvgText
            key={`lbl${i}`}
            x={toX(i)}
            y={H - 6}
            fontSize={9}
            textAnchor="middle"
            fill={C.textMuted}>
            {d.day}
          </SvgText>
        ))}

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
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: C.primary}]} />
          <Text style={styles.legendText}>Generated</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: '#3b82f6'}]} />
          <Text style={styles.legendText}>Downloaded</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Report Item Card ─────────────────────────────────────────────────────────

function ReportCard({report}: {report: ReportItem}) {
  const typeColor = REPORT_TYPE_COLORS[report.type];
  const typeLabel = REPORT_TYPE_LABELS[report.type];
  const statusCfg = STATUS_CFG[report.status];

  return (
    <View style={styles.reportCard}>
      {/* Left accent bar */}
      <View style={[styles.reportAccentBar, {backgroundColor: typeColor}]} />

      <View style={styles.reportInner}>
        {/* Top row */}
        <View style={styles.reportTopRow}>
          <View style={[styles.typeBadge, {backgroundColor: typeColor + '20'}]}>
            <Text style={[styles.typeBadgeText, {color: typeColor}]}>{typeLabel}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusCfg.bg}]}>
            <Text style={[styles.statusBadgeText, {color: statusCfg.text}]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Title + warehouse */}
        <Text style={styles.reportTitle} numberOfLines={1}>{report.title}</Text>
        <Text style={styles.reportWarehouse}>{report.warehouse} · {report.period}</Text>

        {/* Meta row */}
        <View style={styles.reportMetaRow}>
          <View style={styles.reportMetaItem}>
            <CalendarIcon color={C.textMuted} size={11} />
            <Text style={styles.reportMetaText}>{report.generatedAt}</Text>
          </View>
          <View style={styles.reportMetaItem}>
            <UserIcon color={C.textMuted} size={11} />
            <Text style={styles.reportMetaText}>{report.generatedBy}</Text>
          </View>
        </View>

        {/* Footer row */}
        <View style={styles.reportFooterRow}>
          <View style={styles.reportFooterLeft}>
            <Text style={styles.reportMeta}>{report.size}</Text>
            <Text style={styles.reportMetaSep}>·</Text>
            <Text style={styles.reportMeta}>{report.downloads} downloads</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              report.status !== 'ready' && styles.downloadBtnDisabled,
            ]}
            disabled={report.status !== 'ready'}
            activeOpacity={0.7}>
            <DownloadIcon color={report.status === 'ready' ? C.primary : C.textMuted} size={13} />
            <Text
              style={[
                styles.downloadBtnText,
                {color: report.status === 'ready' ? C.primary : C.textMuted},
              ]}>
              Download
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = [
  'environmental',
  'compliance',
  'performance',
  'alert-summary',
  'custom',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];

function ScheduleModal({onClose}: {onClose: () => void}) {
  const [selectedType, setSelectedType] = useState<ReportType>('environmental');
  const [selectedFreq, setSelectedFreq] = useState('Weekly');

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalPanel} onPress={() => {}}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Schedule New Report</Text>
              <Text style={styles.modalSubtitle}>Configure automated report generation</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={onClose}>
              <CloseIcon />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {/* Name field (static example) */}
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Report Name</Text>
              <View style={styles.modalFieldValue}>
                <Text style={styles.modalFieldValueText}>Weekly Environmental Summary</Text>
              </View>
            </View>

            {/* Type selector */}
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Report Type</Text>
              <View style={styles.typeSelector}>
                {REPORT_TYPES.map(t => {
                  const selected = selectedType === t;
                  const color = REPORT_TYPE_COLORS[t];
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeSelectorBtn,
                        selected && {backgroundColor: color, borderColor: color},
                      ]}
                      onPress={() => setSelectedType(t)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.typeSelectorBtnText,
                          selected && {color: '#ffffff'},
                        ]}>
                        {REPORT_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Frequency */}
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Frequency</Text>
              <View style={styles.freqRow}>
                {FREQUENCIES.map(f => {
                  const selected = selectedFreq === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.freqBtn, selected && styles.freqBtnSelected]}
                      onPress={() => setSelectedFreq(f)}
                      activeOpacity={0.8}>
                      <Text style={[styles.freqBtnText, selected && styles.freqBtnTextSelected]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={onClose}
              activeOpacity={0.8}>
              <CalendarIcon color="#ffffff" size={14} />
              <Text style={styles.scheduleBtnText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const {reports: liveReports} = useLiveData();
  const {profile} = useUser();
  const {user} = useAuth();

  const data = useMemo(() => {
    const recentReports = liveReports as ReportItem[];
    const typeColors = ['#1f5135', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
    const typeLabels = ['Environmental', 'Compliance', 'Performance', 'Alert Summary', 'Custom'];
    const reportTypes = ['environmental', 'compliance', 'performance', 'alert-summary', 'custom'] as const;
    const typeCountMap: Record<string, number> = {};
    recentReports.forEach(r => { typeCountMap[r.type] = (typeCountMap[r.type] ?? 0) + 1; });
    const reportTypeData = reportTypes.map((t, i) => ({label: typeLabels[i], count: typeCountMap[t] ?? 0, color: typeColors[i]}));

    const today = new Date();
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function dayLabel(d: Date) { return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; }
    const reportTrendData = Array.from({length: 7}, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      const gen = recentReports.filter(r => r.dateGenerated === dayStr).length;
      return {day: dayLabel(d), Generated: gen, Downloaded: Math.round(gen * 0.6)};
    });

    const ready = recentReports.filter(r => r.status === 'ready').length;
    const processing = recentReports.filter(r => r.status === 'processing').length;
    const scheduled = recentReports.filter(r => r.status === 'scheduled').length;
    const totalDownloads = recentReports.reduce((s, r) => s + (r.downloads ?? 0), 0);

    const stats = [
      {label: 'Total Reports', value: recentReports.length, delta: '+0', deltaPositive: true,  colorKey: 'blue'   as const},
      {label: 'Ready',         value: ready,                delta: '+0', deltaPositive: true,  colorKey: 'green'  as const},
      {label: 'Processing',    value: processing,           delta: '+0', deltaPositive: false, colorKey: 'amber'  as const},
      {label: 'Downloads',     value: totalDownloads,       delta: '+0', deltaPositive: true,  colorKey: 'purple' as const},
    ];

    return {stats, recentReports, reportTypeData, reportTrendData};
  }, [liveReports]);

  const [modalVisible, setModalVisible] = useState(false);

  async function handleGenerateReport(type: ReportType, warehouse: string, period: string) {
    if (!user?.uid) return;
    await generateReport(user.uid, profile?.displayName ?? 'User', type, warehouse, period);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <BarChartIcon color={C.primary} size={20} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>Generate and manage grain storage reports</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.scheduleHeaderBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}>
          <CalendarIcon color={C.white} size={14} />
          <Text style={styles.scheduleHeaderBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Stat Cards ────────────────────────────────────────────────────── */}
        <View style={styles.statGrid}>
          {data.stats.map(s => (
            <View key={s.label} style={styles.statCardWrap}>
              <StatCard
                label={s.label}
                value={s.value}
                delta={s.delta}
                deltaPositive={s.deltaPositive}
                colorKey={s.colorKey}
              />
            </View>
          ))}
        </View>

        {/* ── Report Type Breakdown ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Report Types</Text>
            <Text style={styles.cardSubtitle}>Distribution by category</Text>
          </View>
          <View style={styles.cardBody}>
            <ReportTypeChart data={data.reportTypeData} />
          </View>
        </View>

        {/* ── Report Trend Chart ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Report Trend</Text>
            <Text style={styles.cardSubtitle}>Generated vs downloaded — last 7 days</Text>
          </View>
          <View style={styles.cardBody}>
            <ReportTrendChart data={data.reportTrendData} />
          </View>
        </View>

        {/* ── Recent Reports ────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <Text style={styles.sectionSubtitle}>{data.recentReports.length} reports available</Text>
        </View>

        <View style={styles.reportList}>
          {data.recentReports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </View>

      </ScrollView>

      {/* Schedule modal */}
      {modalVisible && <ScheduleModal onClose={() => setModalVisible(false)} />}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  scheduleHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  scheduleHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    color: C.white,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: {flex: 1},
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // ── Stat grid ──────────────────────────────────────────────────────────────
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCardWrap: {
    width: '48%',
  },
  statCard: {
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
  statAccentBar: {
    height: 3,
    width: '100%',
  },
  statInner: {
    padding: 14,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  statDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  statDelta: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  statDeltaSub: {
    fontSize: 10,
    color: C.textMuted,
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
    padding: 14,
  },

  // ── SVG chart ──────────────────────────────────────────────────────────────
  svgWrap: {
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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

  // ── Type chart ─────────────────────────────────────────────────────────────
  typeChartWrap: {
    gap: 10,
  },
  typeChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChartLabel: {
    fontSize: 11.5,
    color: C.textSecondary,
    width: 90,
    fontWeight: fontWeight.medium,
  },
  typeChartBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  typeChartBarFill: {
    height: 10,
    borderRadius: 999,
    minWidth: 4,
  },
  typeChartCount: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    width: 20,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {marginBottom: 0},
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

  // ── Report list ────────────────────────────────────────────────────────────
  reportList: {
    gap: 10,
  },
  reportCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 4,
    elevation: 1,
  },
  reportAccentBar: {
    width: 4,
    flexShrink: 0,
  },
  reportInner: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    lineHeight: 13,
  },
  reportTitle: {
    fontSize: 13.5,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
    lineHeight: 18,
  },
  reportWarehouse: {
    fontSize: 11,
    color: C.textSecondary,
  },
  reportMetaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  reportMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reportMetaText: {
    fontSize: 10.5,
    color: C.textMuted,
  },
  reportFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 6,
    marginTop: 2,
  },
  reportFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportMeta: {
    fontSize: 10.5,
    color: C.textMuted,
    fontVariant: ['tabular-nums'],
  },
  reportMetaSep: {
    fontSize: 10.5,
    color: C.border,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(31,81,53,0.08)',
  },
  downloadBtnDisabled: {
    backgroundColor: '#f3f4f6',
  },
  downloadBtnText: {
    fontSize: 11.5,
    fontWeight: fontWeight.semibold,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
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
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 12},
    shadowRadius: 32,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: C.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: C.textMuted,
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
    gap: 18,
  },
  modalField: {
    gap: 8,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalFieldValue: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalFieldValueText: {
    fontSize: 13.5,
    color: C.textPrimary,
    fontWeight: fontWeight.medium,
  },

  // Type selector
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeSelectorBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#f8fafc',
  },
  typeSelectorBtnText: {
    fontSize: 11.5,
    fontWeight: fontWeight.semibold,
    color: C.textSecondary,
  },

  // Frequency
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  freqBtnSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  freqBtnText: {
    fontSize: 12.5,
    fontWeight: fontWeight.semibold,
    color: C.textSecondary,
  },
  freqBtnTextSelected: {
    color: C.white,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: fontWeight.semibold,
    color: C.textSecondary,
  },
  scheduleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  scheduleBtnText: {
    fontSize: 13.5,
    fontWeight: fontWeight.bold,
    color: C.white,
  },
});
