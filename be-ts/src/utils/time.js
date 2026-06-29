const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isValidPeriod(period) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

function parsePeriod(period) {
  if (!isValidPeriod(period)) {
    throw new Error('Invalid period format. Use YYYY-MM.');
  }

  const [yearValue, monthValue] = period.split('-');
  return {
    year: Number(yearValue),
    monthIndex: Number(monthValue) - 1
  };
}

function getPeriodDateRange(period) {
  const { year, monthIndex } = parsePeriod(period);

  return {
    startDate: new Date(Date.UTC(year, monthIndex, 1)),
    endDate: new Date(Date.UTC(year, monthIndex + 1, 0))
  };
}

function getDaysInPeriod(period) {
  const { year, monthIndex } = parsePeriod(period);
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getMonthDateList(period) {
  const { year, monthIndex } = parsePeriod(period);
  const totalDays = getDaysInPeriod(period);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index + 1));
    const dateKey = date.toISOString().slice(0, 10);

    return {
      date,
      dateKey,
      dayName: DAY_NAMES[date.getUTCDay()]
    };
  });
}

function normalizeDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function normalizeTime(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return '';
  }

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

function normalizeLunchBreak(value) {
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

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function lunchBreakToMinutes(value) {
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

    return rangeEnd - rangeStart;
  }

  return timeToMinutes(normalized) ?? 0;
}

function calculateTotalHours(startTime, lunchBreak, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const lunchMinutes = lunchBreakToMinutes(lunchBreak);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }

  const totalMinutes = Math.max(endMinutes - startMinutes - lunchMinutes, 0);
  return Number((totalMinutes / 60).toFixed(2));
}

function isWeekend(value) {
  const date = value instanceof Date ? value : new Date(value);
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function parseHolidayDates(input) {
  if (!input) {
    return new Set();
  }

  const values = Array.isArray(input) ? input : String(input).split(',');
  return new Set(
    values
      .map((value) => String(value).trim())
      .filter(Boolean)
      .map((value) => normalizeDateKey(value))
  );
}

module.exports = {
  calculateTotalHours,
  getDaysInPeriod,
  getMonthDateList,
  getPeriodDateRange,
  isValidPeriod,
  isWeekend,
  normalizeDateKey,
  normalizeLunchBreak,
  normalizeTime,
  parseHolidayDates,
  parsePeriod
};
