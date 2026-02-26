const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      message: 'Missing or invalid authorization token',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({
      status: 401,
      message: 'Token expired or invalid',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 403,
      message: 'Admin access required',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
