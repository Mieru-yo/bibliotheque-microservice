const pool = require('../config/db');
const { dbQueryDuration } = require('../config/metrics');

class BookRepository {
  async findById(id) {
    const end = dbQueryDuration.startTimer({ query: 'findById' });
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    end();
    return result.rows[0] || null;
  }

  async findAll({ page = 1, size = 10, sort = 'created_at' }) {
    const allowedSorts = ['created_at', 'title', 'author'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const offset = (page - 1) * size;
    const end = dbQueryDuration.startTimer({ query: 'findAll' });
    const countResult = await pool.query('SELECT COUNT(*) FROM books');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT * FROM books ORDER BY ${sortCol} DESC LIMIT $1 OFFSET $2`,
      [size, offset]
    );
    end();
    return { data: result.rows, total, page, size };
  }

  async findByTitleContaining(title) {
    const result = await pool.query(
      'SELECT * FROM books WHERE title ILIKE $1', [`%${title}%`]
    );
    return result.rows;
  }

  async findByAuthorContaining(author) {
    const result = await pool.query(
      'SELECT * FROM books WHERE author ILIKE $1', [`%${author}%`]
    );
    return result.rows;
  }

  async findByAvailable(available) {
    const result = await pool.query(
      'SELECT * FROM books WHERE available_copies > 0 = $1', [available]
    );
    return result.rows;
  }

  async save(book) {
    const end = dbQueryDuration.startTimer({ query: 'save' });
    if (book.id) {
      const result = await pool.query(
        `UPDATE books SET title = COALESCE($1, title), author = COALESCE($2, author),
         isbn = COALESCE($3, isbn), description = COALESCE($4, description),
         total_copies = COALESCE($5, total_copies), available_copies = COALESCE($6, available_copies),
         updated_at = NOW() WHERE id = $7 RETURNING *`,
        [book.title, book.author, book.isbn, book.description, book.total_copies, book.available_copies, book.id]
      );
      end();
      return result.rows[0];
    }
    const result = await pool.query(
      `INSERT INTO books (title, author, isbn, description, total_copies, available_copies)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [book.title, book.author, book.isbn, book.description, book.total_copies || 1]
    );
    end();
    return result.rows[0];
  }

  async deleteById(id) {
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  async decrementAvailable(id) {
    const result = await pool.query(
      'UPDATE books SET available_copies = available_copies - 1, updated_at = NOW() WHERE id = $1 AND available_copies > 0 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  async incrementAvailable(id) {
    const result = await pool.query(
      'UPDATE books SET available_copies = available_copies + 1, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new BookRepository();
