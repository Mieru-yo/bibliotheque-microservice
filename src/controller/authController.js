const authService = require('../service/authService');

function respond(res, data, message = 'Success', status = 200) {
  res.status(status).json({ status, message, data, timestamp: new Date().toISOString() });
}

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        status: 400, message: 'Username, email and password are required', data: null, timestamp: new Date().toISOString(),
      });
    }
    const user = await authService.register({ username, email, password });
    respond(res, user, 'User registered', 201);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: 400, message: 'Email and password are required', data: null, timestamp: new Date().toISOString(),
      });
    }
    const result = await authService.login({ email, password });
    respond(res, result, 'Login successful');
  } catch (err) { next(err); }
}

module.exports = { register, login };
