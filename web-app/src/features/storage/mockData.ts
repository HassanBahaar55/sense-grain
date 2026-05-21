export type StorageStatus = 'good' | 'medium' | 'high' | 'inactive';
export type RiskLevel   = 'low' | 'medium' | 'high' | 'inactive';
export type TrendDir    = 'up' | 'stable' | 'slight-up' | 'down' | null;
export type ZoneStatus  = 'good' | 'medium' | 'high' | 'inactive';

export interface StorageWarehouse {
  id: string;
  name: string;
  status: StorageStatus;
  capacity: number;
  used: number;
  risk: RiskLevel;
  trend: TrendDir;
  lastUpdate: string | null;
}

export interface StorageZone {
  id: string;
  label: string;
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
  co2: number | null;
  aqi: number | null;
  status: ZoneStatus;
  trend: TrendDir;
}

export interface CriticalZone {
  warehouse: string;
  zone: string;
  temp: number;
  humidity: number;
  moisture: number;
  risk: RiskLevel;
}

export interface StabilityPoint {
  day: string;
  'WH-A': number;
  'WH-B': number;
  'WH-C': number;
  'WH-D': number;
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const storageWarehouses: StorageWarehouse[] = [
  { id: 'WH-A', name: 'Warehouse A', status: 'good',     capacity: 2000, used: 1450, risk: 'low',      trend: 'up',       lastUpdate: '10:30 AM' },
  { id: 'WH-B', name: 'Warehouse B', status: 'medium',   capacity: 1800, used: 1210, risk: 'medium',   trend: 'stable',   lastUpdate: '10:28 AM' },
  { id: 'WH-C', name: 'Warehouse C', status: 'high',     capacity: 1750, used: 1420, risk: 'high',     trend: 'up',       lastUpdate: '10:25 AM' },
  { id: 'WH-D', name: 'Warehouse D', status: 'good',     capacity: 1600, used: 980,  risk: 'low',      trend: 'up',       lastUpdate: '10:22 AM' },
  { id: 'WH-E', name: 'Warehouse E', status: 'good',     capacity: 1500, used: 1050, risk: 'low',      trend: 'stable',   lastUpdate: '10:20 AM' },
  { id: 'WH-F', name: 'Warehouse F', status: 'medium',   capacity: 1400, used: 1020, risk: 'medium',   trend: 'slight-up',lastUpdate: '10:18 AM' },
  { id: 'WH-G', name: 'Warehouse G', status: 'good',     capacity: 1200, used: 620,  risk: 'low',      trend: 'stable',   lastUpdate: '10:16 AM' },
  { id: 'WH-H', name: 'Warehouse H', status: 'inactive', capacity: 1200, used: 0,    risk: 'inactive', trend: null,       lastUpdate: null       },
];

// Total: capacity=12,450 used=7,750
export const storageTotals = {
  totalWarehouses: 8,
  activeWarehouses: 7,
  totalZones: 32,
  activeZones: 30,
  totalCapacity: 12450,
  totalUsed: 7750,
  avgTemp: 28.6,
  avgHumidity: 62,
  highRiskUnits: 2,
};

// ─── Zone detail data per warehouse ──────────────────────────────────────────

export const storageZones: Record<string, StorageZone[]> = {
  'WH-A': [
    { id: 'Z1', label: 'Zone 1', temp: 27.2, humidity: 58, moisture: 11.8, co2: 520, aqi: 38, status: 'good',   trend: 'stable'   },
    { id: 'Z2', label: 'Zone 2', temp: 28.4, humidity: 62, moisture: 12.1, co2: 535, aqi: 42, status: 'good',   trend: 'stable'   },
    { id: 'Z3', label: 'Zone 3', temp: 26.8, humidity: 56, moisture: 11.5, co2: 510, aqi: 36, status: 'good',   trend: 'stable'   },
    { id: 'Z4', label: 'Zone 4', temp: 27.8, humidity: 60, moisture: 12.0, co2: 525, aqi: 40, status: 'good',   trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 26.5, humidity: 55, moisture: 10.5, co2: 490, aqi: 34, status: 'good',   trend: 'stable'   },
  ],
  'WH-B': [
    { id: 'Z1', label: 'Zone 1', temp: 29.4, humidity: 65, moisture: 13.1, co2: 548, aqi: 46, status: 'medium', trend: 'stable'   },
    { id: 'Z2', label: 'Zone 2', temp: 31.8, humidity: 72, moisture: 13.6, co2: 575, aqi: 51, status: 'medium', trend: 'up'       },
    { id: 'Z3', label: 'Zone 3', temp: 28.8, humidity: 63, moisture: 12.8, co2: 542, aqi: 44, status: 'medium', trend: 'stable'   },
    { id: 'Z4', label: 'Zone 4', temp: 29.2, humidity: 65, moisture: 13.0, co2: 545, aqi: 47, status: 'medium', trend: 'slight-up'},
    { id: 'AM', label: 'Ambient',temp: 28.0, humidity: 60, moisture: 11.0, co2: 510, aqi: 40, status: 'good',   trend: 'stable'   },
  ],
  'WH-C': [
    { id: 'Z1', label: 'Zone 1', temp: 30.1, humidity: 68, moisture: 11.9, co2: 560, aqi: 48, status: 'medium', trend: 'up'       },
    { id: 'Z2', label: 'Zone 2', temp: 32.6, humidity: 74, moisture: 14.1, co2: 590, aqi: 52, status: 'high',   trend: 'up'       },
    { id: 'Z3', label: 'Zone 3', temp: 35.2, humidity: 78, moisture: 15.2, co2: 620, aqi: 56, status: 'high',   trend: 'up'       },
    { id: 'Z4', label: 'Zone 4', temp: 29.3, humidity: 63, moisture: 10.8, co2: 510, aqi: 42, status: 'medium', trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 28.0, humidity: 60, moisture: 9.7,  co2: 480, aqi: 38, status: 'good',   trend: 'stable'   },
  ],
  'WH-D': [
    { id: 'Z1', label: 'Zone 1', temp: 27.5, humidity: 60, moisture: 12.0, co2: 526, aqi: 40, status: 'good',   trend: 'stable'   },
    { id: 'Z2', label: 'Zone 2', temp: 27.8, humidity: 61, moisture: 12.2, co2: 529, aqi: 41, status: 'good',   trend: 'stable'   },
    { id: 'Z3', label: 'Zone 3', temp: 27.2, humidity: 59, moisture: 11.8, co2: 522, aqi: 39, status: 'good',   trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 26.8, humidity: 57, moisture: 10.8, co2: 505, aqi: 36, status: 'good',   trend: 'stable'   },
  ],
  'WH-E': [
    { id: 'Z1', label: 'Zone 1', temp: 27.5, humidity: 60, moisture: 12.0, co2: 526, aqi: 40, status: 'good',   trend: 'stable'   },
    { id: 'Z2', label: 'Zone 2', temp: 27.8, humidity: 61, moisture: 12.1, co2: 529, aqi: 41, status: 'good',   trend: 'stable'   },
    { id: 'Z3', label: 'Zone 3', temp: 27.1, humidity: 59, moisture: 11.9, co2: 521, aqi: 39, status: 'good',   trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 26.5, humidity: 56, moisture: 10.5, co2: 500, aqi: 35, status: 'good',   trend: 'stable'   },
  ],
  'WH-F': [
    { id: 'Z1', label: 'Zone 1', temp: 30.2, humidity: 68, moisture: 13.8, co2: 556, aqi: 51, status: 'medium', trend: 'slight-up'},
    { id: 'Z2', label: 'Zone 2', temp: 30.8, humidity: 70, moisture: 14.1, co2: 564, aqi: 54, status: 'medium', trend: 'up'       },
    { id: 'Z3', label: 'Zone 3', temp: 29.6, humidity: 66, moisture: 13.5, co2: 548, aqi: 49, status: 'medium', trend: 'stable'   },
    { id: 'Z4', label: 'Zone 4', temp: 30.5, humidity: 70, moisture: 12.8, co2: 555, aqi: 50, status: 'medium', trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 28.5, humidity: 62, moisture: 11.0, co2: 520, aqi: 42, status: 'good',   trend: 'stable'   },
  ],
  'WH-G': [
    { id: 'Z1', label: 'Zone 1', temp: 26.5, humidity: 55, moisture: 11.5, co2: 508, aqi: 34, status: 'good',   trend: 'stable'   },
    { id: 'Z2', label: 'Zone 2', temp: 26.8, humidity: 56, moisture: 11.7, co2: 514, aqi: 36, status: 'good',   trend: 'stable'   },
    { id: 'Z3', label: 'Zone 3', temp: 26.2, humidity: 54, moisture: 11.3, co2: 504, aqi: 33, status: 'good',   trend: 'stable'   },
    { id: 'AM', label: 'Ambient',temp: 25.8, humidity: 52, moisture: 10.0, co2: 495, aqi: 31, status: 'good',   trend: 'stable'   },
  ],
  'WH-H': [
    { id: 'Z1', label: 'Zone 1', temp: null, humidity: null, moisture: null, co2: null, aqi: null, status: 'inactive', trend: null },
    { id: 'Z2', label: 'Zone 2', temp: null, humidity: null, moisture: null, co2: null, aqi: null, status: 'inactive', trend: null },
  ],
};

// ─── Zone summary donut ───────────────────────────────────────────────────────

export const zoneSummary = [
  { label: 'Low Risk',    count: 20, pct: 62.5, color: '#22c55e' },
  { label: 'Medium Risk', count: 7,  pct: 21.9, color: '#f59e0b' },
  { label: 'High Risk',   count: 3,  pct: 9.4,  color: '#ef4444' },
  { label: 'Inactive',    count: 2,  pct: 2.2,  color: '#d1d5db' },
];

// ─── Top 5 critical zones ──────────────────────────────────────────────────

export const topCriticalZones: CriticalZone[] = [
  { warehouse: 'WH-C', zone: 'Zone 3', temp: 35.2, humidity: 78, moisture: 15.2, risk: 'high'   },
  { warehouse: 'WH-B', zone: 'Zone 2', temp: 31.8, humidity: 72, moisture: 13.6, risk: 'medium' },
  { warehouse: 'WH-F', zone: 'Zone 4', temp: 30.5, humidity: 70, moisture: 12.8, risk: 'medium' },
  { warehouse: 'WH-C', zone: 'Zone 1', temp: 30.1, humidity: 68, moisture: 11.9, risk: 'medium' },
  { warehouse: 'WH-B', zone: 'Zone 1', temp: 29.8, humidity: 66, moisture: 11.2, risk: 'low'    },
];

// ─── Environmental stability (7-day, stability index 0–100) ──────────────────

export const envStabilityData: StabilityPoint[] = [
  { day: 'May 20', 'WH-A': 90, 'WH-B': 72, 'WH-C': 45, 'WH-D': 84 },
  { day: 'May 21', 'WH-A': 88, 'WH-B': 69, 'WH-C': 42, 'WH-D': 86 },
  { day: 'May 22', 'WH-A': 91, 'WH-B': 66, 'WH-C': 38, 'WH-D': 83 },
  { day: 'May 23', 'WH-A': 89, 'WH-B': 63, 'WH-C': 35, 'WH-D': 82 },
  { day: 'May 24', 'WH-A': 92, 'WH-B': 61, 'WH-C': 32, 'WH-D': 85 },
  { day: 'May 25', 'WH-A': 90, 'WH-B': 59, 'WH-C': 30, 'WH-D': 87 },
  { day: 'May 26', 'WH-A': 93, 'WH-B': 57, 'WH-C': 27, 'WH-D': 88 },
];

export const stabilitySeriesConfig = [
  { key: 'WH-A' as const, color: '#22c55e', label: 'Warehouse A' },
  { key: 'WH-B' as const, color: '#f59e0b', label: 'Warehouse B' },
  { key: 'WH-C' as const, color: '#ef4444', label: 'Warehouse C' },
  { key: 'WH-D' as const, color: '#3b82f6', label: 'Warehouse D' },
];

// ─── Live warehouse activity feed ────────────────────────────────────────────

export type ActivityType = 'alert' | 'warning' | 'info' | 'success' | 'ai';

export interface WarehouseActivity {
  id: string;
  type: ActivityType;
  warehouse: string;
  zone?: string;
  message: string;
  time: string;
}

export const warehouseActivity: WarehouseActivity[] = [
  { id: 'a1',  type: 'alert',   warehouse: 'WH-C', zone: 'Zone 3', message: 'Temperature spike detected — 35.2 °C exceeds threshold',   time: '10:31 AM' },
  { id: 'a2',  type: 'ai',      warehouse: 'WH-C',                  message: 'AI: Recommend activating emergency ventilation in Zone 3',  time: '10:30 AM' },
  { id: 'a3',  type: 'warning', warehouse: 'WH-B', zone: 'Zone 2',  message: 'Humidity rising — 72% and climbing, monitor closely',       time: '10:28 AM' },
  { id: 'a4',  type: 'info',    warehouse: 'WH-D',                  message: 'All sensors synced — 4/4 zones reporting normally',         time: '10:26 AM' },
  { id: 'a5',  type: 'warning', warehouse: 'WH-F', zone: 'Zone 2',  message: 'Moisture content up to 14.1% — approaching limit',          time: '10:24 AM' },
  { id: 'a6',  type: 'success', warehouse: 'WH-A',                  message: 'Environmental stability index improved to 93 — optimal',    time: '10:22 AM' },
  { id: 'a7',  type: 'info',    warehouse: 'WH-G',                  message: 'Routine sensor calibration completed successfully',          time: '10:20 AM' },
  { id: 'a8',  type: 'alert',   warehouse: 'WH-C', zone: 'Zone 2',  message: 'CO₂ level at 590 ppm — ventilation check required',         time: '10:18 AM' },
  { id: 'a9',  type: 'ai',      warehouse: 'WH-B',                  message: 'AI: Stability index declining — inspect Zone 2 aeration',   time: '10:15 AM' },
  { id: 'a10', type: 'info',    warehouse: 'WH-E',                  message: 'Capacity utilisation at 70% — within safe operating range',  time: '10:12 AM' },
  { id: 'a11', type: 'success', warehouse: 'WH-D',                  message: 'Temperature normalised after morning ventilation cycle',     time: '10:08 AM' },
  { id: 'a12', type: 'warning', warehouse: 'WH-F', zone: 'Zone 1',  message: 'AQI reading at 51 — slightly above recommended range',      time: '10:05 AM' },
];

// ─── Campus map building positions ───────────────────────────────────────────

export const campusBuildings = [
  { id: 'WH-A', x: 18,  y: 18,  w: 112, h: 72, status: 'good'     as StorageStatus },
  { id: 'WH-B', x: 18,  y: 120, w: 112, h: 72, status: 'medium'   as StorageStatus },
  { id: 'WH-C', x: 156, y: 18,  w: 116, h: 72, status: 'high'     as StorageStatus },
  { id: 'WH-D', x: 156, y: 120, w: 116, h: 72, status: 'good'     as StorageStatus },
  { id: 'WH-E', x: 18,  y: 222, w: 112, h: 72, status: 'good'     as StorageStatus },
  { id: 'WH-F', x: 156, y: 222, w: 116, h: 72, status: 'medium'   as StorageStatus },
  { id: 'WH-G', x: 298, y: 18,  w: 108, h: 72, status: 'good'     as StorageStatus },
  { id: 'WH-H', x: 298, y: 222, w: 108, h: 72, status: 'inactive' as StorageStatus },
];
