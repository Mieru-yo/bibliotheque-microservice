const pool = require('../config/db');

class LoanRepository {
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT l.*, b.title as book_title, b.author as book_author
       FROM loans l JOIN books b ON l.book_id = b.id
       WHERE l.user_id = $1 ORDER BY l.borrowed_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async findActiveByBookId(bookId) {
    const result = await pool.query(
      "SELECT * FROM loans WHERE book_id = $1 AND status = 'ACTIVE'",
      [bookId]
    );
    return result.rows[0] || null;
  }

  async findByStatus(status) {
    const result = await pool.query(
      'SELECT * FROM loans WHERE status = $1',
      [status]
    );
    return result.rows;
  }

  async save(loan) {
    if (loan.id) {
      const result = await pool.query(
        'UPDATE loans SET status = $1, returned_at = $2 WHERE id = $3 RETURNING *',
        [loan.status, loan.returned_at, loan.id]
      );
      return result.rows[0];
    }
    const result = await pool.query(
      'INSERT INTO loans (book_id, user_id) VALUES ($1, $2) RETURNING *',
      [loan.book_id, loan.user_id]
    );
    return result.rows[0];
  }
}

module.exports = new LoanRepository();
