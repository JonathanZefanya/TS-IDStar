const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const env = require('../config/env');
const asyncHandler = require('../utils/async-handler');
const createHttpError = require('../utils/http-error');

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

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...rest } = user;
  return rest;
}

const login = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required.');
  }

  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    throw createHttpError(401, 'Invalid username or password.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createHttpError(401, 'Invalid username or password.');
  }

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roleSystem: user.roleSystem
    },
    env.jwtSecret,
    { expiresIn: '8h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: normalizeUser(user)
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: userSelect
  });

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  res.json({ user });
});

module.exports = {
  login,
  me
};
