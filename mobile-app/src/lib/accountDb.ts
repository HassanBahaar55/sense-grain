// Collection path helpers — mirrors web app accountDb.ts

export const col = {
  warehouses:        (uid: string) => `accounts/${uid}/warehouses`,
  zones:             (uid: string) => `accounts/${uid}/zones`,
  sensors:           (uid: string) => `accounts/${uid}/sensors`,
  sensorReadings:    (uid: string) => `accounts/${uid}/sensorReadings`,
  warehouseReadings: (uid: string) => `accounts/${uid}/warehouseReadings`,
  alerts:            (uid: string) => `accounts/${uid}/alerts`,
  alertHistory:      (uid: string) => `accounts/${uid}/alertHistory`,
  sensorHistory:     (uid: string) => `accounts/${uid}/sensorHistory`,
  reports:           (uid: string) => `accounts/${uid}/reports`,
  reportsMeta:       (uid: string) => `accounts/${uid}/reportsMeta`,
  meta:              (uid: string) => `accounts/${uid}/meta`,
};

// ─── Approval ─────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  approvalStatus: ApprovalStatus;
  role?: 'admin' | 'user';
  createdAt: number;
  approvedAt?: number;
  rejectedReason?: string;
  tickIntervalSeconds?: number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export type ManagedStatus = 'active' | 'inactive';
export type SensorType = 'temperature' | 'humidity' | 'moisture' | 'co2' | 'aqi' | 'multi';
export type SensorStatus = 'active' | 'inactive' | 'faulty' | 'pending_approval' | 'rejected';

export interface ManagedWarehouse {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: ManagedStatus;
  createdAt: number;
}

export interface ManagedZone {
  id: string;
  warehouseId: string;
  name: string;
  status: ManagedStatus;
  createdAt: number;
}

export interface ManagedSensor {
  id: string;
  zoneId: string;
  warehouseId: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  createdAt: number;
}

// ─── Live readings ────────────────────────────────────────────────────────────

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

export interface LiveSensorReading {
  sensorId: string;
  zoneId: string;
  warehouseId: string;
  type: SensorType;
  value: number;
  values?: Record<string, number>;
  unit: string;
  status: string;
  updatedAt: number;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface LiveAlert {
  id: string;
  warehouseId: string;
  param: string;
  value: number;
  unit: string;
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  timestamp: number;
  resolved: boolean;
  status?: 'active' | 'acknowledged' | 'resolved';
  updatedAt?: number;
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface SensorHistoryEntry {
  date: string;
  averages: {
    temperature?: number;
    humidity?: number;
    moisture?: number;
    co2?: number;
    aqi?: number;
  };
  warehouseStatus?: { good: number; warning: number; critical: number };
  stability?: Record<string, number>;
  alertCounts?: { critical: number; high: number; medium: number; total: number };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportItem {
  id: string;
  type: 'environmental' | 'compliance' | 'performance' | 'alert-summary' | 'custom';
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

// ─── Resource requests ────────────────────────────────────────────────────────

export interface ResourceRequest {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  type: 'sensor_activation' | 'warehouse_creation' | 'zone_creation';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
  rejectedReason?: string;
  // sensor_activation fields
  sensorId?: string;
  sensorName?: string;
  sensorType?: string;
  zoneId?: string;
  warehouseId?: string;
  // warehouse_creation fields
  warehouseName?: string;
  warehouseCapacity?: number;
  warehouseLocation?: string;
  warehouseDocId?: string;
  zones?: Array<{ name: string; sensors: Array<{ name: string; type: string }> }>;
  // zone_creation fields
  zoneName?: string;
  zoneDocId?: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUserDetail {
  uid: string;
  warehouses: ManagedWarehouse[];
  zones: ManagedZone[];
  sensors: ManagedSensor[];
  tickIntervalSeconds: number;
}
