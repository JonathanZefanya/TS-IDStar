import dayjs from 'dayjs';
import type { CalendarRow, TimesheetEntry } from '../types';

function normalizeTime(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value).trim();
  const match = stringValue.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return '';
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return '';
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeLunchBreak(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return '';
  }

  const timeRange = stringValue.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!timeRange) {
    return normalizeTime(stringValue);
  }

  const rangeStart = normalizeTime(timeRange[1]);
  const rangeEnd = normalizeTime(timeRange[2]);
  return rangeStart && rangeEnd ? `${rangeStart} - ${rangeEnd}` : '';
}

function timeToMinutes(value: string) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function lunchBreakToMinutes(value: string, workStart: number, workEnd: number) {
  const normalized = normalizeLunchBreak(value);
  if (!normalized) {
    return 0;
  }

  const timeRange = normalized.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  if (timeRange) {
    const rangeStart = timeToMinutes(timeRange[1]);
    const rangeEnd = timeToMinutes(timeRange[2]);
    if (rangeStart === null || rangeEnd === null || rangeEnd <= rangeStart) {
      return 0;
    }

    return Math.max(Math.min(rangeEnd, workEnd) - Math.max(rangeStart, workStart), 0);
  }

  const duration = timeToMinutes(normalized);
  return duration ?? 0;
}

export function currentPeriod() {
  return dayjs().format('YYYY-MM');
}

export function calculateTotalHours(startTime: string, lunchBreak: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return '0.00';
  }

  const lunch = lunchBreakToMinutes(lunchBreak, start, end);
  return (Math.max(end - start - lunch, 0) / 60).toFixed(2);
}

export function generateMonthRows(period: string, entries: TimesheetEntry[] = [], holidayDates: string[] = []): CalendarRow[] {
  const monthStart = dayjs(`${period}-01`);
  const totalDays = monthStart.daysInMonth();
  const entryLookup = new Map(entries.map((entry) => [entry.date.slice(0, 10), entry]));
  const holidayLookup = new Set(holidayDates.map((date) => dayjs(date).format('YYYY-MM-DD')));

  return Array.from({ length: totalDays }, (_, index) => {
    const date = monthStart.date(index + 1);
    const dateKey = date.format('YYYY-MM-DD');
    const dayName = date.format('dddd');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const isHoliday = holidayLookup.has(dateKey);
    const blocked = isWeekend || isHoliday;
    const entry = entryLookup.get(dateKey);
    const blockedLabel = isHoliday ? 'Holiday' : isWeekend ? 'Weekend' : undefined;

    if (blocked) {
      return {
        date: dateKey,
        dayName,
        startTime: '',
        lunchBreak: '',
        endTime: '',
        totalHours: '',
        activity: dayName,
        blocked: true,
        blockedLabel
      };
    }

    if (!entry) {
      return {
        date: dateKey,
        dayName,
        startTime: '',
        lunchBreak: '',
        endTime: '',
        totalHours: '',
        activity: '',
        blocked: false
      };
    }

    const startTime = normalizeTime(entry.startTime);
    const lunchBreak = normalizeLunchBreak(entry.lunchBreak);
    const endTime = normalizeTime(entry.endTime);
    const totalHours = startTime && endTime ? calculateTotalHours(startTime, lunchBreak, endTime) : '';

    return {
      date: dateKey,
      dayName,
      startTime,
      lunchBreak,
      endTime,
      totalHours: totalHours === '' ? '' : String(totalHours),
      activity: entry.activity || '',
      blocked: false
    };
  });
}
