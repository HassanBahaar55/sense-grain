export type WarehouseStatus = 'good' | 'medium' | 'high' | 'inactive';
export type ParameterStatus = 'good' | 'warning' | 'critical';
export type AlertSeverity = 'high' | 'medium';
export type RecommendationPriority = 'critical' | 'high' | 'medium';

export interface WarehouseUnit {
  id: string;
  status: WarehouseStatus;
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
}

export interface KeyParameter {
  label: string;
  value: string;
  unit: string;
  status: ParameterStatus;
  statusLabel: string;
  sparkline: number[];
  color: string;
  icon: string;
}

export interface ForecastDataPoint {
  day: string;
  'WH-A': number;
  'WH-B': number;
  'WH-C': number;
  'WH-D': number;
}

export interface ForecastSeries {
  key: 'WH-A' | 'WH-B' | 'WH-C' | 'WH-D';
  color: string;
  label: string;
}

export const warehouseUnits: WarehouseUnit[] = [
  { id: 'WH-A', status: 'good', temp: 27.2, humidity: 58, moisture: 11.8 },
  { id: 'WH-B', status: 'medium', temp: 29.4, humidity: 65, moisture: 13.1 },
  { id: 'WH-C', status: 'good', temp: 26.8, humidity: 57, moisture: 11.2 },
  { id: 'WH-D', status: 'high', temp: 32.1, humidity: 74, moisture: 15.6 },
  { id: 'WH-E', status: 'good', temp: 27.5, humidity: 60, moisture: 12.0 },
  { id: 'WH-F', status: 'medium', temp: 30.2, humidity: 68, moisture: 13.8 },
  { id: 'WH-G', status: 'good', temp: 26.5, humidity: 55, moisture: 11.5 },
  { id: 'WH-H', status: 'inactive', temp: null, humidity: null, moisture: null },
];

export const keyParameters: KeyParameter[] = [
  {
    label: 'Temperature',
    value: '28.6',
    unit: '°C',
    status: 'warning',
    statusLabel: 'High',
    sparkline: [26, 26.8, 27.5, 28, 27.8, 28.2, 28.6],
    color: '#f59e0b',
    icon: 'thermometer',
  },
  {
    label: 'Humidity',
    value: '62',
    unit: '%',
    status: 'warning',
    statusLabel: 'Elevated',
    sparkline: [58, 59, 60, 61, 60.5, 61.5, 62],
    color: '#3b82f6',
    icon: 'droplets',
  },
  {
    label: 'Moisture',
    value: '12.4',
    unit: '%',
    status: 'good',
    statusLabel: 'Normal',
    sparkline: [12.8, 12.6, 12.5, 12.3, 12.4, 12.2, 12.4],
    color: '#22c55e',
    icon: 'moisture',
  },
  {
    label: 'CO₂ Level',
    value: '540',
    unit: ' ppm',
    status: 'good',
    statusLabel: 'Normal',
    sparkline: [520, 530, 535, 528, 532, 538, 540],
    color: '#8b5cf6',
    icon: 'co2',
  },
  {
    label: 'Air Quality',
    value: '42',
    unit: ' AQI',
    status: 'good',
    statusLabel: 'Good',
    sparkline: [45, 44, 43, 44, 42, 43, 42],
    color: '#10b981',
    icon: 'wind',
  },
  {
    label: 'Storage Capacity',
    value: '78',
    unit: '%',
    status: 'warning',
    statusLabel: 'High',
    sparkline: [70, 72, 73, 74, 75, 76, 78],
    color: '#f97316',
    icon: 'capacity',
  },
];

export const activeAlerts = [
  {
    id: 1,
    severity: 'high' as AlertSeverity,
    title: 'High Temperature Detected',
    location: 'WH-D · Zone 3',
    time: '2 min ago',
    value: '32.1°C',
    threshold: '30°C',
  },
  {
    id: 2,
    severity: 'medium' as AlertSeverity,
    title: 'Humidity Threshold Exceeded',
    location: 'WH-F · Zone 1',
    time: '15 min ago',
    value: '74%',
    threshold: '70%',
  },
  {
    id: 3,
    severity: 'medium' as AlertSeverity,
    title: 'Moisture Level Rising',
    location: 'WH-B · Zone 2',
    time: '1 hr ago',
    value: '13.1%',
    threshold: '13%',
  },
];

// Recharts-compatible forecast data
export const spoilageRiskForecast: { data: ForecastDataPoint[]; series: ForecastSeries[] } = {
  data: [
    { day: 'May 20', 'WH-A': 18, 'WH-B': 42, 'WH-C': 25, 'WH-D': 68 },
    { day: 'May 21', 'WH-A': 20, 'WH-B': 45, 'WH-C': 24, 'WH-D': 72 },
    { day: 'May 22', 'WH-A': 19, 'WH-B': 48, 'WH-C': 26, 'WH-D': 75 },
    { day: 'May 23', 'WH-A': 22, 'WH-B': 50, 'WH-C': 25, 'WH-D': 78 },
    { day: 'May 24', 'WH-A': 21, 'WH-B': 52, 'WH-C': 27, 'WH-D': 76 },
    { day: 'May 25', 'WH-A': 23, 'WH-B': 51, 'WH-C': 26, 'WH-D': 80 },
    { day: 'May 26', 'WH-A': 22, 'WH-B': 54, 'WH-C': 28, 'WH-D': 82 },
  ],
  series: [
    { key: 'WH-A', color: '#22c55e', label: 'WH-A' },
    { key: 'WH-B', color: '#f59e0b', label: 'WH-B' },
    { key: 'WH-C', color: '#3b82f6', label: 'WH-C' },
    { key: 'WH-D', color: '#ef4444', label: 'WH-D' },
  ],
};

export const riskDistribution = [
  { label: 'Low Risk', count: 5, color: '#22c55e' },
  { label: 'Medium Risk', count: 2, color: '#f59e0b' },
  { label: 'High Risk', count: 1, color: '#ef4444' },
  { label: 'Inactive', count: 1, color: '#d1d5db' },
];

export const recommendations = [
  {
    id: 1,
    priority: 'critical' as RecommendationPriority,
    title: 'Immediate Cooling Required',
    description: 'WH-D temperature exceeds safe threshold. Activate backup cooling units in Zone 3 immediately to prevent spoilage.',
    warehouse: 'WH-D',
    estimatedImpact: 'Prevents ~$12K spoilage loss',
  },
  {
    id: 2,
    priority: 'high' as RecommendationPriority,
    title: 'Dehumidifier Maintenance',
    description: 'WH-F humidity trending upward. Schedule dehumidifier service within 24 hours to maintain safe storage conditions.',
    warehouse: 'WH-F',
    estimatedImpact: 'Maintains Grade A quality',
  },
  {
    id: 3,
    priority: 'medium' as RecommendationPriority,
    title: 'Moisture Sensor Calibration',
    description: 'WH-B moisture readings show sensor drift. Calibrate during the next scheduled maintenance window.',
    warehouse: 'WH-B',
    estimatedImpact: 'Improves data accuracy',
  },
];
