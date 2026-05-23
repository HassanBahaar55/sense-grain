export type WarehouseOnlineStatus = 'online' | 'warning' | 'alert' | 'offline';
export type ZoneStatus = 'good' | 'normal' | 'warning' | 'critical' | 'offline';

export interface MonitorWarehouse {
  id: string;
  name: string;
  status: WarehouseOnlineStatus;
  temp: number | null;
  humidity: number | null;
  zoneCount: number;
  lastUpdate: string;
}

export interface ZoneReading {
  id: string;
  label: string;
  bay: string;
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
  co2: number | null;
  aqi: number | null;
  status: ZoneStatus;
}

export interface TrendPoint {
  time: string;
  temp: number;
  humidity: number;
  moisture: number;
  co2: number;
  aqi: number;
}

export interface ActivityEvent {
  id: number;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  warehouse: string;
  time: string;
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const monitorWarehouses: MonitorWarehouse[] = [
  { id: 'WH-A', name: 'Warehouse A', status: 'online',  temp: 27.2, humidity: 58, zoneCount: 4, lastUpdate: '30s ago' },
  { id: 'WH-B', name: 'Warehouse B', status: 'warning', temp: 29.4, humidity: 65, zoneCount: 4, lastUpdate: '45s ago' },
  { id: 'WH-C', name: 'Warehouse C', status: 'online',  temp: 26.8, humidity: 57, zoneCount: 3, lastUpdate: '28s ago' },
  { id: 'WH-D', name: 'Warehouse D', status: 'alert',   temp: 32.1, humidity: 74, zoneCount: 4, lastUpdate: '12s ago' },
  { id: 'WH-E', name: 'Warehouse E', status: 'online',  temp: 27.5, humidity: 60, zoneCount: 3, lastUpdate: '55s ago' },
  { id: 'WH-F', name: 'Warehouse F', status: 'warning', temp: 30.2, humidity: 68, zoneCount: 4, lastUpdate: '1m ago'  },
  { id: 'WH-G', name: 'Warehouse G', status: 'online',  temp: 26.5, humidity: 55, zoneCount: 3, lastUpdate: '41s ago' },
  { id: 'WH-H', name: 'Warehouse H', status: 'offline', temp: null, humidity: null, zoneCount: 2, lastUpdate: '12m ago' },
];

// ─── Zone data per warehouse ──────────────────────────────────────────────────
// Each zone = one physical sensor node in the warehouse
// Safe thresholds: Temp < 30°C · Humidity < 70% · Moisture < 14%

export const zoneData: Record<string, ZoneReading[]> = {
  'WH-A': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 27.2, humidity: 58,   moisture: 11.8, co2: 520,  aqi: 38,  status: 'good'    },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 28.4, humidity: 62,   moisture: 12.1, co2: 535,  aqi: 42,  status: 'normal'  },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 26.8, humidity: 56,   moisture: 11.5, co2: 510,  aqi: 36,  status: 'good'    },
    { id: 'S4', label: 'Sensor 4', bay: 'West Bay',   temp: 27.8, humidity: 60,   moisture: 12.0, co2: 525,  aqi: 40,  status: 'good'    },
  ],
  'WH-B': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 29.4, humidity: 65,   moisture: 13.1, co2: 548,  aqi: 46,  status: 'normal'  },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 30.1, humidity: 67,   moisture: 13.5, co2: 560,  aqi: 50,  status: 'warning' },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 28.8, humidity: 63,   moisture: 12.8, co2: 542,  aqi: 44,  status: 'normal'  },
    { id: 'S4', label: 'Sensor 4', bay: 'West Bay',   temp: 29.2, humidity: 65,   moisture: 13.0, co2: 545,  aqi: 47,  status: 'normal'  },
  ],
  'WH-C': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 26.8, humidity: 57,   moisture: 11.2, co2: 512,  aqi: 36,  status: 'good'    },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 27.2, humidity: 58,   moisture: 11.5, co2: 518,  aqi: 38,  status: 'good'    },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 26.5, humidity: 56,   moisture: 11.0, co2: 508,  aqi: 34,  status: 'good'    },
  ],
  'WH-D': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 30.5, humidity: 68,   moisture: 14.2, co2: 562,  aqi: 52,  status: 'warning' },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 31.2, humidity: 70,   moisture: 14.8, co2: 570,  aqi: 55,  status: 'warning' },
    { id: 'S3', label: 'Sensor 3', bay: 'Hot Spot',   temp: 32.1, humidity: 74,   moisture: 15.6, co2: 582,  aqi: 60,  status: 'critical'},
    { id: 'S4', label: 'Sensor 4', bay: 'West Bay',   temp: 29.8, humidity: 66,   moisture: 13.9, co2: 558,  aqi: 50,  status: 'normal'  },
  ],
  'WH-E': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 27.5, humidity: 60,   moisture: 12.0, co2: 526,  aqi: 40,  status: 'good'    },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 27.8, humidity: 61,   moisture: 12.2, co2: 529,  aqi: 41,  status: 'good'    },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 27.2, humidity: 59,   moisture: 11.8, co2: 522,  aqi: 39,  status: 'good'    },
  ],
  'WH-F': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 30.2, humidity: 68,   moisture: 13.8, co2: 556,  aqi: 51,  status: 'warning' },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 30.8, humidity: 70,   moisture: 14.1, co2: 564,  aqi: 54,  status: 'warning' },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 29.6, humidity: 66,   moisture: 13.5, co2: 548,  aqi: 49,  status: 'normal'  },
    { id: 'S4', label: 'Sensor 4', bay: 'West Bay',   temp: 30.0, humidity: 67,   moisture: 13.7, co2: 552,  aqi: 50,  status: 'normal'  },
  ],
  'WH-G': [
    { id: 'S1', label: 'Sensor 1', bay: 'North Bay',  temp: 26.5, humidity: 55,   moisture: 11.5, co2: 508,  aqi: 34,  status: 'good'    },
    { id: 'S2', label: 'Sensor 2', bay: 'East Bay',   temp: 26.8, humidity: 56,   moisture: 11.7, co2: 514,  aqi: 36,  status: 'good'    },
    { id: 'S3', label: 'Sensor 3', bay: 'South Bay',  temp: 26.2, humidity: 54,   moisture: 11.3, co2: 504,  aqi: 33,  status: 'good'    },
  ],
  'WH-H': [
    { id: 'S1', label: 'Sensor 1', bay: 'Bay 1',  temp: null, humidity: null, moisture: null, co2: null, aqi: null, status: 'offline' },
    { id: 'S2', label: 'Sensor 2', bay: 'Bay 2',  temp: null, humidity: null, moisture: null, co2: null, aqi: null, status: 'offline' },
  ],
};

// ─── Top metric cards ─────────────────────────────────────────────────────────

export const realtimeMetrics = [
  { id: 'temp',     label: 'Temperature', value: '28.6', unit: '°C',  change: '+0.4', up: true,  status: 'warning' as const, sparkline: [27.2, 27.5, 27.8, 28.0, 28.2, 28.4, 28.6], color: '#f59e0b' },
  { id: 'humidity', label: 'Humidity',    value: '62',   unit: '%',   change: '+1.5', up: true,  status: 'warning' as const, sparkline: [58, 58.5, 59, 59.5, 60, 61.5, 62],         color: '#3b82f6' },
  { id: 'moisture', label: 'Moisture',    value: '12.4', unit: '%',   change: '-0.2', up: false, status: 'good'    as const, sparkline: [12.8, 12.6, 12.5, 12.3, 12.4, 12.2, 12.4],  color: '#22c55e' },
  { id: 'co2',      label: 'CO₂',         value: '540',  unit: ' ppm',change: '+8',   up: true,  status: 'good'    as const, sparkline: [520, 525, 530, 528, 532, 538, 540],           color: '#8b5cf6' },
  { id: 'aqi',      label: 'Air Quality', value: '42',   unit: ' AQI',change: '-2',   up: false, status: 'good'    as const, sparkline: [45, 44, 43, 44, 42, 43, 42],                  color: '#10b981' },
  { id: 'moisture2',label: 'Capacity',    value: '78',   unit: '%',   change: '+0',   up: false, status: 'warning' as const, sparkline: [70, 72, 73, 74, 75, 76, 78],                  color: '#f97316' },
];

// ─── Parameter trends (normalized % of threshold) ────────────────────────────

export const parameterTrends: TrendPoint[] = [
  { time: '12:30', temp: 77.7, humidity: 72.5, moisture: 78.7, co2: 52.0, aqi: 38.0 },
  { time: '12:35', temp: 78.5, humidity: 73.1, moisture: 79.3, co2: 52.5, aqi: 38.5 },
  { time: '12:40', temp: 79.4, humidity: 73.8, moisture: 80.0, co2: 53.0, aqi: 39.0 },
  { time: '12:45', temp: 80.0, humidity: 74.4, moisture: 80.7, co2: 53.5, aqi: 39.5 },
  { time: '12:50', temp: 80.8, humidity: 75.0, moisture: 81.3, co2: 53.8, aqi: 40.5 },
  { time: '12:55', temp: 81.4, humidity: 75.6, moisture: 81.6, co2: 54.0, aqi: 41.0 },
  { time: '13:00', temp: 81.7, humidity: 76.3, moisture: 82.7, co2: 54.0, aqi: 41.5 },
  { time: '13:05', temp: 82.3, humidity: 76.9, moisture: 82.7, co2: 54.2, aqi: 42.0 },
  { time: '13:10', temp: 82.9, humidity: 77.5, moisture: 83.3, co2: 54.5, aqi: 42.5 },
  { time: '13:15', temp: 82.3, humidity: 77.5, moisture: 82.7, co2: 54.8, aqi: 43.0 },
  { time: '13:20', temp: 81.7, humidity: 77.5, moisture: 82.0, co2: 54.5, aqi: 42.0 },
  { time: '13:25', temp: 81.4, humidity: 77.5, moisture: 82.3, co2: 54.0, aqi: 42.0 },
  { time: '13:30', temp: 81.7, humidity: 77.5, moisture: 82.7, co2: 54.0, aqi: 42.0 },
];

export const trendSeries = [
  { key: 'temp'     as const, label: 'Temperature', color: '#f59e0b', unit: '°C',  threshold: 35   },
  { key: 'humidity' as const, label: 'Humidity',    color: '#3b82f6', unit: '%',   threshold: 80   },
  { key: 'moisture' as const, label: 'Moisture',    color: '#22c55e', unit: '%',   threshold: 15   },
  { key: 'co2'      as const, label: 'CO₂',         color: '#8b5cf6', unit: ' ppm',threshold: 1000 },
  { key: 'aqi'      as const, label: 'AQI',         color: '#10b981', unit: '',    threshold: 100  },
];

// ─── Sensor positions (per warehouse, 4 quadrant layout) ─────────────────────
// Each sensor is placed at a fixed position in the SVG floor plan

export interface SensorPoint {
  cx: number;
  cy: number;
  id: string;
  bay: string;
  temp: number;
  humidity: number;
  status: ZoneStatus;
}

export const sensorPositions: Record<string, SensorPoint[]> = {
  'WH-A': [
    { cx: 130, cy: 105, id: 'S1', bay: 'N. Bay', temp: 27.2, humidity: 58, status: 'good'   },
    { cx: 340, cy: 105, id: 'S2', bay: 'E. Bay', temp: 28.4, humidity: 62, status: 'normal' },
    { cx: 130, cy: 210, id: 'S3', bay: 'S. Bay', temp: 26.8, humidity: 56, status: 'good'   },
    { cx: 340, cy: 210, id: 'S4', bay: 'W. Bay', temp: 27.8, humidity: 60, status: 'good'   },
  ],
  'WH-B': [
    { cx: 130, cy: 105, id: 'S1', bay: 'N. Bay', temp: 29.4, humidity: 65, status: 'normal'  },
    { cx: 340, cy: 105, id: 'S2', bay: 'E. Bay', temp: 30.1, humidity: 67, status: 'warning' },
    { cx: 130, cy: 210, id: 'S3', bay: 'S. Bay', temp: 28.8, humidity: 63, status: 'normal'  },
    { cx: 340, cy: 210, id: 'S4', bay: 'W. Bay', temp: 29.2, humidity: 65, status: 'normal'  },
  ],
  'WH-D': [
    { cx: 130, cy: 105, id: 'S1', bay: 'N. Bay', temp: 30.5, humidity: 68, status: 'warning'  },
    { cx: 340, cy: 105, id: 'S2', bay: 'E. Bay', temp: 31.2, humidity: 70, status: 'warning'  },
    { cx: 130, cy: 210, id: 'S3', bay: 'Hot Spot',temp: 32.1, humidity: 74, status: 'critical' },
    { cx: 340, cy: 210, id: 'S4', bay: 'W. Bay', temp: 29.8, humidity: 66, status: 'normal'   },
  ],
};

export const defaultSensorPositions = (warehouseId: string): SensorPoint[] => {
  const zones = zoneData[warehouseId] ?? [];
  const positions = [
    { cx: 130, cy: 105 },
    { cx: 340, cy: 105 },
    { cx: 130, cy: 210 },
    { cx: 340, cy: 210 },
  ];
  return zones.slice(0, 4).map((z, i) => ({
    cx: positions[i]?.cx ?? 235,
    cy: positions[i]?.cy ?? 155,
    id: z.id,
    bay: z.bay,
    temp: z.temp ?? 0,
    humidity: z.humidity ?? 0,
    status: z.status,
  }));
};

// ─── Recent activity ──────────────────────────────────────────────────────────

export const recentActivity: ActivityEvent[] = [
  { id: 1,  type: 'alert',   title: 'Temperature Alert Triggered',    description: 'Sensor 3 (Hot Spot) reached 32.1°C — exceeds 30°C threshold.',  warehouse: 'WH-D', time: '2 min ago'  },
  { id: 2,  type: 'warning', title: 'Humidity Rising',                description: 'Humidity climbed to 74% in Sensor 3. Threshold at 70%.',         warehouse: 'WH-D', time: '4 min ago'  },
  { id: 3,  type: 'warning', title: 'Moisture Threshold Nearing',     description: 'Moisture at 13.1% — approaching safe limit of 14%.',              warehouse: 'WH-B', time: '15 min ago' },
  { id: 4,  type: 'info',    title: 'Sensor Recalibrated',            description: 'CO₂ sensor auto-calibration completed successfully.',              warehouse: 'WH-A', time: '22 min ago' },
  { id: 5,  type: 'success', title: 'Cooling Unit Activated',         description: 'Backup cooling unit activated. Temperature stabilizing.',          warehouse: 'WH-F', time: '31 min ago' },
  { id: 6,  type: 'info',    title: 'Scheduled Health Check',         description: 'All sensors passed diagnostic check. Systems nominal.',            warehouse: 'All',  time: '45 min ago' },
  { id: 7,  type: 'success', title: 'Moisture Normalized',            description: 'Moisture levels returned to safe range after treatment.',          warehouse: 'WH-C', time: '1 hr ago'   },
  { id: 8,  type: 'info',    title: 'Data Sync Complete',             description: 'Full telemetry sync to cloud storage completed.',                  warehouse: 'All',  time: '2 hr ago'   },
];
