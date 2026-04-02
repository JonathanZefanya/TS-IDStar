const bcrypt = require('bcryptjs');
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
  username: true,
  createdAt: true,
  updatedAt: true
};

const holidaySelect = {
  id: true,
  date: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
};

const allowedRoleSystems = new Set(['admin', 'user']);
const allowedTimesheetStatuses = new Set(['draft', 'submitted', 'approved']);

function normalizeRoleSystem(value) {
  const normalized = String(value || 'user').trim().toLowerCase();
  if (!allowedRoleSystems.has(normalized)) {
    throw createHttpError(400, 'roleSystem must be either admin or user.');
  }
  return normalized;
}

function normalizeTimesheetStatus(value) {
  const normalized = String(value || 'draft').trim().toLowerCase();
  if (!allowedTimesheetStatuses.has(normalized)) {
    throw createHttpError(400, 'Invalid timesheet status.');
  }
  return normalized;
}

function parseRequiredDate(value, fieldName = 'date') {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const stringValue = String(value || '').trim();
  if (!stringValue) {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  const date = new Date(`${stringValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `Invalid ${fieldName} value.`);
  }

  return date;
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

function normalizeUserPayload(body) {
  return {
    name: String(body.name || '').trim(),
    roleSystem: normalizeRoleSystem(body.roleSystem),
    roleJob: String(body.roleJob || '').trim(),
    department: String(body.department || '').trim(),
    location: String(body.location || '').trim(),
    project: String(body.project || '').trim(),
    teamLeadName: String(body.teamLeadName || '').trim(),
    deptHeadName: String(body.deptHeadName || '').trim(),
    username: String(body.username || '').trim(),
    password: String(body.password || '')
  };
}

function normalizeHolidayPayload(body) {
  return {
    date: parseRequiredDate(body.date, 'holiday date'),
    name: String(body.name || '').trim(),
    isActive: parseBoolean(body.isActive, true)
  };
}

function normalizeTimesheetPayload(body) {
  const period = String(body.period || '').trim();
  if (!isValidPeriod(period)) {
    throw createHttpError(400, 'Period must use YYYY-MM format.');
  }

  const userId = Number(body.userId);
  if (Number.isNaN(userId)) {
    throw createHttpError(400, 'userId is required.');
  }

  return {
    userId,
    period,
    status: normalizeTimesheetStatus(body.status),
    entries: Array.isArray(body.entries) ? body.entries : null
  };
}

function requireFields(fields) {
  const missing = fields.filter(({ value }) => !String(value || '').trim());
  if (missing.length) {
    throw createHttpError(400, `${missing.map((field) => field.name).join(', ')} are required.`);
  }
}

async function loadTimesheetBundle(timesheetId) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: {
      user: {
        select: userSelect
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  });

  if (!timesheet) {
    throw createHttpError(404, 'Timesheet not found.');
  }

  const { holidays, holidayDates } = await getHolidayDatesForPeriod(timesheet.period);
  return { timesheet, holidays, holidayDates };
}

async function writeTimesheetEntries(timesheet, entries = null) {
  if (entries !== null) {
    const { holidayDates } = await getHolidayDatesForPeriod(timesheet.period);
    const normalizedEntries = normalizeTimesheetEntries(entries, holidayDates);
    await replaceTimesheetEntries(timesheet.id, normalizedEntries);
  }

  return prisma.timesheet.findUnique({
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
}

const listUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userSelect
  });

  res.json({ users });
});

const createUser = asyncHandler(async (req, res) => {
  const payload = normalizeUserPayload(req.body);
  requireFields([
    { name: 'name', value: payload.name },
    { name: 'roleJob', value: payload.roleJob },
    { name: 'department', value: payload.department },
    { name: 'location', value: payload.location },
    { name: 'project', value: payload.project },
    { name: 'teamLeadName', value: payload.teamLeadName },
    { name: 'deptHeadName', value: payload.deptHeadName },
    { name: 'username', value: payload.username },
    { name: 'password', value: payload.password }
  ]);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      roleSystem: payload.roleSystem,
      roleJob: payload.roleJob,
      department: payload.department,
      location: payload.location,
      project: payload.project,
      teamLeadName: payload.teamLeadName,
      deptHeadName: payload.deptHeadName,
      username: payload.username,
      password: await bcrypt.hash(payload.password, 10)
    },
    select: userSelect
  });

  res.status(201).json({ user });
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    throw createHttpError(400, 'Invalid user id.');
  }

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw createHttpError(404, 'User not found.');
  }

  const payload = normalizeUserPayload({ ...existingUser, ...req.body });
  requireFields([
    { name: 'name', value: payload.name },
    { name: 'roleJob', value: payload.roleJob },
    { name: 'department', value: payload.department },
    { name: 'location', value: payload.location },
    { name: 'project', value: payload.project },
    { name: 'teamLeadName', value: payload.teamLeadName },
    { name: 'deptHeadName', value: payload.deptHeadName },
    { name: 'username', value: payload.username }
  ]);

  const data = {
    name: payload.name,
    roleSystem: payload.roleSystem,
    roleJob: payload.roleJob,
    department: payload.department,
    location: payload.location,
    project: payload.project,
    teamLeadName: payload.teamLeadName,
    deptHeadName: payload.deptHeadName,
    username: payload.username
  };

  if (String(req.body.password || '').trim()) {
    data.password = await bcrypt.hash(String(req.body.password), 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect
  });

  res.json({ user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    throw createHttpError(400, 'Invalid user id.');
  }

  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
});

const listTimesheets = asyncHandler(async (_req, res) => {
  const timesheets = await prisma.timesheet.findMany({
    orderBy: [{ period: 'desc' }, { updatedAt: 'desc' }],
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
    timesheets: timesheets.map((timesheet) => ({
      ...timesheet,
      summary: summarizeEntries(timesheet.entries)
    }))
  });
});

const getTimesheetById = asyncHandler(async (req, res) => {
  const timesheetId = Number(req.params.id);
  if (Number.isNaN(timesheetId)) {
    throw createHttpError(400, 'Invalid timesheet id.');
  }

  const { timesheet, holidayDates } = await loadTimesheetBundle(timesheetId);

  res.json({
    timesheet: {
      ...timesheet,
      summary: summarizeEntries(timesheet.entries)
    },
    holidayDates
  });
});

const createTimesheet = asyncHandler(async (req, res) => {
  const payload = normalizeTimesheetPayload(req.body);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  const existingTimesheet = await prisma.timesheet.findUnique({
    where: {
      userId_period: {
        userId: payload.userId,
        period: payload.period
      }
    }
  });

  if (existingTimesheet) {
    throw createHttpError(409, 'Timesheet already exists for this employee and period.');
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      userId: payload.userId,
      period: payload.period,
      status: payload.status
    }
  });

  const hydratedTimesheet = await writeTimesheetEntries(timesheet, payload.entries);
  const { holidayDates } = await getHolidayDatesForPeriod(hydratedTimesheet.period);

  res.status(201).json({
    timesheet: {
      ...hydratedTimesheet,
      summary: summarizeEntries(hydratedTimesheet.entries)
    },
    holidayDates
  });
});

const updateTimesheet = asyncHandler(async (req, res) => {
  const timesheetId = Number(req.params.id);
  if (Number.isNaN(timesheetId)) {
    throw createHttpError(400, 'Invalid timesheet id.');
  }

  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: { entries: true }
  });

  if (!existingTimesheet) {
    throw createHttpError(404, 'Timesheet not found.');
  }

  const payload = normalizeTimesheetPayload({
    userId: req.body.userId ?? existingTimesheet.userId,
    period: req.body.period ?? existingTimesheet.period,
    status: req.body.status ?? existingTimesheet.status,
    entries: req.body.entries
  });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  const updatedTimesheet = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      userId: payload.userId,
      period: payload.period,
      status: payload.status
    }
  });

  const hydratedTimesheet = await writeTimesheetEntries(updatedTimesheet, payload.entries);
  const { holidayDates } = await getHolidayDatesForPeriod(hydratedTimesheet.period);

  res.json({
    timesheet: {
      ...hydratedTimesheet,
      summary: summarizeEntries(hydratedTimesheet.entries)
    },
    holidayDates
  });
});

const deleteTimesheet = asyncHandler(async (req, res) => {
  const timesheetId = Number(req.params.id);
  if (Number.isNaN(timesheetId)) {
    throw createHttpError(400, 'Invalid timesheet id.');
  }

  await prisma.timesheet.delete({ where: { id: timesheetId } });
  res.status(204).send();
});

const exportTimesheetById = asyncHandler(async (req, res) => {
  const timesheetId = Number(req.params.id);
  if (Number.isNaN(timesheetId)) {
    throw createHttpError(400, 'Invalid timesheet id.');
  }

  const { timesheet, holidays, holidayDates } = await loadTimesheetBundle(timesheetId);
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

const listHolidays = asyncHandler(async (_req, res) => {
  const holidays = await prisma.holiday.findMany({
    orderBy: { date: 'asc' },
    select: holidaySelect
  });

  res.json({ holidays });
});

const createHoliday = asyncHandler(async (req, res) => {
  const payload = normalizeHolidayPayload(req.body);
  requireFields([
    { name: 'date', value: payload.date },
    { name: 'name', value: payload.name }
  ]);

  const holiday = await prisma.holiday.create({
    data: {
      date: payload.date,
      name: payload.name,
      isActive: payload.isActive
    },
    select: holidaySelect
  });

  res.status(201).json({ holiday });
});

const updateHoliday = asyncHandler(async (req, res) => {
  const holidayId = Number(req.params.id);
  if (Number.isNaN(holidayId)) {
    throw createHttpError(400, 'Invalid holiday id.');
  }

  const existingHoliday = await prisma.holiday.findUnique({
    where: { id: holidayId }
  });

  if (!existingHoliday) {
    throw createHttpError(404, 'Holiday not found.');
  }

  const payload = normalizeHolidayPayload({
    date: req.body.date ?? existingHoliday.date,
    name: req.body.name ?? existingHoliday.name,
    isActive: req.body.isActive ?? existingHoliday.isActive
  });

  requireFields([
    { name: 'date', value: payload.date },
    { name: 'name', value: payload.name }
  ]);

  const holiday = await prisma.holiday.update({
    where: { id: holidayId },
    data: {
      date: payload.date,
      name: payload.name,
      isActive: payload.isActive
    },
    select: holidaySelect
  });

  res.json({ holiday });
});

const deleteHoliday = asyncHandler(async (req, res) => {
  const holidayId = Number(req.params.id);
  if (Number.isNaN(holidayId)) {
    throw createHttpError(400, 'Invalid holiday id.');
  }

  await prisma.holiday.delete({ where: { id: holidayId } });
  res.status(204).send();
});

module.exports = {
  createHoliday,
  createTimesheet,
  createUser,
  deleteHoliday,
  deleteTimesheet,
  deleteUser,
  exportTimesheetById,
  getTimesheetById,
  listHolidays,
  listTimesheets,
  listUsers,
  updateHoliday,
  updateTimesheet,
  updateUser
};
