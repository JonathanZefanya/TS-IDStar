export interface User {
  id: number;
  name: string;
  roleSystem: 'admin' | 'user' | string;
  roleJob: string;
  department: string;
  location: string;
  project: string;
  teamLeadName: string;
  deptHeadName: string;
  username: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimesheetSummary {
  totalEntries: number;
  totalHours: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TimesheetEntry {
  id?: number;
  timesheetId?: number;
  date: string;
  dayName: string;
  startTime: string;
  lunchBreak: string;
  endTime: string;
  totalHours: number | string;
  activity: string;
}

export interface Timesheet {
  id: number;
  userId: number;
  period: string;
  status: string;
  user?: User;
  entries: TimesheetEntry[];
  summary?: TimesheetSummary;
}

export interface CalendarRow {
  date: string;
  dayName: string;
  startTime: string;
  lunchBreak: string;
  endTime: string;
  totalHours: string;
  activity: string;
  blocked: boolean;
  blockedLabel?: string;
}

export interface TimesheetDetailResponse {
  timesheet: Timesheet;
  holidayDates: string[];
  summary: TimesheetSummary;
}
