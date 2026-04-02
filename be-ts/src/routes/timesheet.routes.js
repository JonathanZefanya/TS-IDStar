const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const {
  exportMyTimesheet,
  getMyTimesheet,
  getMyTimesheetDetail,
  saveMyTimesheetEntries,
  submitMyTimesheet
} = require('../controllers/timesheet.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', getMyTimesheet);
router.get('/me/detail', getMyTimesheetDetail);
router.put('/me/:period/entries', saveMyTimesheetEntries);
router.post('/me/:period/submit', submitMyTimesheet);
router.get('/me/:period/export', exportMyTimesheet);

module.exports = router;
