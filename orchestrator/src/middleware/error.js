const { AppError } = require('../utils/errors');

function notFound(_req, res) {
  res.status(404).json({ success: false, error: 'endpoint not found' });
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details || undefined,
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    error: 'internal server error',
  });
}

module.exports = {
  notFound,
  errorHandler,
};
