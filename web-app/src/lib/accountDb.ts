/**
 * Per-user Firestore path helpers.
 * All user data lives under /accounts/{uid}/... so no two users ever share data.
 *
 * Admin:        hammadtahir@gmail.com  — bypasses approval, sees all data
 * Test account: testing@gmail.com      — auto-approved, seeded with 30-day demo data
 */

export const ADMIN_EMAIL = 'hammadtahir@gmail.com';
export const TEST_EMAIL  = 'testing@gmail.com';

// ─── Collection path builders ─────────────────────────────────────────────────

/** Root path for a user's data */
export const accountPath = (uid: string) => `accounts/${uid}` as const;

/** Per-user sub-collection paths */
export const col = {
  warehouses:       (uid: string) => `accounts/${uid}/warehouses`,
  zones:            (uid: string) => `accounts/${uid}/zones`,
  sensors:          (uid: string) => `accounts/${uid}/sensors`,
  sensorReadings:   (uid: string) => `accounts/${uid}/sensorReadings`,   // per-sensor live readings
  warehouseReadings:(uid: string) => `accounts/${uid}/warehouseReadings`, // computed cache (aggregated)
  alerts:           (uid: string) => `accounts/${uid}/alerts`,
  alertHistory:     (uid: string) => `accounts/${uid}/alertHistory`,
  sensorHistory:    (uid: string) => `accounts/${uid}/sensorHistory`,
  reports:          (uid: string) => `accounts/${uid}/reports`,
  reportsMeta:      (uid: string) => `accounts/${uid}/reportsMeta`,
  meta:             (uid: string) => `accounts/${uid}/meta`,
} as const;

// ─── User profile + approval ──────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid:            string;
  email:          string;
  displayName:    string;
  approvalStatus: ApprovalStatus;
  createdAt:      number;
  approvedAt?:    number;
  rejectedReason?:string;
}

export interface UserRequest {
  uid:          string;
  email:        string;
  displayName:  string;
  requestedAt:  number;
  status:       ApprovalStatus;
  message?:     string;    // optional message from user
  rejectedReason?: string; // set by admin on rejection
}

export interface ResourceRequest {
  id:              string;
  uid:             string;
  userEmail:       string;
  userName:        string;
  type:            'sensor_activation' | 'warehouse_creation' | 'zone_creation';
  status:          'pending' | 'approved' | 'rejected';
  createdAt:       number;
  reviewedAt?:     number;
  rejectedReason?: string;
  // sensor_activation fields
  sensorId?:        string;
  sensorName?:      string;
  sensorType?:      string;
  zoneId?:          string;
  warehouseId?:     string;
  // warehouse_creation fields
  warehouseName?:     string;
  warehouseCapacity?: number;
  warehouseLocation?: string;
  warehouseStatus?:   string;
  warehouseDocId?:    string; // set by admin on approval
  // zone_creation fields
  zoneName?:      string;
  zoneDocId?:     string;     // set by admin on approval
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isTestEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === TEST_EMAIL.toLowerCase();
}
