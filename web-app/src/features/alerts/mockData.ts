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

export const alerts: Alert[] = [
  { id: 'A-001', severity: 'critical', title: 'Temperature Critical',   warehouse: 'WH-C', zone: 'Zone 3',    parameter: 'Temperature', value: '35.2 °C', threshold: '>32.0 °C', time: '10:31 AM',  status: 'active',       type: 'temperature' },
  { id: 'A-002', severity: 'critical', title: 'CO₂ Level Critical', warehouse: 'WH-C', zone: 'Zone 2',    parameter: 'CO₂',    value: '590 ppm',     threshold: '>560 ppm',       time: '10:18 AM',  status: 'active',       type: 'co2'         },
  { id: 'A-003', severity: 'critical', title: 'Moisture Overload',      warehouse: 'WH-B', zone: 'Zone 2',    parameter: 'Moisture',    value: '13.6 %',      threshold: '>13.0 %',        time: '09:45 AM',  status: 'active',       type: 'moisture'    },
  { id: 'A-004', severity: 'high',     title: 'Humidity Elevated',      warehouse: 'WH-B', zone: 'Zone 2',    parameter: 'Humidity',    value: '72 %',        threshold: '>70 %',          time: '10:28 AM',  status: 'active',       type: 'humidity'    },
  { id: 'A-005', severity: 'high',     title: 'AQI Threshold Breach',   warehouse: 'WH-C', zone: 'Zone 2',    parameter: 'AQI',         value: '52',          threshold: '>50',            time: '09:52 AM',  status: 'active',       type: 'aqi'         },
  { id: 'A-006', severity: 'high',     title: 'Moisture Rising',        warehouse: 'WH-F', zone: 'Zone 2',    parameter: 'Moisture',    value: '14.1 %',      threshold: '>13.5 %',        time: '10:24 AM',  status: 'acknowledged', type: 'moisture'    },
  { id: 'A-007', severity: 'medium',   title: 'Temperature Elevated',   warehouse: 'WH-B', zone: 'Zone 1',    parameter: 'Temperature', value: '29.4 °C', threshold: '>29.0 °C', time: '10:05 AM',  status: 'active',       type: 'temperature' },
  { id: 'A-008', severity: 'medium',   title: 'Humidity Warning',       warehouse: 'WH-F', zone: 'Zone 1',    parameter: 'Humidity',    value: '68 %',        threshold: '>65 %',          time: '09:30 AM',  status: 'active',       type: 'humidity'    },
  { id: 'A-009', severity: 'medium',   title: 'CO₂ Rising',        warehouse: 'WH-B', zone: 'Zone 3',    parameter: 'CO₂',    value: '548 ppm',     threshold: '>540 ppm',       time: '08:15 AM',  status: 'acknowledged', type: 'co2'         },
  { id: 'A-010', severity: 'medium',   title: 'AQI Alert',              warehouse: 'WH-F', zone: 'Zone 2',    parameter: 'AQI',         value: '54',          threshold: '>50',            time: '10:24 AM',  status: 'active',       type: 'aqi'         },
  { id: 'A-011', severity: 'low',      title: 'Slight Temp Rise',       warehouse: 'WH-A', zone: 'Zone 2',    parameter: 'Temperature', value: '28.4 °C', threshold: '>28.0 °C', time: '07:45 AM',  status: 'acknowledged', type: 'temperature' },
  { id: 'A-012', severity: 'low',      title: 'Humidity Borderline',    warehouse: 'WH-B', zone: 'Zone 4',    parameter: 'Humidity',    value: '65 %',        threshold: '>64 %',          time: '06:30 AM',  status: 'resolved',     type: 'humidity'    },
  { id: 'A-013', severity: 'low',      title: 'Capacity Warning',       warehouse: 'WH-C', zone: 'Main',      parameter: 'Capacity',    value: '81.1 %',      threshold: '>80.0 %',        time: 'Yesterday', status: 'resolved',     type: 'capacity'    },
  { id: 'A-014', severity: 'info',     title: 'Sensor Recalibrated',    warehouse: 'WH-D', zone: 'Zone 1',    parameter: 'System',      value: '—',      threshold: '—',         time: '10:26 AM',  status: 'resolved',     type: 'system'      },
  { id: 'A-015', severity: 'info',     title: 'Maintenance Scheduled',  warehouse: 'WH-H', zone: 'All Zones', parameter: 'System',      value: '—',      threshold: '—',         time: '10:00 AM',  status: 'muted',        type: 'system'      },
];

export const alertSummary = {
  total: 47,
  critical: 3,
  warning: 12,
  info: 18,
  resolved: 14,
};

export const alertsByType = [
  { label: 'Temperature', count: 8, color: '#f59e0b' },
  { label: 'Humidity',    count: 7, color: '#3b82f6' },
  { label: 'CO₂',   count: 6, color: '#8b5cf6' },
  { label: 'Moisture',    count: 5, color: '#10b981' },
  { label: 'AQI',         count: 4, color: '#ef4444' },
  { label: 'Capacity',    count: 3, color: '#f97316' },
  { label: 'System',      count: 3, color: '#9ca3af' },
];

export interface RecentAlertItem {
  id: string;
  severity: AlertSeverity;
  warehouse: string;
  zone: string;
  message: string;
  time: string;
}

export const recentAlertFeed: RecentAlertItem[] = [
  { id: 'r1', severity: 'critical', warehouse: 'WH-C', zone: 'Zone 3', message: 'Temp spike → 35.2°C',       time: '10:31 AM' },
  { id: 'r2', severity: 'high',     warehouse: 'WH-B', zone: 'Zone 2', message: 'Humidity 72% rising',                time: '10:28 AM' },
  { id: 'r3', severity: 'high',     warehouse: 'WH-F', zone: 'Zone 2', message: 'Moisture 14.1% — Acknowledged', time: '10:24 AM' },
  { id: 'r4', severity: 'critical', warehouse: 'WH-C', zone: 'Zone 2', message: 'CO₂ 590 ppm breach',            time: '10:18 AM' },
  { id: 'r5', severity: 'medium',   warehouse: 'WH-B', zone: 'Zone 1', message: 'Temp elevated 29.4°C',          time: '10:05 AM' },
];

export interface AcknowledgedAlertItem {
  id: string;
  warehouse: string;
  zone: string;
  title: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
}

export const acknowledgedAlerts: AcknowledgedAlertItem[] = [
  { id: 'ack1', warehouse: 'WH-F', zone: 'Zone 2', title: 'Moisture Rising',    acknowledgedBy: 'Admin User', acknowledgedAt: '10:25 AM' },
  { id: 'ack2', warehouse: 'WH-B', zone: 'Zone 3', title: 'CO₂ Rising',    acknowledgedBy: 'Admin User', acknowledgedAt: '08:16 AM' },
  { id: 'ack3', warehouse: 'WH-A', zone: 'Zone 2', title: 'Slight Temp Rise',   acknowledgedBy: 'Admin User', acknowledgedAt: '07:46 AM' },
];

export interface AlertTrendPoint {
  day: string;
  Critical: number;
  Warning: number;
  Info: number;
}

export const alertTrendData: AlertTrendPoint[] = [
  { day: 'May 20', Critical: 2, Warning: 8,  Info: 14 },
  { day: 'May 21', Critical: 1, Warning: 6,  Info: 12 },
  { day: 'May 22', Critical: 3, Warning: 9,  Info: 16 },
  { day: 'May 23', Critical: 2, Warning: 7,  Info: 11 },
  { day: 'May 24', Critical: 4, Warning: 11, Info: 18 },
  { day: 'May 25', Critical: 3, Warning: 10, Info: 15 },
  { day: 'May 26', Critical: 3, Warning: 12, Info: 18 },
];

export const heatmapDays   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const heatmapBlocks = ['00–03', '03–06', '06–09', '09–12', '12–15', '15–18', '18–21', '21–24'];

export const heatmapData: number[][] = [
  // index = dayIndex, value[timeBlock]
  [0, 1, 3, 8,  6, 7, 4, 1],  // Mon
  [0, 0, 2, 7,  5, 9, 3, 1],  // Tue
  [1, 0, 4, 11, 8, 6, 5, 2],  // Wed
  [0, 1, 2, 6,  7, 8, 3, 0],  // Thu
  [0, 0, 3, 9,  5, 6, 4, 1],  // Fri
  [1, 0, 1, 4,  3, 2, 1, 0],  // Sat
  [0, 0, 1, 3,  2, 1, 0, 0],  // Sun
];
