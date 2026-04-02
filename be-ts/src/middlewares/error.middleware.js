function notFoundHandler(req, _res, next) {
  next({ statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || 'Internal server error'
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (error.code === 'P2002') {
    return res.status(409).json({
      message: 'Duplicate record detected.',
      details: error.meta?.target || []
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      message: 'Record not found.'
    });
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
