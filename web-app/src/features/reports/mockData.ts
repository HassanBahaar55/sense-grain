export type ReportType    = 'environmental' | 'compliance' | 'performance' | 'alert-summary' | 'custom';
export type ReportStatus  = 'ready' | 'processing';
export type ScheduleFreq  = 'daily' | 'weekly' | 'monthly' | 'custom';

// ─── Stat cards ───────────────────────────────────────────────────────────────

export interface ReportStatCard {
  label:         string;
  value:         string;
  delta:         string;
  deltaPositive: boolean;
  colorKey:      'green' | 'blue' | 'purple' | 'amber';
}

export const reportStats: ReportStatCard[] = [
  { label: 'Total Reports',     value: '248', delta: '+12 this week',  deltaPositive: true,  colorKey: 'green'  },
  { label: 'Downloaded',        value: '183', delta: '+8 this week',   deltaPositive: true,  colorKey: 'blue'   },
  { label: 'Shared',            value: '64',  delta: '+5 this week',   deltaPositive: true,  colorKey: 'purple' },
  { label: 'Scheduled Reports', value: '7',   delta: '6 active now',   deltaPositive: true,  colorKey: 'amber'  },
];

// ─── Report activity trend (8-week line chart) ────────────────────────────────

export interface ReportTrendPoint {
  week:       string;
  Generated:  number;
  Downloaded: number;
  Shared:     number;
}

export const reportTrendData: ReportTrendPoint[] = [
  { week: 'Apr 7',  Generated: 18, Downloaded: 12, Shared: 4  },
  { week: 'Apr 14', Generated: 22, Downloaded: 15, Shared: 5  },
  { week: 'Apr 21', Generated: 19, Downloaded: 13, Shared: 3  },
  { week: 'Apr 28', Generated: 26, Downloaded: 18, Shared: 7  },
  { week: 'May 5',  Generated: 24, Downloaded: 17, Shared: 6  },
  { week: 'May 12', Generated: 31, Downloaded: 22, Shared: 9  },
  { week: 'May 19', Generated: 28, Downloaded: 20, Shared: 8  },
  { week: 'May 21', Generated: 35, Downloaded: 26, Shared: 11 },
];

export const reportTrendSeries = [
  { key: 'Generated'  as const, label: 'Generated',  color: '#1f5135' },
  { key: 'Downloaded' as const, label: 'Downloaded',  color: '#3b82f6' },
  { key: 'Shared'     as const, label: 'Shared',      color: '#8b5cf6' },
];

// ─── Report type distribution (donut) ─────────────────────────────────────────

export interface ReportTypeStat {
  name:  string;
  value: number;
  color: string;
}

export const reportTypeData: ReportTypeStat[] = [
  { name: 'Environmental',  value: 38, color: '#1f5135' },
  { name: 'Compliance',     value: 22, color: '#3b82f6' },
  { name: 'Performance',    value: 18, color: '#f59e0b' },
  { name: 'Alert Summary',  value: 14, color: '#ef4444' },
  { name: 'Custom',         value: 8,  color: '#8b5cf6' },
];

// ─── Recent reports table ─────────────────────────────────────────────────────

export interface RecentReport {
  id:            string;
  name:          string;
  type:          ReportType;
  warehouse:     string;
  dateGenerated: string;
  generatedBy:   string;
  size:          string;
  status:        ReportStatus;
}

export const recentReports: RecentReport[] = [
  { id: 'RPT-2041', name: 'Environmental Summary — May 2026',       type: 'environmental',  warehouse: 'WH-Alpha',   dateGenerated: 'May 21, 2026', generatedBy: 'Auto-Scheduler', size: '2.4 MB', status: 'ready'      },
  { id: 'RPT-2040', name: 'Monthly Compliance Report — Apr 2026',   type: 'compliance',     warehouse: 'All Zones',  dateGenerated: 'May 20, 2026', generatedBy: 'Admin User',     size: '1.8 MB', status: 'ready'      },
  { id: 'RPT-2039', name: 'WH-Beta Performance Analysis',           type: 'performance',    warehouse: 'WH-Beta',    dateGenerated: 'May 20, 2026', generatedBy: 'Auto-Scheduler', size: '3.1 MB', status: 'ready'      },
  { id: 'RPT-2038', name: 'Alert Summary — Week 20',                type: 'alert-summary',  warehouse: 'All Zones',  dateGenerated: 'May 19, 2026', generatedBy: 'Auto-Scheduler', size: '0.9 MB', status: 'ready'      },
  { id: 'RPT-2037', name: 'Custom Grain Quality Report',            type: 'custom',         warehouse: 'WH-Gamma',   dateGenerated: 'May 19, 2026', generatedBy: 'Admin User',     size: '1.2 MB', status: 'ready'      },
  { id: 'RPT-2036', name: 'WH-Delta Environmental Trends',          type: 'environmental',  warehouse: 'WH-Delta',   dateGenerated: 'May 18, 2026', generatedBy: 'Auto-Scheduler', size: '2.7 MB', status: 'ready'      },
  { id: 'RPT-2035', name: 'Sensor Health Weekly Report',            type: 'performance',    warehouse: 'All Zones',  dateGenerated: 'May 18, 2026', generatedBy: 'Auto-Scheduler', size: '1.5 MB', status: 'ready'      },
  { id: 'RPT-2034', name: 'Compliance Audit Q1 2026',               type: 'compliance',     warehouse: 'WH-Epsilon', dateGenerated: 'May 17, 2026', generatedBy: 'Admin User',     size: '4.2 MB', status: 'ready'      },
  { id: 'RPT-2033', name: 'Environmental Summary — May 21 (Auto)',  type: 'environmental',  warehouse: 'WH-Zeta',    dateGenerated: 'May 21, 2026', generatedBy: 'Auto-Scheduler', size: '—',       status: 'processing' },
];

// ─── Scheduled reports ────────────────────────────────────────────────────────

export interface ScheduledReport {
  id:      string;
  name:    string;
  type:    ReportType;
  schedule: string;
  nextRun: string;
  enabled: boolean;
}

export const scheduledReports: ScheduledReport[] = [
  { id: 'SCH-01', name: 'Daily Environmental Summary', type: 'environmental', schedule: 'Daily at 06:00',       nextRun: 'Tomorrow, 06:00',    enabled: true  },
  { id: 'SCH-02', name: 'Weekly Compliance Report',    type: 'compliance',    schedule: 'Mon at 08:00',         nextRun: 'Mon May 25, 08:00',  enabled: true  },
  { id: 'SCH-03', name: 'Monthly Performance Review',  type: 'performance',   schedule: '1st of month, 09:00', nextRun: 'Jun 1, 09:00',       enabled: true  },
  { id: 'SCH-04', name: 'Daily Alert Summary',         type: 'alert-summary', schedule: 'Daily at 18:00',       nextRun: 'Today, 18:00',       enabled: true  },
  { id: 'SCH-05', name: 'Custom Grain Quality',        type: 'custom',        schedule: 'Fri at 17:00',         nextRun: 'Fri May 23, 17:00',  enabled: false },
  { id: 'SCH-06', name: 'Sensor Health Weekly',        type: 'performance',   schedule: 'Sun at 10:00',         nextRun: 'Sun May 25, 10:00',  enabled: true  },
];
