const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const {
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
} = require('../controllers/admin.controller');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/timesheets', listTimesheets);
router.post('/timesheets', createTimesheet);
router.get('/timesheets/:id', getTimesheetById);
router.put('/timesheets/:id', updateTimesheet);
router.delete('/timesheets/:id', deleteTimesheet);
router.get('/timesheets/:id/export', exportTimesheetById);

router.get('/holidays', listHolidays);
router.post('/holidays', createHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

module.exports = router;
