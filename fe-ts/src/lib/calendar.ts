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

export function currentPeriod() {
  return dayjs().format('YYYY-MM');
}

export function calculateTotalHours(startTime: string, lunchBreak: string, endTime: string) {
  const [startHours, startMinutes] = normalizeTime(startTime).split(':').map(Number);
  const [lunchHours, lunchMinutes] = normalizeTime(lunchBreak).split(':').map(Number);
  const [endHours, endMinutes] = normalizeTime(endTime).split(':').map(Number);

  if (
    Number.isNaN(startHours) ||
    Number.isNaN(startMinutes) ||
    Number.isNaN(endHours) ||
    Number.isNaN(endMinutes) ||
    !startTime ||
    !endTime
  ) {
    return '0.00';
  }

  const start = startHours * 60 + startMinutes;
  const lunch = Number.isNaN(lunchHours) || Number.isNaN(lunchMinutes) ? 0 : lunchHours * 60 + lunchMinutes;
  const end = endHours * 60 + endMinutes;
  if (end <= start) {
    return '0.00';
  }

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
    const lunchBreak = normalizeTime(entry.lunchBreak);
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
