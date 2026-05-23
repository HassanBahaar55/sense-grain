/**
 * Deterministic mock-data engine — ported from web app.
 * Pure functions keyed on a date string: same date → same data.
 * User-prefix isolation: different users see completely different data.
 */

// ─── User-prefix isolation ────────────────────────────────────────────────────

let _userPrefix = 'SA';

export function setUserDataPrefix(prefix: string) {
  _userPrefix = prefix;
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function fnv32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function r(seed: string): number {
  return fnv32(_userPrefix + seed) / 4294967295;
}

function rr(seed: string, min: number, max: number): number {
  return min + r(seed) * (max - min);
}

function ri(seed: string, min: number, max: number): number {
  return Math.floor(rr(seed, min, max + 0.9999));
}

function rb(seed: string, prob = 0.5): boolean {
  return r(seed) < prob;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function dk(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function seasonal(date: Date): number {
  const m = date.getMonth();
  return Math.sin(((m - 1) / 12) * Math.PI * 2) * 3;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// ─── Warehouse base configs ───────────────────────────────────────────────────

const WH_BASES = [
  {id: 'WH-A', bt: 25.5, bh: 57, bm: 11.2, cap: 2000, baseUsed: 1450},
  {id: 'WH-B', bt: 28.0, bh: 63, bm: 12.5, cap: 1800, baseUsed: 1210},
  {id: 'WH-C', bt: 26.0, bh: 55, bm: 10.8, cap: 1750, baseUsed: 1420},
  {id: 'WH-D', bt: 29.5, bh: 68, bm: 14.0, cap: 1600, baseUsed: 980},
  {id: 'WH-E', bt: 26.5, bh: 58, bm: 11.5, cap: 1500, baseUsed: 1050},
  {id: 'WH-F', bt: 28.8, bh: 65, bm: 13.2, cap: 1400, baseUsed: 1020},
  {id: 'WH-G', bt: 25.8, bh: 54, bm: 11.0, cap: 1200, baseUsed: 620},
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type WHStatus = 'good' | 'medium' | 'high' | 'inactive';
export type RiskLevel = 'low' | 'medium' | 'high' | 'inactive';
export type TrendDir = 'up' | 'down' | 'stable' | 'slight-up' | null;

export interface WarehouseReading {
  id: string;
  name: string;
  status: WHStatus;
  risk: RiskLevel;
  trend: TrendDir;
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
  co2: number | null;
  aqi: number | null;
  capacity: number;
  used: number;
  usedPct: number;
  lastUpdate: string | null;
}

export interface DashAlert {
  id: number;
  severity: 'high' | 'medium';
  title: string;
  location: string;
  time: string;
  value: string;
  threshold: string;
}

export interface DashboardData {
  warehouses: WarehouseReading[];
  alerts: DashAlert[];
  goodCount: number;
  watchCount: number;
  criticalCount: number;
  offlineCount: number;
  activeCount: number;
}

// ─── Alerts page types ────────────────────────────────────────────────────────

export type AlertSeverity  = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus    = 'active' | 'acknowledged' | 'resolved' | 'muted';
export type AlertParamType = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'capacity' | 'system';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  warehouse: string;
  zone: string;
  parameter: string;
  value: string;
  threshold: string;
  time: string;
  status: AlertStatus;
  type: AlertParamType;
}

export interface AlertTrendPoint {
  day: string;
  Critical: number;
  Warning: number;
  Info: number;
}

export interface AlertsData {
  alerts: Alert[];
  alertSummary: {total: number; critical: number; warning: number; info: number; resolved: number};
  alertsByType: {label: string; count: number; color: string}[];
  alertTrendData: AlertTrendPoint[];
  recentFeed: {id: string; severity: AlertSeverity; warehouse: string; zone: string; message: string; time: string}[];
  heatmapData: number[][];
}

// ─── Storage page types ───────────────────────────────────────────────────────

export interface StabilityPoint {
  day: string;
  'WH-A': number;
  'WH-B': number;
  'WH-C': number;
  'WH-D': number;
}

export interface StorageData {
  warehouses: WarehouseReading[];
  totals: {
    totalWarehouses: number;
    totalZones: number;
    totalCapacity: number;
    totalUsed: number;
    usedPct: number;
    avgTemp: number;
    avgHumidity: number;
    activeCount: number;
    highRiskUnits: number;
  };
  stabilityData: StabilityPoint[];
  zoneSummary: {label: string; color: string; count: number; pct: number}[];
  topCritical: WarehouseReading[];
}

// ─── Analytics page types ─────────────────────────────────────────────────────

export interface EnvTrendPoint {
  day: string;
  Temperature: number;
  Humidity: number;
  Moisture: number;
  CO2: number;
  AQI: number;
}

export interface WHPerformancePoint {
  warehouse: string;
  Efficiency: number;
  Stability: number;
  Utilization: number;
}

export interface AnalyticsKPI {
  label: string;
  value: number;
  unit: string;
  delta: string;
  trend: TrendDir;
  colorKey: 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'teal';
  invertedTrend?: boolean;
}

export interface WHHighlight {
  name: string;
  detail: string;
  score: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPI[];
  envTrendData: EnvTrendPoint[];
  whPerformanceData: WHPerformancePoint[];
  topWarehouse: WHHighlight;
  worstWarehouse: WHHighlight;
  overallStability: number;
  sensorSummary: {online: number; offline: number; warning: number; total: number};
}

// ─── Predictions page types ───────────────────────────────────────────────────

export interface ParamForecastCard {
  key: string;
  label: string;
  unit: string;
  current: number;
  forecast: number;
  rangeMin: number;
  rangeMax: number;
  trend: TrendDir;
  confidence: number;
  sparkData: number[];
  colorKey: 'amber' | 'blue' | 'green' | 'purple' | 'teal' | 'indigo';
}

export interface ForecastPoint {
  day: string;
  [key: string]: number | string;
}

export interface WHPredRow {
  id: string;
  name: string;
  overallRisk: RiskLevel;
  spoilage30d: number;
  tempForecast: number;
  humForecast: number;
  moistForecast: number;
  co2Forecast: number;
  aqiForecast: number;
  capForecast: number;
  trend: TrendDir;
  confidence: number;
}

export interface PredictionsData {
  paramCards: ParamForecastCard[];
  forecastData: ForecastPoint[];
  whPredTable: WHPredRow[];
  riskForecastData: {day: string; Low: number; Medium: number; High: number}[];
}

// ─── Reports page types ───────────────────────────────────────────────────────

export type ReportType = 'environmental' | 'compliance' | 'performance' | 'alert-summary' | 'custom';

export interface ReportItem {
  id: string;
  type: ReportType;
  title: string;
  warehouse: string;
  period: string;
  generatedAt: string;
  dateGenerated: string;
  generatedBy: string;
  size: string;
  downloads: number;
  status: 'ready' | 'processing' | 'scheduled';
}

export interface ReportStatCard {
  label: string;
  value: number;
  delta: string;
  deltaPositive: boolean;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
}

export interface ReportsData {
  stats: ReportStatCard[];
  recentReports: ReportItem[];
  reportTypeData: {label: string; count: number; color: string}[];
  reportTrendData: {day: string; Generated: number; Downloaded: number}[];
}

export interface ParamTrendPoint {
  time: string;
  temp: number;
  humidity: number;
  moisture: number;
  co2: number;
}

// ─── Warehouse readings ───────────────────────────────────────────────────────

export function getWarehouseReadings(date: Date): WarehouseReading[] {
  const key = dk(date);
  const seas = seasonal(date);

  const active: WarehouseReading[] = WH_BASES.map(b => {
    const temp = +((b.bt + seas + rr(`${key}-t-${b.id}`, -2, 2.5)).toFixed(1));
    const humidity = Math.min(90, Math.max(40, b.bh + ri(`${key}-h-${b.id}`, -6, 7)));
    const moisture = +Math.max(9, Math.min(16, b.bm + rr(`${key}-m-${b.id}`, -1.5, 1.5))).toFixed(1);
    const co2 = ri(`${key}-co2-${b.id}`, 480, 600);
    const aqi = ri(`${key}-aqi-${b.id}`, 30, 58);
    const usedDelta = ri(`${key}-u-${b.id}`, -80, 80);
    const used = Math.max(0, Math.min(b.cap, b.baseUsed + usedDelta));

    const status: WHStatus =
      temp >= 32 || humidity >= 74 || moisture >= 15
        ? 'high'
        : temp >= 29 || humidity >= 65 || moisture >= 13
        ? 'medium'
        : 'good';

    const risk: RiskLevel =
      status === 'high' ? 'high' : status === 'medium' ? 'medium' : 'low';

    const trendRaw = r(`${key}-tr-${b.id}`);
    const trend: TrendDir =
      trendRaw < 0.25
        ? 'down'
        : trendRaw < 0.5
        ? 'stable'
        : trendRaw < 0.75
        ? 'slight-up'
        : 'up';

    const hh = ri(`${key}-lu-h-${b.id}`, 8, 10);
    const mm = ri(`${key}-lu-m-${b.id}`, 0, 59);
    const ap = rb(`${key}-lu-ap-${b.id}`) ? 'AM' : 'PM';

    return {
      id: b.id,
      name: `Warehouse ${b.id.slice(-1)}`,
      status,
      risk,
      trend,
      temp,
      humidity,
      moisture,
      co2,
      aqi,
      capacity: b.cap,
      used,
      usedPct: Math.round((used / b.cap) * 100),
      lastUpdate: `${hh}:${mm.toString().padStart(2, '0')} ${ap}`,
    };
  });

  active.push({
    id: 'WH-H',
    name: 'Warehouse H',
    status: 'inactive',
    risk: 'inactive',
    trend: null,
    temp: null,
    humidity: null,
    moisture: null,
    co2: null,
    aqi: null,
    capacity: 1200,
    used: 0,
    usedPct: 0,
    lastUpdate: null,
  });

  return active;
}

// ─── Dashboard data ───────────────────────────────────────────────────────────

export function getDashboardData(date: Date): DashboardData {
  const warehouses = getWarehouseReadings(date);
  const key = dk(date);

  const alerts: DashAlert[] = [];
  let id = 1;

  for (const wh of warehouses) {
    if (!wh.temp) continue;

    if (wh.temp >= 32) {
      const zone = ri(`${key}-az1-${wh.id}`, 1, 3);
      const min = ri(`${key}-at1-${wh.id}`, 1, 8);
      alerts.push({id: id++, severity: 'high', title: 'High Temperature Detected', location: `${wh.id} · Zone ${zone}`, time: `${min} min ago`, value: `${wh.temp}°C`, threshold: '30°C'});
    } else if (wh.temp >= 29 && rb(`${key}-atm-${wh.id}`, 0.6)) {
      const zone = ri(`${key}-az2-${wh.id}`, 1, 3);
      alerts.push({id: id++, severity: 'medium', title: 'Temperature Elevated', location: `${wh.id} · Zone ${zone}`, time: `${ri(`${key}-at2-${wh.id}`, 20, 90)} min ago`, value: `${wh.temp}°C`, threshold: '29°C'});
    }

    if (wh.humidity && wh.humidity >= 72) {
      alerts.push({id: id++, severity: 'high', title: 'Humidity Threshold Exceeded', location: `${wh.id} · Zone 1`, time: `${ri(`${key}-ah1-${wh.id}`, 5, 20)} min ago`, value: `${wh.humidity}%`, threshold: '70%'});
    } else if (wh.humidity && wh.humidity >= 66 && rb(`${key}-ahm-${wh.id}`, 0.5)) {
      alerts.push({id: id++, severity: 'medium', title: 'Humidity Warning', location: `${wh.id} · Zone 2`, time: `${ri(`${key}-ah2-${wh.id}`, 30, 90)} min ago`, value: `${wh.humidity}%`, threshold: '65%'});
    }

    if (wh.moisture && wh.moisture >= 14) {
      alerts.push({id: id++, severity: 'medium', title: 'Moisture Level Rising', location: `${wh.id} · Zone 2`, time: `${ri(`${key}-am1-${wh.id}`, 15, 60)} min ago`, value: `${wh.moisture}%`, threshold: '13%'});
    }
  }

  const limited = alerts.slice(0, 4);
  const goodCount = warehouses.filter(w => w.status === 'good').length;
  const watchCount = warehouses.filter(w => w.status === 'medium').length;
  const criticalCount = warehouses.filter(w => w.status === 'high').length;
  const offlineCount = warehouses.filter(w => w.status === 'inactive').length;

  return {
    warehouses,
    alerts: limited,
    goodCount,
    watchCount,
    criticalCount,
    offlineCount,
    activeCount: warehouses.length - offlineCount,
  };
}

// ─── Alerts page data ─────────────────────────────────────────────────────────

const PARAM_TEMPLATES = [
  {type: 'temperature' as AlertParamType, label: 'Temperature', titles: {critical: 'Temperature Critical', high: 'Temperature High', medium: 'Temperature Elevated', low: 'Slight Temp Rise', info: 'Temp Sensor Note'}, unit: '°C', threshold: '32.0', valueFn: (wh: WarehouseReading) => wh.temp},
  {type: 'humidity' as AlertParamType, label: 'Humidity', titles: {critical: 'Humidity Critical', high: 'Humidity Elevated', medium: 'Humidity Warning', low: 'Humidity Borderline', info: 'Humidity Note'}, unit: '%', threshold: '70', valueFn: (wh: WarehouseReading) => wh.humidity},
  {type: 'moisture' as AlertParamType, label: 'Moisture', titles: {critical: 'Moisture Overload', high: 'Moisture Rising', medium: 'Moisture Warning', low: 'Slight Moisture Rise', info: 'Moisture Note'}, unit: '%', threshold: '13.0', valueFn: (wh: WarehouseReading) => wh.moisture},
  {type: 'co2' as AlertParamType, label: 'CO₂', titles: {critical: 'CO₂ Critical', high: 'CO₂ Elevated', medium: 'CO₂ Rising', low: 'CO₂ Note', info: 'CO₂ Stable'}, unit: 'ppm', threshold: '560', valueFn: (wh: WarehouseReading) => wh.co2},
  {type: 'aqi' as AlertParamType, label: 'AQI', titles: {critical: 'AQI Critical', high: 'AQI Threshold Breach', medium: 'AQI Alert', low: 'AQI Note', info: 'AQI OK'}, unit: '', threshold: '50', valueFn: (wh: WarehouseReading) => wh.aqi},
];

const ALERT_SEV_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

function mapWHSevToAlertSev(wh: WarehouseReading, param: (typeof PARAM_TEMPLATES)[0]): AlertSeverity {
  const val = param.valueFn(wh);
  if (!val) return 'info';
  if (param.type === 'temperature') {
    if (val >= 35) return 'critical';
    if (val >= 32) return 'high';
    if (val >= 29) return 'medium';
    if (val >= 28) return 'low';
    return 'info';
  }
  if (param.type === 'humidity') {
    if (val >= 80) return 'critical';
    if (val >= 74) return 'high';
    if (val >= 65) return 'medium';
    if (val >= 62) return 'low';
    return 'info';
  }
  if (param.type === 'moisture') {
    if (val >= 15) return 'critical';
    if (val >= 14) return 'high';
    if (val >= 13) return 'medium';
    if (val >= 12.5) return 'low';
    return 'info';
  }
  return wh.status === 'high' ? 'high' : wh.status === 'medium' ? 'medium' : 'info';
}

export function getAlertsData(date: Date): AlertsData {
  const warehouses = getWarehouseReadings(date);
  const key = dk(date);
  const alerts: Alert[] = [];
  let idx = 1;

  for (const wh of warehouses) {
    if (!wh.temp) continue;
    for (const param of PARAM_TEMPLATES) {
      const val = param.valueFn(wh);
      if (!val) continue;
      const sev = mapWHSevToAlertSev(wh, param);
      if (sev === 'info' && rb(`${key}-skip-info-${wh.id}-${param.type}`, 0.5)) continue;

      const statusOpts: AlertStatus[] =
        sev === 'critical' || sev === 'high' ? ['active', 'active', 'acknowledged'] :
        sev === 'medium' ? ['active', 'acknowledged', 'resolved'] : ['acknowledged', 'resolved', 'resolved'];
      const statusIdx = ri(`${key}-s-${wh.id}-${param.type}`, 0, statusOpts.length - 1);
      const status = statusOpts[statusIdx];

      const hh = ri(`${key}-th-${idx}`, 8, 11);
      const mm = ri(`${key}-tm-${idx}`, 0, 59);
      const am = rb(`${key}-tap-${idx}`) ? 'AM' : 'PM';
      const time = `${hh}:${mm.toString().padStart(2, '0')} ${am}`;

      alerts.push({
        id: `A-${String(idx).padStart(3, '0')}`,
        severity: sev,
        title: param.titles[sev],
        warehouse: wh.id,
        zone: `Zone ${ri(`${key}-z-${idx}`, 1, 4)}`,
        parameter: param.label,
        value: `${val} ${param.unit}`.trim(),
        threshold: `>${param.threshold} ${param.unit}`.trim(),
        time,
        status,
        type: param.type,
      });
      idx++;
    }
  }

  const sysWH = warehouses.find(w => !w.temp) ?? warehouses[0];
  alerts.push({id: `A-${String(idx++).padStart(3, '0')}`, severity: 'info', title: 'Sensor Recalibrated', warehouse: sysWH.id, zone: 'Zone 1', parameter: 'System', value: '—', threshold: '—', time: `${ri(`${key}-sh`, 9, 10)}:${ri(`${key}-sm`, 0, 59).toString().padStart(2, '0')} AM`, status: 'resolved', type: 'system'});
  alerts.push({id: `A-${String(idx++).padStart(3, '0')}`, severity: 'info', title: 'Maintenance Scheduled', warehouse: 'WH-H', zone: 'All Zones', parameter: 'System', value: '—', threshold: '—', time: '10:00 AM', status: 'muted', type: 'system'});

  alerts.sort((a, b) => ALERT_SEV_ORDER.indexOf(a.severity) - ALERT_SEV_ORDER.indexOf(b.severity));

  const critical = alerts.filter(a => a.severity === 'critical').length;
  const warning  = alerts.filter(a => a.severity === 'high' || a.severity === 'medium').length;
  const info     = alerts.filter(a => a.severity === 'low' || a.severity === 'info').length;
  const resolved = alerts.filter(a => a.status === 'resolved').length;

  const typeMap: Record<AlertParamType, number> = {temperature: 0, humidity: 0, moisture: 0, co2: 0, aqi: 0, capacity: 0, system: 0};
  for (const a of alerts) typeMap[a.type]++;

  const alertsByType = [
    {label: 'Temperature', count: typeMap.temperature, color: '#f59e0b'},
    {label: 'Humidity',    count: typeMap.humidity,    color: '#3b82f6'},
    {label: 'Moisture',    count: typeMap.moisture,    color: '#10b981'},
    {label: 'CO₂',         count: typeMap.co2,         color: '#8b5cf6'},
    {label: 'AQI',         count: typeMap.aqi,         color: '#ef4444'},
    {label: 'System',      count: typeMap.system,      color: '#9ca3af'},
  ].filter(t => t.count > 0);

  const alertTrendData: AlertTrendPoint[] = Array.from({length: 7}, (_, i) => {
    const d = addDays(date, i - 6);
    const dw = getWarehouseReadings(d);
    const dKey = dk(d);
    const bad = dw.filter(w => w.status === 'high').length;
    const med = dw.filter(w => w.status === 'medium').length;
    return {
      day: dayLabel(d),
      Critical: Math.max(0, Math.round(bad * 1.5 + rr(`${dKey}-tc`, -0.5, 1.5))),
      Warning:  Math.max(0, Math.round(med * 2   + rr(`${dKey}-tw`, -1, 3))),
      Info:     Math.max(0, Math.round(10        + rr(`${dKey}-ti`, -4, 6))),
    };
  });

  const recentFeed = alerts
    .filter(a => a.severity !== 'info')
    .slice(0, 5)
    .map((a, i) => ({
      id: `r${i + 1}`,
      severity: a.severity,
      warehouse: a.warehouse,
      zone: a.zone,
      message: `${a.parameter} ${a.value} — ${a.status}`,
      time: a.time,
    }));

  const heatmapData: number[][] = Array.from({length: 7}, (_, di) => {
    const d = addDays(date, di - 6);
    const dKey = dk(d);
    const dw = getWarehouseReadings(d);
    const stress = dw.filter(w => w.status !== 'good' && w.status !== 'inactive').length;
    return Array.from({length: 8}, (_, ti) =>
      Math.max(0, Math.round(stress * (ti >= 2 && ti <= 5 ? 2 : 0.5) + rr(`${dKey}-hm-${ti}`, 0, 3)))
    );
  });

  return {alerts, alertSummary: {total: alerts.length, critical, warning, info, resolved}, alertsByType, alertTrendData, recentFeed, heatmapData};
}

// ─── Storage page data ────────────────────────────────────────────────────────

export function getStorageData(date: Date): StorageData {
  const warehouses = getWarehouseReadings(date);
  const active = warehouses.filter(w => w.temp !== null);

  const totalCap  = warehouses.reduce((s, w) => s + w.capacity, 0);
  const totalUsed = warehouses.reduce((s, w) => s + w.used, 0);
  const avgTemp     = +(active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length).toFixed(1);
  const avgHumidity = Math.round(active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length);

  const stabilityData: StabilityPoint[] = Array.from({length: 7}, (_, i) => {
    const d = addDays(date, i - 6);
    const dw = getWarehouseReadings(d);
    function stability(whId: string): number {
      const wh = dw.find(w => w.id === whId);
      if (!wh || !wh.temp) return 50;
      const tScore = Math.max(0, 100 - Math.max(0, wh.temp - 25) * 8);
      const hScore = Math.max(0, 100 - Math.max(0, (wh.humidity ?? 60) - 60) * 4);
      return Math.round(tScore * 0.6 + hScore * 0.4);
    }
    return {day: dayLabel(d), 'WH-A': stability('WH-A'), 'WH-B': stability('WH-B'), 'WH-C': stability('WH-C'), 'WH-D': stability('WH-D')};
  });

  const total = warehouses.length;
  const counts = {
    good:     warehouses.filter(w => w.status === 'good').length,
    medium:   warehouses.filter(w => w.status === 'medium').length,
    high:     warehouses.filter(w => w.status === 'high').length,
    inactive: warehouses.filter(w => w.status === 'inactive').length,
  };

  return {
    warehouses,
    totals: {
      totalWarehouses: total,
      totalZones: total * 4,
      totalCapacity: totalCap,
      totalUsed,
      usedPct: Math.round((totalUsed / totalCap) * 100),
      avgTemp, avgHumidity,
      activeCount: active.length,
      highRiskUnits: warehouses.filter(w => w.status === 'high').length,
    },
    stabilityData,
    zoneSummary: [
      {label: 'Good',     color: '#22c55e', count: counts.good,     pct: Math.round(counts.good / total * 100)},
      {label: 'Medium',   color: '#f59e0b', count: counts.medium,   pct: Math.round(counts.medium / total * 100)},
      {label: 'High',     color: '#ef4444', count: counts.high,     pct: Math.round(counts.high / total * 100)},
      {label: 'Inactive', color: '#9ca3af', count: counts.inactive, pct: Math.round(counts.inactive / total * 100)},
    ],
    topCritical: warehouses.filter(w => w.status === 'high' || w.status === 'medium').slice(0, 4),
  };
}

// ─── Analytics page data ──────────────────────────────────────────────────────

export function getAnalyticsData(date: Date): AnalyticsData {
  const warehouses = getWarehouseReadings(date);
  const key = dk(date);
  const active = warehouses.filter(w => w.temp !== null);

  const goodPct = (warehouses.filter(w => w.status === 'good').length / warehouses.length) * 100;

  const bad = active.filter(w => (w.temp ?? 0) >= 29).length;
  const badH = active.filter(w => (w.humidity ?? 0) >= 65).length;
  const ts = Math.max(50, Math.round(100 - bad * 8 + rr(`${key}-tst`, -3, 3)));
  const hs = Math.max(50, Math.round(100 - badH * 6 + rr(`${key}-hst`, -3, 3)));
  const spoilRisk = +(Math.max(1, Math.min(15, 15 - goodPct / 10 + rr(`${key}-sr`, -1, 1))).toFixed(1));

  const kpis: AnalyticsKPI[] = [
    {label: 'Temp Stability',     value: ts,    unit: '%', delta: rr(`${key}-kd1`, -3, 3).toFixed(1) + '%', trend: ts > 80 ? 'up' : 'down',    colorKey: 'amber'},
    {label: 'Humidity Stability', value: hs,    unit: '%', delta: rr(`${key}-kd2`, -2, 2).toFixed(1) + '%', trend: hs > 80 ? 'up' : 'stable',  colorKey: 'blue'},
    {label: 'Storage Efficiency', value: Math.round(goodPct + rr(`${key}-kd3`, -5, 5)), unit: '%', delta: '+' + rr(`${key}-kd3d`, 0.5, 2).toFixed(1) + '%', trend: 'up', colorKey: 'green'},
    {label: 'AI Accuracy',        value: Math.round(93 + rr(`${key}-kd4`, -3, 4)), unit: '%', delta: '+' + rr(`${key}-kd4d`, 0.1, 0.5).toFixed(1) + '%', trend: 'stable', colorKey: 'purple'},
    {label: 'Spoilage Risk',      value: spoilRisk, unit: '%', delta: '-' + rr(`${key}-kd5`, 0.2, 1.5).toFixed(1) + '%', trend: 'down', colorKey: 'red', invertedTrend: true},
    {label: 'Sensor Health',      value: Math.round(90 + rr(`${key}-kd6`, -5, 5)), unit: '%', delta: '+' + rr(`${key}-kd6d`, 0.1, 0.8).toFixed(1) + '%', trend: 'up', colorKey: 'teal'},
  ];

  const envTrendData: EnvTrendPoint[] = Array.from({length: 14}, (_, i) => {
    const d = addDays(date, i - 13);
    const dw = getWarehouseReadings(d);
    const da = dw.filter(w => w.temp !== null);
    const avgT = da.reduce((s, w) => s + (w.temp ?? 0), 0) / da.length;
    const avgH = da.reduce((s, w) => s + (w.humidity ?? 0), 0) / da.length;
    const avgM = da.reduce((s, w) => s + (w.moisture ?? 0), 0) / da.length;
    const dKey = dk(d);
    return {
      day: dayLabel(d),
      Temperature: Math.max(40, Math.round(100 - Math.max(0, avgT - 24) * 5)),
      Humidity:    Math.max(40, Math.round(100 - Math.max(0, avgH - 55) * 2.5)),
      Moisture:    Math.max(40, Math.round(100 - Math.max(0, avgM - 10) * 8)),
      CO2:         Math.min(98, Math.max(60, Math.round(88 + rr(`${dKey}-co2s`, -10, 6)))),
      AQI:         Math.min(98, Math.max(60, Math.round(90 + rr(`${dKey}-aqis`, -8, 5)))),
    };
  });

  const whPerformanceData: WHPerformancePoint[] = warehouses
    .filter(w => w.temp !== null)
    .map(wh => {
      const eff  = Math.max(40, Math.round(100 - (wh.status === 'high' ? 30 : wh.status === 'medium' ? 15 : 5) + rr(`${key}-eff-${wh.id}`, -5, 5)));
      const stab = Math.max(40, Math.round(100 - (wh.status === 'high' ? 35 : wh.status === 'medium' ? 18 : 6) + rr(`${key}-stab-${wh.id}`, -5, 5)));
      return {warehouse: wh.id, Efficiency: eff, Stability: stab, Utilization: wh.usedPct};
    });

  const best  = whPerformanceData.reduce((a, b) => (a.Efficiency + a.Stability > b.Efficiency + b.Stability ? a : b));
  const worst = whPerformanceData.reduce((a, b) => (a.Efficiency + a.Stability < b.Efficiency + b.Stability ? a : b));
  const bestWH  = warehouses.find(w => w.id === best.warehouse);
  const worstWH = warehouses.find(w => w.id === worst.warehouse);

  const offlineCount = ri(`${key}-sens-off`, 0, 3);
  const onlineCount  = active.length * 4;
  const warningCount = warehouses.filter(w => w.status !== 'good' && w.status !== 'inactive').length * 2;

  return {
    kpis, envTrendData, whPerformanceData,
    topWarehouse: {
      name: best.warehouse,
      detail: bestWH ? `${bestWH.temp?.toFixed(1)}°C · ${bestWH.humidity}% RH · ${bestWH.usedPct}% capacity` : 'Optimal conditions',
      score: best.Efficiency,
    },
    worstWarehouse: {
      name: worst.warehouse,
      detail: worstWH ? `${worstWH.temp?.toFixed(1)}°C · ${worstWH.humidity}% RH · status: ${worstWH.status}` : 'Needs attention',
      score: Math.round(10 + rr(`${key}-wrisk`, 5, 20)),
    },
    overallStability: Math.round((ts + hs) / 2),
    sensorSummary: {online: onlineCount, offline: offlineCount, warning: warningCount, total: onlineCount + offlineCount + warningCount},
  };
}

// ─── Predictions page data ────────────────────────────────────────────────────

export function getPredictionsData(date: Date): PredictionsData {
  const warehouses = getWarehouseReadings(date);
  const key = dk(date);
  const active = warehouses.filter(w => w.temp !== null);
  const avgTemp  = active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length;
  const avgHum   = active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length;
  const avgMoist = active.reduce((s, w) => s + (w.moisture ?? 0), 0) / active.length;

  function mkSpark(base: number, days: number, stepMin: number, stepMax: number, seedPfx: string): number[] {
    const arr: number[] = [+base.toFixed(2)];
    for (let i = 1; i < days; i++) {
      const prev = arr[arr.length - 1];
      arr.push(+(prev + rr(`${key}-${seedPfx}-${i}`, stepMin, stepMax)).toFixed(2));
    }
    return arr;
  }

  const tCurr = +avgTemp.toFixed(1);
  const hCurr = Math.round(avgHum);
  const mCurr = +avgMoist.toFixed(1);
  const co2   = Math.round(active.reduce((s, w) => s + (w.co2 ?? 540), 0) / active.length);
  const aqi   = Math.round(active.reduce((s, w) => s + (w.aqi ?? 44), 0) / active.length);

  const paramCards: ParamForecastCard[] = [
    {key: 'temp',     label: 'Temperature',     unit: '°C',  current: tCurr, forecast: +(tCurr + rr(`${key}-tf`, 0.5, 2.5)).toFixed(1), rangeMin: +(tCurr - 1).toFixed(1), rangeMax: +(tCurr + 4).toFixed(1), trend: 'up',        confidence: ri(`${key}-tc`, 82, 93), sparkData: mkSpark(tCurr - 1, 7, 0.1, 0.5, 'tsp'),  colorKey: 'amber'},
    {key: 'humidity', label: 'Humidity',         unit: '%',   current: hCurr, forecast: Math.round(hCurr + rr(`${key}-hf`, 1, 5)),        rangeMin: hCurr - 3,              rangeMax: hCurr + 7,              trend: 'slight-up', confidence: ri(`${key}-hc`, 80, 90), sparkData: mkSpark(hCurr - 2, 7, 0.1, 0.8, 'hsp'),  colorKey: 'blue'},
    {key: 'moisture', label: 'Moisture Content', unit: '%',   current: mCurr, forecast: +(mCurr + rr(`${key}-mf`, 0.2, 1)).toFixed(1),    rangeMin: +(mCurr - 0.5).toFixed(1), rangeMax: +(mCurr + 2).toFixed(1), trend: 'slight-up', confidence: ri(`${key}-mc`, 78, 88), sparkData: mkSpark(mCurr - 0.3, 7, 0.02, 0.15, 'msp'), colorKey: 'green'},
    {key: 'co2',      label: 'CO₂ Level',        unit: 'ppm', current: co2,   forecast: Math.round(co2 + rr(`${key}-cf2`, 5, 20)),         rangeMin: co2 - 15,              rangeMax: co2 + 30,               trend: 'up',        confidence: ri(`${key}-cc`, 74, 85), sparkData: mkSpark(co2 - 5, 7, 0.5, 3, 'csp'),       colorKey: 'purple'},
    {key: 'aqi',      label: 'Air Quality',       unit: 'AQI', current: aqi,   forecast: Math.round(aqi + rr(`${key}-af`, 1, 4)),           rangeMin: aqi - 5,               rangeMax: aqi + 8,                trend: 'stable',    confidence: ri(`${key}-ac`, 85, 95), sparkData: mkSpark(aqi - 1, 7, 0, 0.5, 'asp'),       colorKey: 'teal'},
  ];

  const capCurr = Math.round(active.reduce((s, w) => s + w.usedPct, 0) / active.length);
  paramCards.push({
    key: 'capacity', label: 'Storage Capacity', unit: '%',
    current: capCurr,
    forecast: Math.min(95, Math.round(capCurr + rr(`${key}-cap-f`, 1, 3))),
    rangeMin: capCurr - 2, rangeMax: capCurr + 5,
    trend: 'up', confidence: ri(`${key}-capc`, 88, 96),
    sparkData: mkSpark(capCurr - 1, 7, 0.1, 0.4, 'capsp'),
    colorKey: 'indigo',
  });

  const forecastData: ForecastPoint[] = Array.from({length: 7}, (_, i) => {
    const d = addDays(date, i + 1);
    const row: ForecastPoint = {day: dayLabel(d)};
    for (const wh of WH_BASES) {
      const base = getWarehouseReadings(d).find(w => w.id === wh.id);
      row[wh.id] = base ? Math.round((base.temp ?? 25) / 35 * 100) : 50;
    }
    return row;
  });

  const whPredTable: WHPredRow[] = warehouses.filter(w => w.temp !== null).map(wh => {
    const stressScore = wh.status === 'high' ? 3 : wh.status === 'medium' ? 1.5 : 0;
    const spoilage30d = Math.min(95, Math.max(5, Math.round(stressScore * 20 + rr(`${key}-sp30-${wh.id}`, -5, 15))));
    const trend: TrendDir = wh.status === 'high' ? 'up' : wh.status === 'medium' ? 'slight-up' : 'stable';
    return {
      id: wh.id, name: wh.name, overallRisk: wh.risk,
      spoilage30d,
      tempForecast:  +((wh.temp ?? 25) + rr(`${key}-ptf-${wh.id}`, 0.2, 1.5)).toFixed(1),
      humForecast:   Math.round((wh.humidity ?? 60) + rr(`${key}-phf-${wh.id}`, 0.5, 3)),
      moistForecast: +((wh.moisture ?? 11) + rr(`${key}-pmf-${wh.id}`, 0.1, 0.8)).toFixed(1),
      co2Forecast:   Math.round((wh.co2 ?? 520) + ri(`${key}-pcf-${wh.id}`, 5, 25)),
      aqiForecast:   Math.round((wh.aqi ?? 40) + ri(`${key}-paf-${wh.id}`, 1, 5)),
      capForecast:   Math.min(99, Math.round(wh.usedPct + rr(`${key}-pcap-${wh.id}`, 0.5, 2))),
      trend, confidence: ri(`${key}-pconf-${wh.id}`, 76, 95),
    };
  });

  const riskForecastData = Array.from({length: 7}, (_, i) => {
    const d = addDays(date, i + 1);
    const dw = getWarehouseReadings(d);
    return {
      day: dayLabel(d),
      Low:    dw.filter(w => w.risk === 'low').length,
      Medium: dw.filter(w => w.risk === 'medium').length,
      High:   dw.filter(w => w.risk === 'high').length,
    };
  });

  return {paramCards, forecastData, whPredTable, riskForecastData};
}

// ─── Reports page data ────────────────────────────────────────────────────────

export function getReportsData(date: Date): ReportsData {
  const key = dk(date);
  const reportTypes: ReportType[] = ['environmental', 'compliance', 'performance', 'alert-summary', 'custom'];
  const typeColors = ['#1f5135', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const typeLabels = ['Environmental', 'Compliance', 'Performance', 'Alert Summary', 'Custom'];
  const WHs = ['WH-A', 'WH-B', 'WH-C', 'WH-D', 'WH-E', 'WH-F', 'WH-G', 'All'];

  const recentReports: ReportItem[] = Array.from({length: 8}, (_, i) => {
    const t = reportTypes[ri(`${key}-rt-${i}`, 0, 4)];
    const wh = WHs[ri(`${key}-rw-${i}`, 0, 7)];
    const hh = ri(`${key}-rh-${i}`, 8, 16);
    const mm = ri(`${key}-rm-${i}`, 0, 59);
    const daysAgo = ri(`${key}-rd-${i}`, 0, 6);
    const when = daysAgo === 0 ? `Today ${hh}:${mm.toString().padStart(2, '0')}` : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
    const d = addDays(date, -daysAgo);
    const dateStr = `${d.toLocaleString('default', {month: 'short'})} ${d.getDate()}, ${d.getFullYear()}`;
    const generators = ['System', 'Auto-Scheduler', 'Admin User', 'Analytics Engine'];
    const genBy = generators[ri(`${key}-rgby-${i}`, 0, 3)];
    return {
      id: `RPT-${String(ri(`${key}-rid-${i}`, 1000, 9999))}`,
      type: t,
      title: `${typeLabels[reportTypes.indexOf(t)]} Report`,
      warehouse: wh,
      period: `Week ${ri(`${key}-rp-${i}`, 1, 4)}, ${date.getFullYear()}`,
      generatedAt: when,
      dateGenerated: dateStr,
      generatedBy: genBy,
      size: `${ri(`${key}-rs-${i}`, 80, 980)} KB`,
      downloads: ri(`${key}-rdl-${i}`, 0, 24),
      status: rb(`${key}-rstat-${i}`, 0.85) ? 'ready' : 'processing',
    };
  });

  const typeCountMap: Record<ReportType, number> = {environmental: 0, compliance: 0, performance: 0, 'alert-summary': 0, custom: 0};
  for (const rep of recentReports) typeCountMap[rep.type]++;

  const reportTypeData = reportTypes.map((t, i) => ({label: typeLabels[i], count: typeCountMap[t] + ri(`${key}-rtc-${i}`, 0, 5), color: typeColors[i]}));

  const reportTrendData = Array.from({length: 7}, (_, i) => {
    const d = addDays(date, i - 6);
    const dKey = dk(d);
    return {day: dayLabel(d), Generated: ri(`${dKey}-rgen`, 2, 12), Downloaded: ri(`${dKey}-rdld`, 1, 8)};
  });

  const total     = recentReports.length + ri(`${key}-rtot`, 20, 60);
  const thisWeek  = ri(`${key}-rthisw`, 4, 14);
  const downloads = ri(`${key}-rdlst`, 30, 120);
  const scheduled = ri(`${key}-rsched`, 2, 8);

  return {
    stats: [
      {label: 'Total Reports', value: total,     delta: `+${ri(`${key}-rtd`, 2, 8)}`,    deltaPositive: true,  colorKey: 'blue'},
      {label: 'This Week',     value: thisWeek,  delta: `+${ri(`${key}-rtwd`, 1, 4)}`,   deltaPositive: true,  colorKey: 'green'},
      {label: 'Downloads',     value: downloads, delta: `+${ri(`${key}-rdld2`, 5, 20)}`, deltaPositive: true,  colorKey: 'purple'},
      {label: 'Scheduled',     value: scheduled, delta: `${ri(`${key}-rsd`, 0, 2)}`,     deltaPositive: false, colorKey: 'amber'},
    ],
    recentReports,
    reportTypeData,
    reportTrendData,
  };
}

// ─── Parameter trend data ─────────────────────────────────────────────────────

export function getParamTrendData(date: Date): ParamTrendPoint[] {
  const warehouses = getWarehouseReadings(date);
  const active = warehouses.filter(w => w.temp !== null);
  const key = dk(date);

  const avgT = active.reduce((s, w) => s + (w.temp ?? 0), 0) / active.length;
  const avgH = active.reduce((s, w) => s + (w.humidity ?? 0), 0) / active.length;
  const avgM = active.reduce((s, w) => s + (w.moisture ?? 0), 0) / active.length;
  const avgC = active.reduce((s, w) => s + (w.co2 ?? 540), 0) / active.length;

  const THRESHOLDS = {temp: 35, humidity: 85, moisture: 16, co2: 650};
  const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  return hours.map((time, i) => ({
    time,
    temp:     +Math.max(30, Math.min(100, (avgT / THRESHOLDS.temp * 100) + rr(`${key}-pt-${i}`, -10, 10))).toFixed(1),
    humidity: +Math.max(30, Math.min(100, (avgH / THRESHOLDS.humidity * 100) + rr(`${key}-ph-${i}`, -8, 8))).toFixed(1),
    moisture: +Math.max(30, Math.min(100, (avgM / THRESHOLDS.moisture * 100) + rr(`${key}-pm-${i}`, -6, 6))).toFixed(1),
    co2:      +Math.max(30, Math.min(100, (avgC / THRESHOLDS.co2 * 100) + rr(`${key}-pc-${i}`, -5, 5))).toFixed(1),
  }));
}
