const createHttpError = require('../utils/http-error');

function requireRole(...allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.user || !allowedRoles.includes(req.user.roleSystem)) {
      return next(createHttpError(403, 'You do not have permission to access this resource.'));
    }

    return next();
  };
}

module.exports = requireRole;
