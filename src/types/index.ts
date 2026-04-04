export interface Person {
  id: string;
  name: string;
  department?: string;
  phone?: string;
  email?: string;
  color?: string;
  isActive: boolean;
  order: number;
}

export type RotationStrategy = 'sequential' | 'reverse' | 'random';

export interface ScheduleConfig {
  startDate: string;
  endDate: string;
  rotationStrategy: RotationStrategy;
  dutyType: 'daily' | 'weekly' | 'custom';
  customInterval?: number;
  skipWeekends: boolean;
  skipHolidays: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'once' | 'yearly' | 'monthly';
  isWorkday: boolean;
}

export interface ScheduleEntry {
  date: string;
  personId: string;
  personName: string;
  isHoliday: boolean;
  holidayName?: string;
  isWeekend: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: ScheduleConfig;
  entries: ScheduleEntry[];
  personIds: string[];
}

export interface VersionHistory {
  id: string;
  scheduleId: string;
  timestamp: string;
  action: string;
  data: Schedule;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'word';
  template: 'standard' | 'compact' | 'detailed';
  includeHeader: boolean;
  includeFooter: boolean;
  fontSize: number;
  primaryColor: string;
}

export interface AppState {
  persons: Person[];
  holidays: Holiday[];
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  versionHistory: VersionHistory[];
}
