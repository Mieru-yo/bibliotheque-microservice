const pool = require('../config/db');

class UserRepository {
  async create({ username, email, passwordHash, role = 'user' }) {
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, active, created_at',
      [username, email, passwordHash, role]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, role, active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
