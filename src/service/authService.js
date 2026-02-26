const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repository/userRepository');

class AuthService {
  async register({ username, email, password }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const error = new Error('Email already registered');
      error.status = 409;
      throw error;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    return userRepository.create({ username, email, passwordHash });
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    const token = this.generateToken(user);
    return { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } };
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  validateToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = new AuthService();
