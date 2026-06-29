const prisma = require('../config/prisma');
const asyncHandler = require('../utils/async-handler');
const createHttpError = require('../utils/http-error');
const { buildTimesheetWorkbook } = require('../services/excel.service');
const {
  getHolidayDatesForPeriod,
  normalizeTimesheetEntries,
  replaceTimesheetEntries,
  summarizeEntries
} = require('../services/timesheet.service');
const { isValidPeriod } = require('../utils/time');

const userSelect = {
  id: true,
  name: true,
  roleSystem: true,
  roleJob: true,
  department: true,
  location: true,
  project: true,
  teamLeadName: true,
  deptHeadName: true,
  clientLogoDataUrl: true,
  username: true,
  createdAt: true,
  updatedAt: true
};

function assertValidPeriod(period) {
  if (!isValidPeriod(period)) {
    throw createHttpError(400, 'Period must use YYYY-MM format.');
  }
}

function getPeriodFromRequest(req) {
  return String(req.params.period || req.query.period || '').trim();
}

async function getOrCreateTimesheet(userId, period) {
  return prisma.timesheet.upsert({
    where: {
      userId_period: {
        userId,
        period
      }
    },
    update: {},
    create: {
      userId,
      period,
      status: 'draft'
    },
    include: {
      user: {
        select: userSelect
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  });
}

async function loadTimesheetBundle(userId, period) {
  const timesheet = await prisma.timesheet.findUnique({
    where: {
      userId_period: {
        userId,
        period
      }
    },
    include: {
      user: {
        select: userSelect
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  });

  const { holidayDates } = await getHolidayDatesForPeriod(period);
  return { timesheet, holidayDates };
}

const getMyTimesheet = asyncHandler(async (req, res) => {
  const period = getPeriodFromRequest(req);
  assertValidPeriod(period);

  const timesheet = await getOrCreateTimesheet(req.user.id, period);
  const { holidayDates } = await getHolidayDatesForPeriod(period);

  res.json({
    timesheet,
    holidayDates,
    summary: summarizeEntries(timesheet.entries)
  });
});

const getMyTimesheetDetail = asyncHandler(async (req, res) => {
  const period = getPeriodFromRequest(req);
  assertValidPeriod(period);

  const { timesheet, holidayDates } = await loadTimesheetBundle(req.user.id, period);

  if (!timesheet) {
    throw createHttpError(404, 'Timesheet not found.');
  }

  res.json({
    timesheet,
    holidayDates,
    summary: summarizeEntries(timesheet.entries)
  });
});

const saveMyTimesheetEntries = asyncHandler(async (req, res) => {
  const period = getPeriodFromRequest(req);
  assertValidPeriod(period);

  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!entries.length) {
    throw createHttpError(400, 'entries array is required.');
  }

  const { holidayDates } = await getHolidayDatesForPeriod(period);
  const normalizedEntries = normalizeTimesheetEntries(entries, holidayDates);

  const timesheet = await prisma.timesheet.upsert({
    where: {
      userId_period: {
        userId: req.user.id,
        period
      }
    },
    update: {
      status: 'draft'
    },
    create: {
      userId: req.user.id,
      period,
      status: 'draft'
    }
  });

  await replaceTimesheetEntries(timesheet.id, normalizedEntries);

  const updatedTimesheet = await prisma.timesheet.findUnique({
    where: { id: timesheet.id },
    include: {
      user: {
        select: userSelect
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  });

  res.json({
    timesheet: updatedTimesheet,
    holidayDates,
    summary: summarizeEntries(updatedTimesheet.entries)
  });
});

const submitMyTimesheet = asyncHandler(async (req, res) => {
  const period = getPeriodFromRequest(req);
  assertValidPeriod(period);

  const timesheet = await prisma.timesheet.upsert({
    where: {
      userId_period: {
        userId: req.user.id,
        period
      }
    },
    update: {
      status: 'submitted'
    },
    create: {
      userId: req.user.id,
      period,
      status: 'submitted'
    }
  });

  const { holidayDates } = await getHolidayDatesForPeriod(period);

  res.json({
    message: 'Timesheet submitted successfully.',
    timesheet,
    holidayDates
  });
});

const exportMyTimesheet = asyncHandler(async (req, res) => {
  const period = getPeriodFromRequest(req);
  assertValidPeriod(period);

  const { holidays, holidayDates } = await getHolidayDatesForPeriod(period);
  const timesheet = await prisma.timesheet.findUnique({
    where: {
      userId_period: {
        userId: req.user.id,
        period
      }
    },
    include: {
      user: true,
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  });

  if (!timesheet) {
    const fallbackUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!fallbackUser) {
      throw createHttpError(404, 'User not found.');
    }

    const buffer = await buildTimesheetWorkbook({
      user: fallbackUser,
      period,
      entries: [],
      holidayDates,
      holidays
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="timesheet-${fallbackUser.username}-${period}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  const buffer = await buildTimesheetWorkbook({
    user: timesheet.user,
    period: timesheet.period,
    entries: timesheet.entries,
    holidayDates,
    holidays
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="timesheet-${timesheet.user.username}-${timesheet.period}.xlsx"`);
  res.send(Buffer.from(buffer));
});

module.exports = {
  exportMyTimesheet,
  getMyTimesheet,
  getMyTimesheetDetail,
  saveMyTimesheetEntries,
  submitMyTimesheet
};
