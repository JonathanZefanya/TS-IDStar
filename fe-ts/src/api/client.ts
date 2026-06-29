import axios from 'axios';
import type { AuthSession, Holiday, LoginPayload, Timesheet, TimesheetDetailResponse, TimesheetEntry, User } from '../types';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const sessionKey = 'timesheet-management-session';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const rawSession = localStorage.getItem(sessionKey);

  if (rawSession) {
    const session = JSON.parse(rawSession) as AuthSession;
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});

export function readSession() {
  const rawSession = localStorage.getItem(sessionKey);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<{ token: string; user: User }>('/auth/login', payload);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data;
}

export async function updateMyClientLogo(clientLogoDataUrl: string | null) {
  const { data } = await api.put<{ user: User }>('/auth/me/client-logo', { clientLogoDataUrl });
  return data;
}

export async function fetchMyTimesheet(period: string) {
  const { data } = await api.get<TimesheetDetailResponse>('/timesheets/me', {
    params: { period }
  });
  return data;
}

export async function saveMyTimesheetEntries(period: string, entries: TimesheetEntry[], holidayDates: string[] = []) {
  const { data } = await api.put<TimesheetDetailResponse>(`/timesheets/me/${period}/entries`, {
    entries,
    holidayDates
  });
  return data;
}

export async function submitMyTimesheet(period: string) {
  const { data } = await api.post<{ message: string; timesheet: Timesheet; holidayDates: string[] }>(`/timesheets/me/${period}/submit`);
  return data;
}

export async function downloadMyTimesheet(period: string, holidays: string[] = []) {
  const response = await api.get(`/timesheets/me/${period}/export`, {
    responseType: 'blob',
    params: holidays.length ? { holidays: holidays.join(',') } : undefined
  });

  return response;
}

export async function fetchAdminUsers() {
  const { data } = await api.get<{ users: User[] }>('/admin/users');
  return data;
}

export async function createAdminUser(payload: Partial<User> & { password: string }) {
  const { data } = await api.post<{ user: User }>('/admin/users', payload);
  return data;
}

export async function updateAdminUser(id: number, payload: Partial<User> & { password?: string }) {
  const { data } = await api.put<{ user: User }>(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteAdminUser(id: number) {
  await api.delete(`/admin/users/${id}`);
}

export async function fetchAdminTimesheets() {
  const { data } = await api.get<{ timesheets: Timesheet[] }>('/admin/timesheets');
  return data;
}

export async function fetchAdminTimesheet(id: number) {
  const { data } = await api.get<{ timesheet: Timesheet; holidayDates: string[] }>(`/admin/timesheets/${id}`);
  return data;
}

export async function createAdminTimesheet(payload: {
  userId: number;
  period: string;
  status: string;
  entries?: TimesheetEntry[];
}) {
  const { data } = await api.post<{ timesheet: Timesheet; holidayDates: string[] }>(`/admin/timesheets`, payload);
  return data;
}

export async function updateAdminTimesheet(
  id: number,
  payload: {
    userId?: number;
    period?: string;
    status?: string;
    entries?: TimesheetEntry[];
  }
) {
  const { data } = await api.put<{ timesheet: Timesheet; holidayDates: string[] }>(`/admin/timesheets/${id}`, payload);
  return data;
}

export async function deleteAdminTimesheet(id: number) {
  await api.delete(`/admin/timesheets/${id}`);
}

export async function downloadAdminTimesheet(id: number, holidays: string[] = []) {
  const response = await api.get(`/admin/timesheets/${id}/export`, {
    responseType: 'blob',
    params: holidays.length ? { holidays: holidays.join(',') } : undefined
  });

  return response;
}

export async function fetchAdminHolidays() {
  const { data } = await api.get<{ holidays: Holiday[] }>('/admin/holidays');
  return data;
}

export async function createAdminHoliday(payload: { date: string; name: string; isActive?: boolean }) {
  const { data } = await api.post<{ holiday: Holiday }>('/admin/holidays', payload);
  return data;
}

export async function updateAdminHoliday(id: number, payload: { date?: string; name?: string; isActive?: boolean }) {
  const { data } = await api.put<{ holiday: Holiday }>(`/admin/holidays/${id}`, payload);
  return data;
}

export async function deleteAdminHoliday(id: number) {
  await api.delete(`/admin/holidays/${id}`);
}
