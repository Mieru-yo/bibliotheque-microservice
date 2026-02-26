const pool = require('./db');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(13) UNIQUE,
        description TEXT,
        total_copies INTEGER DEFAULT 1,
        available_copies INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS loans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        borrowed_at TIMESTAMP DEFAULT NOW(),
        due_date TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
        returned_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE'))
      );
    `);
    console.log('Database tables initialized');

    // Seed default admin if not exists
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminUsername || !adminPassword) {
      console.log('Skipping admin seed — ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD not set');
      return;
    }
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, saltRounds);
      await client.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [adminUsername, adminEmail, hash, 'admin']
      );
      console.log(`Default admin created — email: ${adminEmail}`);
    }

    // Seed sample books if table is empty
    const bookCount = await client.query('SELECT COUNT(*) FROM books');
    if (parseInt(bookCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO books (title, author, isbn, description, total_copies, available_copies) VALUES
        ('Clean Code', 'Robert C. Martin', '9780132350884', 'A Handbook of Agile Software Craftsmanship', 3, 3),
        ('Design Patterns', 'Gang of Four', '9780201633610', 'Elements of Reusable Object-Oriented Software', 2, 2),
        ('The Pragmatic Programmer', 'David Thomas & Andrew Hunt', '9780135957059', 'Your Journey to Mastery', 4, 4),
        ('Refactoring', 'Martin Fowler', '9780134757599', 'Improving the Design of Existing Code', 2, 2),
        ('Domain-Driven Design', 'Eric Evans', '9780321125217', 'Tackling Complexity in the Heart of Software', 1, 1)
      `);
      console.log('Sample books seeded (5 books)');
    }
  } finally {
    client.release();
  }
}

module.exports = initDatabase;
