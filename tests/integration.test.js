const { GenericContainer, Wait } = require('testcontainers');

let container;
let app;
let request;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  // Start a real PostgreSQL container
  container = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_DB: 'library_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  // Give PostgreSQL a moment to finish initialization
  await sleep(2000);

  const host = container.getHost();
  const port = container.getMappedPort(5432);

  // Set env BEFORE requiring any app module (pool is created at require time)
  process.env.DATABASE_URL = `postgresql://test:test@${host}:${port}/library_test`;
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.ADMIN_EMAIL = 'admin@library.com';
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'admin123';

  // Clear module cache so db.js picks up the new DATABASE_URL
  jest.resetModules();

  // Now require fresh modules
  const initDatabase = require('../src/config/init-db');
  await initDatabase();

  app = require('../src/app');
  request = require('supertest');
}, 60000);

afterAll(async () => {
  const pool = require('../src/config/db');
  await pool.end();
  if (container) await container.stop();
}, 30000);

describe('Integration Tests - Full API Flow', () => {
  let token;
  let adminToken;
  let bookId;

  test('POST /api/v1/auth/register - should register a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe(201);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.role).toBe('user');
  });

  test('POST /api/v1/auth/register - should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser2', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  test('POST /api/v1/auth/login - should login and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  test('POST /api/v1/auth/login - should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('Login as seeded admin for book management', async () => {
    // Use the admin seeded by init-db.js (admin@library.com / admin123)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@library.com', password: 'admin123' });

    expect(res.status).toBe(200);
    adminToken = res.body.data.token;
  });

  test('POST /api/v1/books - should create a book (admin)', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        description: 'A Handbook of Agile Software Craftsmanship',
        total_copies: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Clean Code');
    expect(res.body.data.available_copies).toBe(3);
    bookId = res.body.data.id;
  });

  test('POST /api/v1/books - should reject if not admin', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', author: 'Test' });

    expect(res.status).toBe(403);
  });

  test('GET /api/v1/books - should list books', async () => {
    const res = await request(app).get('/api/v1/books');

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].title).toBe('Clean Code');
  });

  test('GET /api/v1/books/:id - should get book by id', async () => {
    const res = await request(app).get(`/api/v1/books/${bookId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Clean Code');
  });

  test('POST /api/v1/books/:id/borrow - should borrow a book', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/borrow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data.book_id).toBe(bookId);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  test('POST /api/v1/books/:id/borrow - should reject double borrow', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/borrow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  test('GET /api/v1/books/:id - available_copies should decrease', async () => {
    const res = await request(app).get(`/api/v1/books/${bookId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.available_copies).toBe(2);
  });

  test('GET /api/v1/books/loans - should return user loans', async () => {
    const res = await request(app)
      .get('/api/v1/books/loans')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].book_title).toBe('Clean Code');
  });

  test('POST /api/v1/books/:id/return - should return a book', async () => {
    const res = await request(app)
      .post(`/api/v1/books/${bookId}/return`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RETURNED');
  });

  test('GET /api/v1/books/:id - available_copies should increase back', async () => {
    const res = await request(app).get(`/api/v1/books/${bookId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.available_copies).toBe(3);
  });

  test('PUT /api/v1/books/:id - should update a book (admin)', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Clean Code (2nd Edition)' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Clean Code (2nd Edition)');
  });

  test('DELETE /api/v1/books/:id - should delete a book (admin)', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${bookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('GET /api/v1/books/:id - deleted book should return 404', async () => {
    const res = await request(app).get(`/api/v1/books/${bookId}`);

    expect(res.status).toBe(404);
  });

  test('GET /health - should return UP', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET /metrics - should return Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
