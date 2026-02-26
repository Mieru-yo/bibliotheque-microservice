function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    console.error(JSON.stringify({
      level: 'ERROR',
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    }));
  }

  res.status(status).json({
    status,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandler;
