const express = require('express');
const { login, me, updateMyClientLogo } = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/me/client-logo', authenticate, updateMyClientLogo);

module.exports = router;
