const jwt = require('jsonwebtoken');
const env = require('../config/env');
const createHttpError = require('../utils/http-error');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(createHttpError(401, 'Missing or invalid authorization token.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const userId = Number(payload.sub);

    if (Number.isNaN(userId)) {
      return next(createHttpError(401, 'Token payload is invalid.'));
    }

    req.user = {
      id: userId,
      username: payload.username,
      roleSystem: payload.roleSystem
    };
    return next();
  } catch (error) {
    return next(createHttpError(401, 'Token is invalid or expired.'));
  }
}

module.exports = authenticate;
