const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const {
  calculateTotalHours,
  getMonthDateList,
  isWeekend,
  normalizeDateKey,
  normalizeLunchBreak,
  normalizeTime,
  parseHolidayDates
} = require('../utils/time');

const TEMPLATE_CANDIDATES = [
  path.resolve(__dirname, '..', '..', '..', 'fe-ts', 'public', 'template.xlsx'),
  path.resolve(process.cwd(), '..', 'fe-ts', 'public', 'template.xlsx'),
  path.resolve(process.cwd(), 'fe-ts', 'public', 'template.xlsx')
];

const TABLE_START_ROW = 11;
const TABLE_MAX_ROWS = 31;
const DARK_RED = 'FFC00000';
const BLACK = 'FF000000';
const WHITE = 'FFFFFFFF';

function resolveTemplatePath() {
  for (const candidate of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Template Excel tidak ditemukan. Pastikan fe-ts/public/template.xlsx tersedia.');
}

function getEntryMap(entries = []) {
  return new Map(entries.map((entry) => [normalizeDateKey(entry.date), entry]));
}

function getDisplayHoursFromTimeRange(startTime, lunchBreak, endTime) {
  const normalizedStart = normalizeTime(startTime);
  const normalizedLunch = normalizeLunchBreak(lunchBreak);
  const normalizedEnd = normalizeTime(endTime);

  if (!normalizedStart || !normalizedEnd) {
    return '';
  }

  return calculateTotalHours(normalizedStart, normalizedLunch, normalizedEnd).toFixed(2);
}

function formatDateDisplay(dateKey) {
  const [year, month, day] = String(dateKey).split('-');
  return `${day}/${month}/${year}`;
}

function signatureLabel(value) {
  return `( ${value || '-'} )`;
}

function appendBottomRightLogo(workbook, worksheet) {
  const templateLogo = workbook.model?.media?.find((item) => item?.type === 'image' && item?.buffer);
  if (!templateLogo) {
    return;
  }

  const logoImageId = workbook.addImage({
    buffer: templateLogo.buffer,
    extension: templateLogo.extension || 'png'
  });

  worksheet.addImage(logoImageId, {
    tl: { col: 9.1, row: 42.1 },
    ext: { width: 120, height: 50 }
  });
}

function toWeekendRemark(dayName) {
  if (dayName === 'Saturday') {
    return 'Sabtu';
  }

  if (dayName === 'Sunday') {
    return 'Minggu';
  }

  return 'Weekend';
}

function toHolidayCategoryRemark(holidayName) {
  const normalized = String(holidayName || '').trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('cuti bersama')) {
    return normalized || 'Cuti Bersama';
  }

  const religiousKeywords = [
    'idul',
    'natal',
    'waisak',
    'nyepi',
    'imlek',
    'maulid',
    'isra',
    'muharram',
    'galungan',
    'kuningan',
    'keagamaan',
    'ramadan',
    'paskah',
    'asyura'
  ];

  if (religiousKeywords.some((keyword) => lower.includes(keyword))) {
    return normalized ? `Hari Keagamaan - ${normalized}` : 'Hari Keagamaan';
  }

  return normalized ? `Hari Nasional - ${normalized}` : 'Hari Nasional';
}

function applyHolidayBackgroundStyle(worksheet, rowNumber) {
  ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((column) => {
    const cell = worksheet.getCell(`${column}${rowNumber}`);
    const currentStyle = cell.style || {};
    cell.style = {
      ...currentStyle,
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: DARK_RED }
      },
      font: {
        ...(currentStyle.font || {}),
        color: { argb: WHITE },
        bold: true
      }
    };
  });
}

function applyNormalDayStyle(worksheet, rowNumber) {
  ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((column) => {
    const cell = worksheet.getCell(`${column}${rowNumber}`);
    const currentStyle = cell.style || {};
    cell.style = {
      ...currentStyle,
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: WHITE }
      },
      font: {
        ...(currentStyle.font || {}),
        color: { argb: BLACK },
        bold: false
      }
    };
  });
}

async function buildTimesheetWorkbook({ user, period, entries = [], holidayDates = [], holidays = [] }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolveTemplatePath());

  workbook.creator = 'TS-IDStar';
  workbook.lastModifiedBy = 'TS-IDStar';
  workbook.modified = new Date();

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Worksheet template tidak ditemukan.');
  }

  const holidaySet = parseHolidayDates(holidayDates);
  const holidayNameByDate = new Map(
    (Array.isArray(holidays) ? holidays : [])
      .map((holiday) => ({
        dateKey: normalizeDateKey(holiday?.date),
        name: String(holiday?.name || '').trim()
      }))
      .filter((holiday) => holiday.dateKey)
      .map((holiday) => [holiday.dateKey, holiday.name])
  );
  const entryMap = getEntryMap(entries);
  const rows = getMonthDateList(period).map(({ date, dateKey, dayName }) => {
    const entry = entryMap.get(dateKey);
    const weekend = isWeekend(date);
    const holidayName = holidayNameByDate.get(dateKey);
    const holiday = holidaySet.has(dateKey);
    const blocked = weekend || holiday;
    const blockedRemark = holiday ? toHolidayCategoryRemark(holidayName) : weekend ? toWeekendRemark(dayName) : '';

    if (blocked) {
      return {
        dayName,
        dateKey,
        startTime: '',
        lunchBreak: '',
        endTime: '',
        totalHours: '',
        activity: blockedRemark,
        blocked: true,
        blockedRemark
      };
    }

    const startTime = normalizeTime(entry?.startTime);
    const lunchBreak = normalizeLunchBreak(entry?.lunchBreak);
    const endTime = normalizeTime(entry?.endTime);
    const totalHours = getDisplayHoursFromTimeRange(startTime, lunchBreak, endTime);

    return {
      dayName,
      dateKey,
      startTime,
      lunchBreak,
      endTime,
      totalHours,
      activity: entry?.activity || '',
      blocked: false
    };
  });

  worksheet.getCell('C7').value = user.name || '';
  worksheet.getCell('H7').value = user.roleJob || '';
  worksheet.getCell('C8').value = user.department || '';
  worksheet.getCell('H8').value = user.location || '';
  worksheet.getCell('C9').value = user.project || '';
  worksheet.getCell('H9').value = period || '';

  const blockedRowNumbers = [];
  for (let index = 0; index < TABLE_MAX_ROWS; index += 1) {
    const rowNumber = TABLE_START_ROW + index;
    worksheet.getCell(`B${rowNumber}`).value = '';
    worksheet.getCell(`C${rowNumber}`).value = '';
    worksheet.getCell(`D${rowNumber}`).value = '';
    worksheet.getCell(`E${rowNumber}`).value = '';
    worksheet.getCell(`F${rowNumber}`).value = '';
    worksheet.getCell(`G${rowNumber}`).value = '';
    worksheet.getCell(`H${rowNumber}`).value = '';

    const rowData = rows[index];
    if (!rowData) {
      continue;
    }

    worksheet.getCell(`B${rowNumber}`).value = rowData.dayName;
    worksheet.getCell(`C${rowNumber}`).value = formatDateDisplay(rowData.dateKey);
    worksheet.getCell(`D${rowNumber}`).value = rowData.startTime;
    worksheet.getCell(`E${rowNumber}`).value = rowData.lunchBreak;
    worksheet.getCell(`F${rowNumber}`).value = rowData.endTime;
    worksheet.getCell(`G${rowNumber}`).value = rowData.totalHours;
    worksheet.getCell(`H${rowNumber}`).value = rowData.blocked ? rowData.blockedRemark : rowData.activity;

    applyNormalDayStyle(worksheet, rowNumber);

    if (rowData.blocked) {
      blockedRowNumbers.push(rowNumber);
    }
  }

  blockedRowNumbers.forEach((rowNumber) => {
    applyHolidayBackgroundStyle(worksheet, rowNumber);
  });

  worksheet.getCell('B47').value = signatureLabel(user.name);
  worksheet.getCell('B48').value = user.roleJob || '';
  worksheet.getCell('E47').value = signatureLabel(user.teamLeadName);
  worksheet.getCell('E48').value = 'Team Lead';
  worksheet.getCell('H47').value = signatureLabel(user.deptHeadName);
  worksheet.getCell('H48').value = 'Dept. Head';

  appendBottomRightLogo(workbook, worksheet);

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildTimesheetWorkbook
};
