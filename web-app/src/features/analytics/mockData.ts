export type TrendDir = 'up' | 'down' | 'stable' | 'slight-up' | null;
export type RiskLevel = 'low' | 'medium' | 'high' | 'inactive';
export type InsightType = 'warning' | 'optimization' | 'prediction' | 'success' | 'anomaly';
export type EventType = 'ai' | 'insight' | 'sync' | 'alert' | 'success';

// ─── KPI Summary Cards ────────────────────────────────────────────────────────

export interface AnalyticsKPI {
  label: string;
  value: number;
  unit: string;
  delta: string;
  trend: TrendDir;
  invertedTrend?: boolean;
  colorKey: 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'teal';
}

export const analyticsKPIs: AnalyticsKPI[] = [
  { label: 'Temp Stability',     value: 87.4, unit: '%', delta: '+2.1%', trend: 'up',     colorKey: 'amber'  },
  { label: 'Humidity Stability', value: 82.1, unit: '%', delta: '0.0%',  trend: 'stable', colorKey: 'blue'   },
  { label: 'Capacity Utilization', value: 68.0, unit: '%', delta: '+1.3%', trend: 'up',     colorKey: 'green'  },
  { label: 'Spoilage Risk',      value: 4.2,  unit: '%', delta: '-0.8%', trend: 'down',   colorKey: 'red',   invertedTrend: true },
  { label: 'Sensor Health',      value: 94.8, unit: '%', delta: '+0.5%', trend: 'up',     colorKey: 'teal'   },
];

// ─── Environmental Trends (14-day stability indices 0–100) ────────────────────

export interface EnvTrendPoint {
  day: string;
  Temperature: number;
  Humidity: number;
  Moisture: number;
  CO2: number;
  AQI: number;
}

export const envTrendData: EnvTrendPoint[] = [
  { day: 'May 13', Temperature: 78, Humidity: 74, Moisture: 82, CO2: 88, AQI: 91 },
  { day: 'May 14', Temperature: 81, Humidity: 72, Moisture: 80, CO2: 85, AQI: 89 },
  { day: 'May 15', Temperature: 76, Humidity: 69, Moisture: 78, CO2: 82, AQI: 87 },
  { day: 'May 16', Temperature: 74, Humidity: 67, Moisture: 76, CO2: 79, AQI: 84 },
  { day: 'May 17', Temperature: 79, Humidity: 70, Moisture: 80, CO2: 83, AQI: 88 },
  { day: 'May 18', Temperature: 83, Humidity: 73, Moisture: 83, CO2: 87, AQI: 91 },
  { day: 'May 19', Temperature: 85, Humidity: 75, Moisture: 85, CO2: 89, AQI: 92 },
  { day: 'May 20', Temperature: 82, Humidity: 71, Moisture: 81, CO2: 86, AQI: 90 },
  { day: 'May 21', Temperature: 79, Humidity: 68, Moisture: 79, CO2: 83, AQI: 88 },
  { day: 'May 22', Temperature: 77, Humidity: 65, Moisture: 76, CO2: 80, AQI: 85 },
  { day: 'May 23', Temperature: 80, Humidity: 68, Moisture: 80, CO2: 84, AQI: 89 },
  { day: 'May 24', Temperature: 84, Humidity: 72, Moisture: 84, CO2: 88, AQI: 92 },
  { day: 'May 25', Temperature: 87, Humidity: 76, Moisture: 87, CO2: 91, AQI: 94 },
  { day: 'May 26', Temperature: 85, Humidity: 74, Moisture: 85, CO2: 89, AQI: 93 },
];

export const envTrendSeries = [
  { key: 'Temperature' as const, color: '#f59e0b', label: 'Temperature' },
  { key: 'Humidity'    as const, color: '#3b82f6', label: 'Humidity'    },
  { key: 'Moisture'    as const, color: '#10b981', label: 'Moisture'    },
  { key: 'CO2'         as const, color: '#8b5cf6', label: 'CO₂'         },
  { key: 'AQI'         as const, color: '#14b8a6', label: 'AQI'         },
];

// ─── Warehouse Performance Comparison ─────────────────────────────────────────

export interface WHPerformancePoint {
  warehouse: string;
  Efficiency: number;
  Stability: number;
  Utilization: number;
}

export const whPerformanceData: WHPerformancePoint[] = [
  { warehouse: 'WH-A', Efficiency: 94, Stability: 91, Utilization: 73 },
  { warehouse: 'WH-B', Efficiency: 78, Stability: 68, Utilization: 67 },
  { warehouse: 'WH-C', Efficiency: 61, Stability: 52, Utilization: 81 },
  { warehouse: 'WH-D', Efficiency: 90, Stability: 88, Utilization: 61 },
  { warehouse: 'WH-E', Efficiency: 88, Stability: 85, Utilization: 70 },
  { warehouse: 'WH-F', Efficiency: 75, Stability: 71, Utilization: 73 },
  { warehouse: 'WH-G', Efficiency: 95, Stability: 93, Utilization: 52 },
];

// ─── Spoilage Prediction (next 7 days, % probability) ────────────────────────

export interface SpoilagePredPoint {
  day: string;
  'Low Risk': number;
  'Medium Risk': number;
  'High Risk': number;
}

export const spoilagePredData: SpoilagePredPoint[] = [
  { day: 'May 26', 'Low Risk': 2.1,  'Medium Risk': 8.4,  'High Risk': 18.2 },
  { day: 'May 27', 'Low Risk': 2.0,  'Medium Risk': 8.9,  'High Risk': 19.8 },
  { day: 'May 28', 'Low Risk': 2.2,  'Medium Risk': 9.3,  'High Risk': 21.5 },
  { day: 'May 29', 'Low Risk': 1.9,  'Medium Risk': 9.8,  'High Risk': 23.1 },
  { day: 'May 30', 'Low Risk': 2.1,  'Medium Risk': 10.4, 'High Risk': 24.8 },
  { day: 'May 31', 'Low Risk': 2.3,  'Medium Risk': 11.0, 'High Risk': 26.4 },
  { day: 'Jun 01', 'Low Risk': 2.0,  'Medium Risk': 11.6, 'High Risk': 28.1 },
];

// ─── Sensor Health per Warehouse ──────────────────────────────────────────────

export interface SensorHealthItem {
  warehouse: string;
  total: number;
  online: number;
  uptime: number;
}

export const sensorHealthData: SensorHealthItem[] = [
  { warehouse: 'WH-A', total: 5, online: 5, uptime: 100.0 },
  { warehouse: 'WH-B', total: 5, online: 5, uptime: 99.2  },
  { warehouse: 'WH-C', total: 5, online: 4, uptime: 97.8  },
  { warehouse: 'WH-D', total: 4, online: 4, uptime: 100.0 },
  { warehouse: 'WH-E', total: 4, online: 4, uptime: 98.5  },
  { warehouse: 'WH-F', total: 5, online: 5, uptime: 96.3  },
  { warehouse: 'WH-G', total: 4, online: 4, uptime: 100.0 },
  { warehouse: 'WH-H', total: 2, online: 0, uptime: 0     },
];

// ─── AI Insights ──────────────────────────────────────────────────────────────

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  detail: string;
  confidence: number;
  time: string;
}

export const aiInsights: AIInsight[] = [
  {
    id: 'i1', type: 'warning',
    title: 'WH-C Intervention Required',
    detail: 'Temperature trending toward critical. Recommend emergency ventilation within 2 hours to prevent spoilage escalation.',
    confidence: 94, time: '10:31 AM',
  },
  {
    id: 'i2', type: 'optimization',
    title: 'WH-G Operating at Peak',
    detail: 'Warehouse G at optimal efficiency. Conditions ideal for long-term grain storage. Stability index 93 — highest on campus.',
    confidence: 98, time: '10:15 AM',
  },
  {
    id: 'i3', type: 'prediction',
    title: '7-Day Spoilage Forecast: WH-C',
    detail: 'AI projects 28.1% spoilage probability by Jun 1 if current WH-C conditions persist. Immediate action recommended.',
    confidence: 89, time: '10:00 AM',
  },
  {
    id: 'i4', type: 'optimization',
    title: 'Cross-Warehouse Rebalancing',
    detail: 'Transfer 200T from WH-C to WH-G recommended. WH-G has 48% remaining capacity at optimal storage conditions.',
    confidence: 86, time: '09:45 AM',
  },
  {
    id: 'i5', type: 'success',
    title: 'WH-D Stability Restored',
    detail: 'Post-ventilation: WH-D temperature normalised. Stability index improved from 76 to 88 over the last 4 hours.',
    confidence: 97, time: '09:30 AM',
  },
];

// ─── Analytics Table ──────────────────────────────────────────────────────────

export interface AnalyticsRow {
  id: string;
  name: string;
  avgTemp: number | null;
  humidityScore: number | null;
  spoilageProb: number | null;
  storageEfficiency: number | null;
  aiRisk: RiskLevel;
  sensorHealth: number;
  trend: TrendDir | null;
}

export const analyticsTableData: AnalyticsRow[] = [
  { id: 'WH-A', name: 'Warehouse A', avgTemp: 27.2, humidityScore: 91, spoilageProb: 2.1,  storageEfficiency: 94, aiRisk: 'low',      sensorHealth: 100, trend: 'up'        },
  { id: 'WH-B', name: 'Warehouse B', avgTemp: 29.7, humidityScore: 72, spoilageProb: 8.4,  storageEfficiency: 78, aiRisk: 'medium',   sensorHealth: 99,  trend: 'up'        },
  { id: 'WH-C', name: 'Warehouse C', avgTemp: 32.0, humidityScore: 58, spoilageProb: 18.2, storageEfficiency: 61, aiRisk: 'high',     sensorHealth: 97,  trend: 'up'        },
  { id: 'WH-D', name: 'Warehouse D', avgTemp: 27.5, humidityScore: 88, spoilageProb: 1.8,  storageEfficiency: 90, aiRisk: 'low',      sensorHealth: 100, trend: 'stable'    },
  { id: 'WH-E', name: 'Warehouse E', avgTemp: 27.4, humidityScore: 87, spoilageProb: 1.9,  storageEfficiency: 88, aiRisk: 'low',      sensorHealth: 98,  trend: 'stable'    },
  { id: 'WH-F', name: 'Warehouse F', avgTemp: 30.3, humidityScore: 69, spoilageProb: 9.8,  storageEfficiency: 75, aiRisk: 'medium',   sensorHealth: 96,  trend: 'slight-up' },
  { id: 'WH-G', name: 'Warehouse G', avgTemp: 26.5, humidityScore: 94, spoilageProb: 0.9,  storageEfficiency: 95, aiRisk: 'low',      sensorHealth: 100, trend: 'stable'    },
  { id: 'WH-H', name: 'Warehouse H', avgTemp: null, humidityScore: null, spoilageProb: null, storageEfficiency: null, aiRisk: 'inactive', sensorHealth: 0, trend: null     },
];

// ─── Sidebar Widgets ──────────────────────────────────────────────────────────

export const topWarehouse    = { id: 'WH-G', name: 'Warehouse G', score: 95.2, detail: 'Optimal conditions · 100% sensor uptime' };
export const worstWarehouse  = { id: 'WH-C', name: 'Warehouse C', score: 18.2, detail: '32.0°C average · Zone 3 critical' };
export const overallStability = 78.4;
export const sensorSummary   = { total: 34, online: 31, offline: 1, warning: 2 };

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  message: string;
  time: string;
}

export const recentAnalyticsEvents: AnalyticsEvent[] = [
  { id: 'e1', type: 'ai',      message: 'AI model updated with latest 7-day dataset',  time: '10:30 AM' },
  { id: 'e2', type: 'insight', message: 'WH-C spoilage forecast updated to 18.2%',     time: '10:00 AM' },
  { id: 'e3', type: 'sync',    message: 'Environmental trend data refreshed',            time: '09:30 AM' },
  { id: 'e4', type: 'alert',   message: 'Anomaly: WH-C Zone 3 temp spike detected',     time: '09:15 AM' },
  { id: 'e5', type: 'success', message: 'WH-D stability benchmark exceeded target',     time: '08:45 AM' },
];
