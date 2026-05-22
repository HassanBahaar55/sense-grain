// Multi-user mock database for Sense Grain SaaS platform

export type UserRole   = 'super_admin' | 'org_admin' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type OrgPlan    = 'starter' | 'professional' | 'enterprise';

// ─── Role metadata ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin:   'Org Admin',
  operator:    'Operator',
  viewer:      'Viewer',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; ring: string }> = {
  super_admin: { bg: 'bg-[#1f5135]',  text: 'text-white',      ring: 'ring-[#1f5135]/30' },
  org_admin:   { bg: 'bg-blue-50',    text: 'text-blue-700',   ring: 'ring-blue-200'      },
  operator:    { bg: 'bg-amber-50',   text: 'text-amber-700',  ring: 'ring-amber-200'     },
  viewer:      { bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-200'      },
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['read','write','delete','manage_users','manage_orgs','admin_panel','export','config'],
  org_admin:   ['read','write','export'],
  operator:    ['read','write'],
  viewer:      ['read'],
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full platform access. Can manage all users, orgs, and system settings.',
  org_admin:   'Manages their organization\'s warehouses, users, and reports.',
  operator:    'Can view and update sensor data and acknowledge alerts.',
  viewer:      'Read-only access to dashboards and reports.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockOrg {
  id:             string;
  name:           string;
  location:       string;
  userCount:      number;
  warehouseCount: number;
  plan:           OrgPlan;
  status:         'active' | 'suspended';
  createdAt:      string;
  industry:       string;
  contactEmail:   string;
}

export interface MockUser {
  id:           string;
  name:         string;
  email:        string;
  role:         UserRole;
  organization: string;
  orgId:        string;
  status:       UserStatus;
  lastLogin:    string;
  createdAt:    string;
  avatar:       string;  // initials
  dataPrefix:   string;  // unique seed prefix — gives completely separate data
  warehouses:   string[];
  location:     string;
  primaryCrop:  string;
  phone?:       string;
}

// ─── Organizations ────────────────────────────────────────────────────────────

export const MOCK_ORGS: MockOrg[] = [
  {
    id: 'sg-hq', name: 'Sense Grain HQ', location: 'Karachi, PK',
    userCount: 1, warehouseCount: 8, plan: 'enterprise', status: 'active',
    createdAt: 'Jan 1, 2026', industry: 'Platform', contactEmail: 'admin@sensegrain.com',
  },
  {
    id: 'org-graintech', name: 'GrainTech Foods', location: 'Lahore, PK',
    userCount: 3, warehouseCount: 4, plan: 'professional', status: 'active',
    createdAt: 'Feb 10, 2026', industry: 'Grain Processing', contactEmail: 'ahmed.farhan@graintech.pk',
  },
  {
    id: 'org-agrostore', name: 'AgroStore Ltd', location: 'Islamabad, PK',
    userCount: 2, warehouseCount: 3, plan: 'professional', status: 'active',
    createdAt: 'Mar 5, 2026', industry: 'Agricultural Storage', contactEmail: 'sara.khan@agrostore.pk',
  },
  {
    id: 'org-foodcorp', name: 'FoodCorp Industries', location: 'Multan, PK',
    userCount: 1, warehouseCount: 2, plan: 'starter', status: 'active',
    createdAt: 'Apr 20, 2026', industry: 'Food Processing', contactEmail: 'usman@foodcorp.pk',
  },
  {
    id: 'org-national', name: 'National Grain Co.', location: 'Faisalabad, PK',
    userCount: 4, warehouseCount: 6, plan: 'enterprise', status: 'active',
    createdAt: 'Mar 12, 2026', industry: 'Grain Trading', contactEmail: 'zain@nationalgrain.pk',
  },
  {
    id: 'org-sindh', name: 'Sindh Agri Corp', location: 'Hyderabad, PK',
    userCount: 2, warehouseCount: 3, plan: 'starter', status: 'suspended',
    createdAt: 'May 1, 2026', industry: 'Agriculture', contactEmail: 'info@sindhagri.pk',
  },
];

// ─── Users ────────────────────────────────────────────────────────────────────
// dataPrefix is the unique key that seeds all data generation per user.
// Different prefixes produce completely different warehouses, alerts, charts.

export const MOCK_USERS: MockUser[] = [
  {
    id: 'super_admin', name: 'Hassan Bahar',
    email: 'hassanbahaar55@gmail.com',
    role: 'super_admin', organization: 'Sense Grain HQ', orgId: 'sg-hq',
    status: 'active', lastLogin: 'Just now', createdAt: 'Jan 1, 2026',
    avatar: 'H', dataPrefix: 'SA',
    warehouses: ['WH-A','WH-B','WH-C','WH-D','WH-E','WH-F','WH-G','WH-H'],
    location: 'Karachi, PK', primaryCrop: 'Mixed Grains', phone: '+92 300 1234567',
  },
  {
    id: 'manager_a', name: 'Ahmed Farhan',
    email: 'ahmed.farhan@graintech.pk',
    role: 'org_admin', organization: 'GrainTech Foods', orgId: 'org-graintech',
    status: 'active', lastLogin: '2 hours ago', createdAt: 'Feb 10, 2026',
    avatar: 'A', dataPrefix: 'GF',
    warehouses: ['WH-A','WH-B','WH-C','WH-D'],
    location: 'Lahore, PK', primaryCrop: 'Wheat', phone: '+92 321 9876543',
  },
  {
    id: 'manager_b', name: 'Sara Khan',
    email: 'sara.khan@agrostore.pk',
    role: 'operator', organization: 'AgroStore Ltd', orgId: 'org-agrostore',
    status: 'active', lastLogin: 'Yesterday', createdAt: 'Mar 5, 2026',
    avatar: 'S', dataPrefix: 'AS',
    warehouses: ['WH-A','WH-B','WH-C'],
    location: 'Islamabad, PK', primaryCrop: 'Rice', phone: '+92 333 5556789',
  },
  {
    id: 'viewer', name: 'Usman Ali',
    email: 'usman@foodcorp.pk',
    role: 'viewer', organization: 'FoodCorp Industries', orgId: 'org-foodcorp',
    status: 'active', lastLogin: '3 days ago', createdAt: 'Apr 20, 2026',
    avatar: 'U', dataPrefix: 'FC',
    warehouses: ['WH-A','WH-B'],
    location: 'Multan, PK', primaryCrop: 'Maize',
  },
  {
    id: 'national_admin', name: 'Zain Malik',
    email: 'zain@nationalgrain.pk',
    role: 'org_admin', organization: 'National Grain Co.', orgId: 'org-national',
    status: 'active', lastLogin: '5 hours ago', createdAt: 'Mar 12, 2026',
    avatar: 'Z', dataPrefix: 'NG',
    warehouses: ['WH-A','WH-B','WH-C','WH-D','WH-E','WH-F'],
    location: 'Faisalabad, PK', primaryCrop: 'Mixed Grains',
  },
  {
    id: 'viewer_2', name: 'Fatima Noor',
    email: 'fatima@sindhagri.pk',
    role: 'viewer', organization: 'Sindh Agri Corp', orgId: 'org-sindh',
    status: 'suspended', lastLogin: 'May 10, 2026', createdAt: 'May 1, 2026',
    avatar: 'F', dataPrefix: 'SC',
    warehouses: ['WH-A','WH-B','WH-C'],
    location: 'Hyderabad, PK', primaryCrop: 'Rice',
  },
];

// First 4 shown as demo switcher accounts
export const DEMO_ACCOUNTS = MOCK_USERS.slice(0, 4);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find(u => u.id === id);
}

export function getOrgById(id: string): MockOrg | undefined {
  return MOCK_ORGS.find(o => o.id === id);
}

export function getUsersForOrg(orgId: string): MockUser[] {
  return MOCK_USERS.filter(u => u.orgId === orgId);
}
