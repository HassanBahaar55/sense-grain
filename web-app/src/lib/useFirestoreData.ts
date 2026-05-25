'use client';

/**
 * Firestore-backed data hooks.
 * Drop-in replacements for every dataEngine hook — return identical types
 * so page components need only a one-line import change.
 *
 * Data sources:
 *   warehouseReadings  ← liveEngine writes every 2 min (real-time)
 *   alerts             ← liveEngine writes every 2 min (real-time)
 *   alertHistory       ← permanent log, written on alert fire/resolve
 *   sensorHistory      ← seeded 30 days + daily append (historical charts)
 *   reports            ← seeded on login + user-generated
 *   reportsMeta        ← seeded on login + updated on new report
 */

import { useState, useEffect, useMemo } from 'react';
import {
  getFirestore,
  collection, doc,
  onSnapshot, query, orderBy, limit, where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useHeader } from '@/contexts/HeaderContext';
import { col } from '@/lib/accountDb';
import { useWarehouses, type ManagedWarehouse } from '@/lib/storageManagement';
import type { LiveSensorReading, LiveAlert } from './liveEngine';
import type {
  WarehouseReading, DashboardData, AlertsData, StorageData,
  AnalyticsData, PredictionsData, ReportsData,
  Alert, AlertSeverity, AlertStatus, AlertParamType,
  AlertTrendPoint, EnvTrendPoint, WHPerformancePoint, StabilityPoint,
  ParamTrendPoint, ReportItem, ReportStatCard,
  WHStatus, RiskLevel, TrendDir,
  AnalyticsKPI, ParamForecastCard, ForecastPoint, WHPredRow,
} from './dataEngine';

const db = getFirestore(firebaseApp);

const SENSORS_PER_WH = 5; // temp, humidity, moisture, CO₂, AQI

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dayLabel(d: Date) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

// ─── Live → WarehouseReading converter ───────────────────────────────────────

function liveToWarehouse(r: LiveSensorReading, wh?: ManagedWarehouse): WarehouseReading {
  const capacity = wh?.capacity ?? 1500;
  const used = Math.round(capacity * r.capacity / 100);
  const trend: TrendDir = r.trend === 'up' ? 'up' : r.trend === 'down' ? 'down' : 'stable';
  const risk: RiskLevel = r.status === 'high' ? 'high' : r.status === 'medium' ? 'medium' : 'low';
  return {
    id:         r.warehouseId,
    name:       wh?.name ?? r.warehouseId,
    status:     r.status as WHStatus,
    risk,
    trend,
    temp:       +r.temperature.toFixed(1),
    humidity:   r.humidity,
    moisture:   +r.moisture.toFixed(1),
    co2:        r.co2,
    aqi:        r.aqi,
    capacity,
    used,
    usedPct:    Math.round(r.capacity),
    lastUpdate: 'Live',
  };
}

function readingsToWarehouses(readings: Record<string, LiveSensorReading>, managedWhs: ManagedWarehouse[] = []): WarehouseReading[] {
  const whMap = Object.fromEntries(managedWhs.map(w => [w.id, w]));
  const active = Object.values(readings).map(r => liveToWarehouse(r, whMap[r.warehouseId]));
  active.sort((a, b) => a.id.localeCompare(b.id));
  return active;
}

// ─── sensorHistory subscription ───────────────────────────────────────────────

interface SensorHistoryDoc {
  date: string;
  averages: { temperature: number; humidity: number; moisture: number; co2: number; aqi: number };
  warehouseStatus: { good: number; warning: number; critical: number };
  stability: Record<string, number>;
  alertCounts: { Critical: number; Warning: number; Info: number };
}

export function useSensorHistory(days: number): SensorHistoryDoc[] {
  const { uid } = useLiveData();
  const [history, setHistory] = useState<SensorHistoryDoc[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, col.sensorHistory(uid)), orderBy('date', 'desc'), limit(days));
    const unsub: Unsubscribe = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => d.data() as SensorHistoryDoc);
      setHistory(docs.sort((a, b) => a.date.localeCompare(b.date)));
    });
    return unsub;
  }, [uid, days]);

  return history;
}

// ─── Reports subscription ─────────────────────────────────────────────────────

interface ReportsMetaDoc {
  stats: ReportStatCard[];
  reportTypeData: { label: string; count: number; color: string }[];
  reportTrendData: { day: string; Generated: number; Downloaded: number }[];
  totalReports: number;
}

function useFirestoreReportsRaw(): { items: ReportItem[]; meta: ReportsMetaDoc | null } {
  const { uid } = useLiveData();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [meta, setMeta]   = useState<ReportsMetaDoc | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubItems: Unsubscribe = onSnapshot(
      query(collection(db, col.reports(uid)), orderBy('dateGenerated', 'desc'), limit(20)),
      snap => setItems(snap.docs.map(d => d.data() as ReportItem)),
    );
    const unsubMeta: Unsubscribe = onSnapshot(
      doc(db, col.reportsMeta(uid), 'global'),
      snap => { if (snap.exists()) setMeta(snap.data() as ReportsMetaDoc); },
    );
    return () => { unsubItems(); unsubMeta(); };
  }, [uid]);

  return { items, meta };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC HOOKS — drop-in replacements for dataEngine hooks
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Sensor Performance ───────────────────────────────────────────────────────

export interface SensorPerformanceItem {
  warehouse: string;
  online:    number; // currently active sensors (0 or SENSORS_PER_WH)
  total:     number; // always SENSORS_PER_WH
  uptime:    number; // % of selected period warehouse was online
}

export function useSensorPerformance(days: 7 | 14 | 30): SensorPerformanceItem[] {
  const history  = useSensorHistory(days);
  const { readings } = useLiveData();

  return useMemo(() => {
    const allWhIds = [...new Set([
      ...Object.keys(readings),
      ...history.flatMap(h => Object.keys(h.stability)),
    ])].sort();
    return allWhIds.map(whId => {
      const isOnline   = readings[whId] != null;
      const daysOnline = history.filter(h => (h.stability[whId] ?? 0) > 0).length;
      const uptime     = history.length > 0
        ? +(daysOnline / history.length * 100).toFixed(1)
        : isOnline ? 100.0 : 0.0;
      return { warehouse: whId, online: isOnline ? SENSORS_PER_WH : 0, total: SENSORS_PER_WH, uptime };
    });
  }, [history, readings]);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useFirestoreDashboard(): DashboardData {
  const { readings, liveAlerts } = useLiveData();
  const { warehouses: managedWarehouses } = useWarehouses();

  return useMemo(() => {
    const warehouses = readingsToWarehouses(readings, managedWarehouses);

    // Convert liveAlerts to DashboardData alert format (top 4)
    const alerts = liveAlerts
      .filter(a => !a.resolved)
      .slice(0, 4)
      .map((a, i) => ({
        id: i + 1,
        severity: (a.severity === 'critical' ? 'high' : a.severity) as 'high' | 'medium',
        title: a.message,
        location: `${a.warehouseId} · Zone 1`,
        time: `${Math.floor((Date.now() - a.timestamp) / 60000)} min ago`,
        value: `${a.value} ${a.unit}`,
        threshold: `>${a.threshold} ${a.unit}`,
      }));

    const goodCount     = warehouses.filter(w => w.status === 'good').length;
    const watchCount    = warehouses.filter(w => w.status === 'medium').length;
    const criticalCount = warehouses.filter(w => w.status === 'high').length;
    const offlineCount  = warehouses.filter(w => w.status === 'inactive').length;

    return { warehouses, alerts, goodCount, watchCount, criticalCount, offlineCount, activeCount: warehouses.length - offlineCount };
  }, [readings, liveAlerts, managedWarehouses]);
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function useFirestoreStorage(): StorageData {
  const { readings } = useLiveData();
  const history = useSensorHistory(7);
  const { warehouses: managedWarehouses } = useWarehouses();

  return useMemo(() => {
    const warehouses = readingsToWarehouses(readings, managedWarehouses);
    const active = warehouses.filter(w => w.temp !== null);

    const totalCap     = warehouses.reduce((s, w) => s + w.capacity, 0);
    const totalUsed    = warehouses.reduce((s, w) => s + w.used, 0);
    const avgTemp      = active.length ? +(active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length).toFixed(1) : 0;
    const avgHumidity  = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 0;

    // Stability chart from Firestore sensorHistory — dynamic warehouse keys
    const whIds = Object.keys(readings).sort();
    const today = new Date();
    const stabilityData: StabilityPoint[] = history.length > 0
      ? history.map(h => {
          const point: StabilityPoint = { day: dayLabel(new Date(h.date + 'T00:00:00')) };
          for (const id of whIds) point[id] = h.stability[id] ?? 75;
          return point;
        })
      : Array.from({ length: 7 }, (_, i) => {
          const point: StabilityPoint = { day: dayLabel(addDays(today, i - 6)) };
          for (const id of whIds) point[id] = 75;
          return point;
        });

    const counts = {
      good:     warehouses.filter(w => w.status === 'good').length,
      medium:   warehouses.filter(w => w.status === 'medium').length,
      high:     warehouses.filter(w => w.status === 'high').length,
      inactive: warehouses.filter(w => w.status === 'inactive').length,
    };
    const total = warehouses.length;

    return {
      warehouses,
      totals: {
        totalWarehouses: warehouses.length,
        totalZones: warehouses.length * 4,
        totalCapacity: totalCap,
        totalUsed,
        usedPct: totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0,
        avgTemp, avgHumidity,
        activeCount: active.length,
        highRiskUnits: warehouses.filter(w => w.status === 'high').length,
      },
      stabilityData,
      zoneSummary: [
        { label: 'Good',     color: '#22c55e', count: counts.good,     pct: Math.round(counts.good / total * 100) },
        { label: 'Medium',   color: '#f59e0b', count: counts.medium,   pct: Math.round(counts.medium / total * 100) },
        { label: 'High',     color: '#ef4444', count: counts.high,     pct: Math.round(counts.high / total * 100) },
        { label: 'Inactive', color: '#9ca3af', count: counts.inactive, pct: Math.round(counts.inactive / total * 100) },
      ],
      topCritical: warehouses.filter(w => w.status === 'high' || w.status === 'medium').slice(0, 4),
    };
  }, [readings, history, managedWarehouses]);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

const PARAM_TYPE_MAP: Record<string, AlertParamType> = {
  Temperature: 'temperature', Humidity: 'humidity', Moisture: 'moisture',
  'CO2': 'co2', 'CO₂': 'co2', AQI: 'aqi', System: 'system', Capacity: 'capacity',
};

function liveAlertToAlert(a: LiveAlert, idx: number): Alert {
  const paramType = PARAM_TYPE_MAP[a.param] ?? 'system';
  const sev: AlertSeverity = a.severity;
  const status: AlertStatus = a.resolved ? 'resolved' : 'active';
  const d = new Date(a.timestamp);
  const time = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // idx kept for backwards compatibility with the function signature, but the
  // returned Alert now uses the real Firestore document id so UI actions can
  // write status changes back to /accounts/{uid}/alerts/{id}.
  void idx;
  return {
    id: a.id,
    severity: sev,
    title: a.message,
    warehouse: a.warehouseId,
    zone: 'Zone 1',
    parameter: a.param,
    value: `${a.value} ${a.unit}`.trim(),
    threshold: `>${a.threshold} ${a.unit}`.trim(),
    time,
    status,
    type: paramType,
  };
}

export function useFirestoreAlertsData(): AlertsData {
  const { liveAlerts } = useLiveData();
  const history = useSensorHistory(7);

  return useMemo(() => {
    const alerts: Alert[] = liveAlerts.map((a, i) => liveAlertToAlert(a, i));

    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning  = alerts.filter(a => a.severity === 'high' || a.severity === 'medium').length;
    const info     = alerts.filter(a => a.severity === 'low' || a.severity === 'info').length;
    const resolved = alerts.filter(a => a.status === 'resolved').length;

    const typeMap: Record<string, number> = {};
    for (const a of alerts) typeMap[a.type] = (typeMap[a.type] ?? 0) + 1;

    const alertsByType = [
      { label: 'Temperature', count: typeMap.temperature ?? 0, color: '#f59e0b' },
      { label: 'Humidity',    count: typeMap.humidity ?? 0,    color: '#3b82f6' },
      { label: 'Moisture',    count: typeMap.moisture ?? 0,    color: '#10b981' },
      { label: 'CO₂',         count: typeMap.co2 ?? 0,         color: '#8b5cf6' },
      { label: 'AQI',         count: typeMap.aqi ?? 0,         color: '#ef4444' },
      { label: 'Capacity',    count: typeMap.capacity ?? 0,    color: '#f97316' },
      { label: 'System',      count: typeMap.system ?? 0,      color: '#9ca3af' },
    ].filter(t => t.count > 0);

    const today = new Date();
    const alertTrendData: AlertTrendPoint[] = history.length > 0
      ? history.map(h => ({
          day:      dayLabel(new Date(h.date + 'T00:00:00')),
          Critical: h.alertCounts.Critical,
          Warning:  h.alertCounts.Warning,
          Info:     h.alertCounts.Info,
        }))
      : Array.from({ length: 7 }, (_, i) => ({
          day: dayLabel(addDays(today, i - 6)),
          Critical: 0, Warning: 2, Info: 8,
        }));

    const recentFeed = alerts
      .filter(a => a.severity !== 'info' && !a.status.includes('resolved'))
      .slice(0, 5)
      .map((a, i) => ({
        id: `r${i + 1}`,
        severity: a.severity,
        warehouse: a.warehouse,
        zone: a.zone,
        message: `${a.parameter} ${a.value} — ${a.status}`,
        time: a.time,
      }));

    const heatmapData: number[][] = Array.from({ length: 7 }, (_, di) => {
      const h = history[di];
      const stress = h ? (h.warehouseStatus.critical * 3 + h.warehouseStatus.warning) : 1;
      return Array.from({ length: 8 }, (_, ti) =>
        Math.max(0, Math.round(stress * (ti >= 2 && ti <= 5 ? 2 : 0.5)))
      );
    });

    return {
      alerts,
      alertSummary: { total: alerts.length, critical, warning, info, resolved },
      alertsByType,
      alertTrendData,
      recentFeed,
      heatmapData,
    };
  }, [liveAlerts, history]);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useFirestoreAnalytics(): AnalyticsData {
  const { readings } = useLiveData();
  const history30 = useSensorHistory(30);
  const { warehouses: managedWarehouses } = useWarehouses();

  return useMemo(() => {
    const warehouses = readingsToWarehouses(readings, managedWarehouses);
    const active     = warehouses.filter(w => w.temp !== null);

    // ── Live metrics ────────────────────────────────────────────────────────
    const avgTemp = active.length ? active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length : 27;
    const avgHum  = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 62;
    const avgCap  = active.length ? Math.round(active.reduce((s, w) => s + (w.usedPct ?? 0), 0) / active.length) : 68;

    // Spoilage from live readings via status distribution
    const goodPct  = warehouses.length > 0 ? (warehouses.filter(w => w.status === 'good').length / warehouses.length) * 100 : 80;
    const spoilRisk = +(Math.max(1, Math.min(30, 30 - goodPct / 4)).toFixed(1));

    // ── Stability from live readings (real-time score) ───────────────────────
    const tempStability = Math.max(50, Math.round(100 - Math.max(0, avgTemp - 25) * 5));
    const humStability  = Math.max(50, Math.round(100 - Math.max(0, avgHum  - 60) * 2.5));

    // ── Delta: compare last 15 history docs vs previous 15 ──────────────────
    const tempSafeThr = 29;
    const humSafeThr  = 65;
    let tempDelta = '+0.0%';
    let humDelta  = '+0.0%';
    let capDelta  = '+1.3%';

    if (history30.length >= 4) {
      const half   = Math.floor(history30.length / 2);
      const recent = history30.slice(half);
      const older  = history30.slice(0, half);

      const recentTempSafe = recent.filter(h => h.averages.temperature < tempSafeThr).length;
      const olderTempSafe  = older.filter(h => h.averages.temperature < tempSafeThr).length;
      const recentTempStab = Math.round(recentTempSafe / recent.length * 100);
      const olderTempStab  = older.length > 0 ? Math.round(olderTempSafe / older.length * 100) : recentTempStab;
      const td = recentTempStab - olderTempStab;
      tempDelta = `${td >= 0 ? '+' : ''}${td.toFixed(1)}%`;

      const recentHumSafe = recent.filter(h => h.averages.humidity < humSafeThr).length;
      const olderHumSafe  = older.filter(h => h.averages.humidity < humSafeThr).length;
      const recentHumStab = Math.round(recentHumSafe / recent.length * 100);
      const olderHumStab  = older.length > 0 ? Math.round(olderHumSafe / older.length * 100) : recentHumStab;
      const hd = recentHumStab - olderHumStab;
      humDelta = `${hd >= 0 ? '+' : ''}${hd.toFixed(1)}%`;

      // Capacity delta: recent avg vs older avg from sensorHistory averages
      // (We don't store capacity in sensorHistory so we approximate from warehouseStatus)
      const recentGood = recent.reduce((s, h) => s + h.warehouseStatus.good, 0) / recent.length;
      const olderGood  = older.length > 0 ? older.reduce((s, h) => s + h.warehouseStatus.good, 0) / older.length : recentGood;
      const cd = recentGood - olderGood;
      capDelta = `${cd >= 0 ? '+' : ''}${cd.toFixed(1)}`;
    }

    // ── Sensor health from live readings ─────────────────────────────────────
    const activeManaged = managedWarehouses.filter(w => w.status === 'active');
    const totalWHCount  = activeManaged.length || Object.keys(readings).length || 1;
    const onlineWHs     = Object.keys(readings).length;
    const sensorHealth  = Math.round(Math.min(onlineWHs / totalWHCount, 1) * 100);
    const sensorDelta   = sensorHealth === 100 ? '+0.0%' : `-${(100 - sensorHealth).toFixed(1)}%`;

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const kpis: AnalyticsKPI[] = [
      { label: 'Temp Stability',       value: tempStability, unit: '%', delta: tempDelta, trend: tempDelta.startsWith('-') ? 'down' : 'up',  colorKey: 'amber',  invertedTrend: false },
      { label: 'Humidity Stability',   value: humStability,  unit: '%', delta: humDelta,  trend: humDelta.startsWith('-')  ? 'down' : 'up',   colorKey: 'blue',   invertedTrend: false },
      { label: 'Capacity Utilization', value: avgCap,        unit: '%', delta: capDelta,  trend: 'up',                                        colorKey: 'green',  invertedTrend: false },
      { label: 'Spoilage Risk',        value: spoilRisk,     unit: '%', delta: '-0.8%',   trend: 'down', invertedTrend: true,                 colorKey: 'red'  },
      { label: 'Sensor Health',        value: sensorHealth,  unit: '%', delta: sensorDelta, trend: sensorHealth === 100 ? 'stable' : 'down',  colorKey: 'teal',   invertedTrend: false },
    ];

    // ── Env trend from history ────────────────────────────────────────────────
    const today = new Date();
    const envTrendData: EnvTrendPoint[] = history30.slice(-14).length > 0
      ? history30.slice(-14).map(h => ({
          day:         dayLabel(new Date(h.date + 'T00:00:00')),
          Temperature: Math.max(40, Math.round(100 - Math.max(0, h.averages.temperature - 24) * 5)),
          Humidity:    Math.max(40, Math.round(100 - Math.max(0, h.averages.humidity - 55) * 2.5)),
          Moisture:    Math.max(40, Math.round(100 - Math.max(0, h.averages.moisture - 10) * 8)),
          CO2:         Math.min(98, Math.max(60, Math.round(88 - Math.max(0, h.averages.co2 - 500) * 0.1))),
          AQI:         Math.min(98, Math.max(60, Math.round(90 - Math.max(0, h.averages.aqi - 40) * 0.5))),
        }))
      : Array.from({ length: 14 }, (_, i) => ({ day: dayLabel(addDays(today, i - 13)), Temperature: 75, Humidity: 70, Moisture: 72, CO2: 88, AQI: 90 }));

    // ── WH performance from live ──────────────────────────────────────────────
    const whPerformanceData: WHPerformancePoint[] = Object.values(readings)
      .map(r => ({
        warehouse:   r.warehouseId,
        Efficiency:  Math.max(20, Math.round(r.health)),
        Stability:   Math.max(20, Math.round(Math.max(0, 100 - r.spoilageRisk))),
        Utilization: Math.round(r.capacity),
      }))
      .sort((a, b) => a.warehouse.localeCompare(b.warehouse));

    // ── Best/worst WH ─────────────────────────────────────────────────────────
    const ranked = whPerformanceData.slice().sort((a, b) => (b.Efficiency + b.Stability) - (a.Efficiency + a.Stability));
    const best   = ranked[0] ?? { warehouse: 'WH-A', Efficiency: 90, Stability: 88, Utilization: 72 };
    const worst  = ranked[ranked.length - 1] ?? { warehouse: 'WH-C', Efficiency: 60, Stability: 55, Utilization: 61 };
    const bestWH  = warehouses.find(w => w.id === best.warehouse);
    const worstWH = warehouses.find(w => w.id === worst.warehouse);

    return {
      kpis,
      envTrendData,
      whPerformanceData,
      topWarehouse: {
        name:   best.warehouse,
        detail: bestWH ? `${bestWH.temp?.toFixed(1)}°C · ${bestWH.humidity}% RH · ${bestWH.usedPct}% capacity` : 'Optimal conditions',
        score:  best.Efficiency,
      },
      worstWarehouse: {
        name:   worst.warehouse,
        detail: worstWH ? `${worstWH.temp?.toFixed(1)}°C · ${worstWH.humidity}% RH · status: ${worstWH.status}` : 'Needs attention',
        score:  worst.Efficiency,
      },
      overallStability: Math.round((tempStability + humStability) / 2),
      sensorSummary: {
        online:  onlineWHs * SENSORS_PER_WH,
        offline: Math.max(0, totalWHCount - onlineWHs) * SENSORS_PER_WH,
        warning: warehouses.filter(w => w.status !== 'good' && w.status !== 'inactive').length,
        total:   Math.max(totalWHCount, onlineWHs) * SENSORS_PER_WH,
      },
    };
  }, [readings, history30, managedWarehouses]);
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export function useFirestorePredictions(): PredictionsData {
  const { readings } = useLiveData();
  const { selectedDate } = useHeader();
  const { warehouses: managedWarehouses } = useWarehouses();

  return useMemo(() => {
    const warehouses = readingsToWarehouses(readings, managedWarehouses);
    const active = warehouses.filter(w => w.temp !== null);
    const avgTemp  = active.length ? active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length : 27;
    const avgHum   = active.length ? Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length) : 62;
    const avgMoist = active.length ? +(active.reduce((s, w) => s + (w.moisture ?? 0), 0) / active.length).toFixed(1) : 11.5;
    const avgCO2   = active.length ? Math.round(active.reduce((s, w) => s + (w.co2 ?? 520), 0) / active.length) : 510;
    const avgAQI   = active.length ? Math.round(active.reduce((s, w) => s + (w.aqi ?? 40), 0) / active.length) : 40;
    const avgCap   = active.length ? Math.round(active.reduce((s, w) => s + w.usedPct, 0) / active.length) : 68;

    function mkSpark(base: number, step: number, count = 7): number[] {
      const arr = [+base.toFixed(2)];
      // Deterministic — no Math.random() so sparklines don't reshuffle every tick
      for (let i = 1; i < count; i++) arr.push(+(arr[arr.length - 1] + step).toFixed(2));
      return arr;
    }

    const paramCards: ParamForecastCard[] = [
      { key: 'temp',     label: 'Temperature',     unit: '°C',  current: +avgTemp.toFixed(1), forecast: +(avgTemp + 1.2).toFixed(1), rangeMin: +(avgTemp - 1).toFixed(1), rangeMax: +(avgTemp + 3).toFixed(1), trend: 'up',        confidence: 88, sparkData: mkSpark(avgTemp - 1, 0.3),    colorKey: 'amber'  },
      { key: 'humidity', label: 'Humidity',         unit: '%',   current: avgHum,  forecast: avgHum + 3,  rangeMin: avgHum - 3,  rangeMax: avgHum + 7,  trend: 'slight-up', confidence: 85, sparkData: mkSpark(avgHum - 2, 0.5),     colorKey: 'blue'   },
      { key: 'moisture', label: 'Moisture Content', unit: '%',   current: avgMoist, forecast: +(avgMoist + 0.6).toFixed(1), rangeMin: +(avgMoist - 0.5).toFixed(1), rangeMax: +(avgMoist + 1.5).toFixed(1), trend: 'slight-up', confidence: 82, sparkData: mkSpark(avgMoist - 0.3, 0.08), colorKey: 'green'  },
      { key: 'co2',      label: 'CO₂ Level',        unit: 'ppm', current: avgCO2, forecast: avgCO2 + 12,  rangeMin: avgCO2 - 15, rangeMax: avgCO2 + 25, trend: 'up',        confidence: 79, sparkData: mkSpark(avgCO2 - 5, 2),       colorKey: 'purple' },
      { key: 'aqi',      label: 'Air Quality',       unit: 'AQI', current: avgAQI, forecast: avgAQI + 2,   rangeMin: avgAQI - 5,  rangeMax: avgAQI + 8,  trend: 'stable',    confidence: 90, sparkData: mkSpark(avgAQI - 1, 0.3),     colorKey: 'teal'   },
      { key: 'capacity', label: 'Storage Capacity',  unit: '%',   current: avgCap, forecast: Math.min(95, avgCap + 2), rangeMin: avgCap - 2, rangeMax: avgCap + 5, trend: 'up', confidence: 92, sparkData: mkSpark(avgCap - 1, 0.2), colorKey: 'indigo' },
    ];

    const forecastData: ForecastPoint[] = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(selectedDate, i + 1);
      const row: ForecastPoint = { day: dayLabel(d) };
      for (const wh of warehouses.filter(w => w.temp !== null)) {
        row[wh.id] = Math.round(((wh.temp ?? 25) + i * 0.2) / 35 * 100);
      }
      return row;
    });

    const whPredTable: WHPredRow[] = warehouses.filter(w => w.temp !== null).map(wh => {
      const stressScore = wh.status === 'high' ? 3 : wh.status === 'medium' ? 1.5 : 0;
      const spoilage30d = Math.min(95, Math.max(5, Math.round(stressScore * 20 + 5)));
      return {
        id: wh.id, name: wh.name, overallRisk: wh.risk,
        spoilage30d,
        tempForecast:  +((wh.temp ?? 25) + 0.8).toFixed(1),
        humForecast:   Math.round((wh.humidity ?? 60) + 1.5),
        moistForecast: +((wh.moisture ?? 11) + 0.4).toFixed(1),
        co2Forecast:   Math.round((wh.co2 ?? 520) + 12),
        aqiForecast:   Math.round((wh.aqi ?? 40) + 2),
        capForecast:   Math.min(99, Math.round(wh.usedPct + 1.5)),
        trend:         wh.status === 'high' ? 'up' : wh.status === 'medium' ? 'slight-up' : 'stable',
        confidence:    wh.status === 'good' ? 91 : 82,
      };
    });

    const riskForecastData = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(selectedDate, i + 1);
      return {
        day:    dayLabel(d),
        Low:    warehouses.filter(w => w.risk === 'low').length,
        Medium: warehouses.filter(w => w.risk === 'medium').length,
        High:   Math.max(0, warehouses.filter(w => w.risk === 'high').length - (i > 3 ? 1 : 0)),
      };
    });

    return { paramCards, forecastData, whPredTable, riskForecastData };
  }, [readings, selectedDate, managedWarehouses]);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useFirestoreReports(): ReportsData {
  const { items, meta } = useFirestoreReportsRaw();

  return useMemo(() => {
    if (!meta || items.length === 0) {
      return { stats: [], recentReports: [], reportTypeData: [], reportTrendData: [] };
    }
    return {
      stats:           meta.stats,
      recentReports:   items,
      reportTypeData:  meta.reportTypeData,
      reportTrendData: meta.reportTrendData,
    };
  }, [items, meta]);
}

// ─── Param Trend (Realtime Monitor charts) ────────────────────────────────────

export function useFirestoreParamTrend(): ParamTrendPoint[] {
  const { readings } = useLiveData();

  return useMemo(() => {
    const active = Object.values(readings);
    if (!active.length) return [];

    const avgT = active.reduce((s, r) => s + r.temperature, 0) / active.length;
    const avgH = active.reduce((s, r) => s + r.humidity, 0) / active.length;
    const avgM = active.reduce((s, r) => s + r.moisture, 0) / active.length;
    const avgC = active.reduce((s, r) => s + r.co2, 0) / active.length;

    const THRESHOLDS = { temp: 35, humidity: 85, moisture: 16, co2: 650 };
    const hours = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

    return hours.map((time, i) => ({
      time,
      temp:     +Math.max(30, Math.min(100, avgT / THRESHOLDS.temp * 100 + (i - 6) * 1.2)).toFixed(1),
      humidity: +Math.max(30, Math.min(100, avgH / THRESHOLDS.humidity * 100 + (i - 6) * 0.8)).toFixed(1),
      moisture: +Math.max(30, Math.min(100, avgM / THRESHOLDS.moisture * 100 + (i - 6) * 0.5)).toFixed(1),
      co2:      +Math.max(30, Math.min(100, avgC / THRESHOLDS.co2 * 100 + (i - 6) * 0.4)).toFixed(1),
    }));
  }, [readings]);
}

// ─── Alert trend + env trend + WH performance (used by monitor/analytics) ────

export function useFirestoreAlertTrend(days: 7 | 30 = 7): AlertTrendPoint[] {
  const history = useSensorHistory(days);
  const today = new Date();

  // Build a full N-day range, filling missing days with zeros
  return useMemo(() => {
    const byDate = new Map(history.map(h => [h.date, h]));
    return Array.from({ length: days }, (_, i) => {
      const d    = addDays(today, i - (days - 1));
      const key  = d.toISOString().slice(0, 10);
      const doc  = byDate.get(key);
      return {
        day:      dayLabel(d),
        Critical: doc?.alertCounts.Critical ?? 0,
        Warning:  doc?.alertCounts.Warning  ?? 0,
        Info:     doc?.alertCounts.Info     ?? 0,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, days]);
}

export function useFirestoreEnvTrend(): EnvTrendPoint[] {
  const history = useSensorHistory(14);
  const today = new Date();
  return history.length > 0
    ? history.map(h => ({
        day:         dayLabel(new Date(h.date + 'T00:00:00')),
        Temperature: Math.max(40, Math.round(100 - Math.max(0, h.averages.temperature - 24) * 5)),
        Humidity:    Math.max(40, Math.round(100 - Math.max(0, h.averages.humidity - 55) * 2.5)),
        Moisture:    Math.max(40, Math.round(100 - Math.max(0, h.averages.moisture - 10) * 8)),
        CO2:         Math.min(98, Math.max(60, Math.round(88 - Math.max(0, h.averages.co2 - 500) * 0.1))),
        AQI:         Math.min(98, Math.max(60, Math.round(90 - Math.max(0, h.averages.aqi - 40) * 0.5))),
      }))
    : Array.from({ length: 14 }, (_, i) => ({ day: dayLabel(addDays(today, i - 13)), Temperature: 75, Humidity: 70, Moisture: 72, CO2: 88, AQI: 90 }));
}

export function useFirestoreWhPerformance(): WHPerformancePoint[] {
  const { readings } = useLiveData();
  return useMemo(() =>
    Object.values(readings)
      .map(r => ({
        warehouse:   r.warehouseId,
        Efficiency:  Math.max(20, Math.round(r.health)),
        Stability:   Math.max(20, Math.round(Math.max(0, 100 - r.spoilageRisk))),
        Utilization: Math.round(r.capacity),
      }))
      .sort((a, b) => a.warehouse.localeCompare(b.warehouse)),
    [readings]);
}

// ─── Alert History ────────────────────────────────────────────────────────────

export interface AlertHistoryItem {
  id:          string;
  warehouseId: string;
  param:       string;
  severity:    'critical' | 'high' | 'medium';
  message:     string;
  value:       number;
  unit:        string;
  threshold:   number;
  triggeredAt: number;
  resolvedAt:  number | null;
  date:        string;
  resolved:    boolean;
}

export function useAlertHistory(days: number): AlertHistoryItem[] {
  const { uid } = useLiveData();
  const [items, setItems] = useState<AlertHistoryItem[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, col.alertHistory(uid)),
      orderBy('triggeredAt', 'desc'),
      limit(500),
    );
    const unsub = onSnapshot(q, snap => {
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      setItems(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as AlertHistoryItem))
          .filter(item => (item.triggeredAt ?? 0) >= since),
      );
    }, () => { /* offline — keep previous */ });
    return unsub;
  }, [uid, days]);

  return items;
}

export function useFirestoreStability(days: number): StabilityPoint[] {
  const history = useSensorHistory(days);
  const { readings } = useLiveData();
  const today = new Date();

  return useMemo(() => {
    const whIds = Object.keys(readings).sort();
    if (history.length > 0) {
      return history.map(h => {
        const point: StabilityPoint = { day: dayLabel(new Date(h.date + 'T00:00:00')) };
        for (const id of whIds) point[id] = h.stability[id] ?? 75;
        return point;
      });
    }
    return Array.from({ length: days }, (_, i) => {
      const point: StabilityPoint = { day: dayLabel(addDays(today, i - (days - 1))) };
      for (const id of whIds) point[id] = 75;
      return point;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, readings, days]);
}
