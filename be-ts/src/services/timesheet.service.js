const prisma = require('../config/prisma');
const {
  calculateTotalHours,
  getPeriodDateRange,
  isWeekend,
  normalizeDateKey,
  normalizeTime
} = require('../utils/time');

function toDateKeySet(holidayDates = []) {
  return new Set(
    holidayDates
      .map((value) => normalizeDateKey(value))
      .filter(Boolean)
  );
}

async function getHolidayDatesForPeriod(period) {
  const { startDate, endDate } = getPeriodDateRange(period);
  const holidays = await prisma.holiday.findMany({
    where: {
      isActive: true,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'asc' }
  });

  return {
    holidays,
    holidayDates: holidays.map((holiday) => normalizeDateKey(holiday.date))
  };
}

function normalizeTimesheetEntry(entry, holidayDateSet) {
  const dateKey = normalizeDateKey(entry.date);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const dayName = String(entry.dayName || '').trim() || date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const blocked = isWeekend(date) || holidayDateSet.has(dateKey);
  const startTime = blocked ? '' : normalizeTime(entry.startTime);
  const lunchBreak = blocked ? '' : normalizeTime(entry.lunchBreak);
  const endTime = blocked ? '' : normalizeTime(entry.endTime);
  const totalHours = blocked ? 0 : calculateTotalHours(startTime, lunchBreak, endTime);

  return {
    date,
    dayName,
    startTime,
    lunchBreak,
    endTime,
    totalHours,
    activity: blocked ? dayName : String(entry.activity || '').trim()
  };
}

function normalizeTimesheetEntries(entries, holidayDates = []) {
  const holidayDateSet = holidayDates instanceof Set ? holidayDates : toDateKeySet(holidayDates);
  return entries.map((entry) => normalizeTimesheetEntry(entry, holidayDateSet));
}

async function replaceTimesheetEntries(timesheetId, entries) {
  await prisma.timesheetEntry.deleteMany({
    where: { timesheetId }
  });

  if (!entries.length) {
    return;
  }

  await prisma.timesheetEntry.createMany({
    data: entries.map((entry) => ({
      timesheetId,
      date: entry.date,
      dayName: entry.dayName,
      startTime: entry.startTime,
      lunchBreak: entry.lunchBreak,
      endTime: entry.endTime,
      totalHours: entry.totalHours,
      activity: entry.activity
    }))
  });
}

function summarizeEntries(entries = []) {
  return entries.reduce(
    (summary, entry) => {
      summary.totalEntries += 1;
      summary.totalHours += Number(entry.totalHours || 0);
      return summary;
    },
    {
      totalEntries: 0,
      totalHours: 0
    }
  );
}

module.exports = {
  getHolidayDatesForPeriod,
  normalizeTimesheetEntries,
  replaceTimesheetEntries,
  summarizeEntries
};