import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const bookListDuration = new Trend('book_list_duration');
const bookCreateDuration = new Trend('book_create_duration');
const borrowDuration = new Trend('borrow_duration');

// Test configuration: 100 req/s for 2 minutes
export const options = {
  stages: [
    { duration: '15s', target: 50 },   // ramp-up
    { duration: '2m', target: 100 },    // sustained 100 VUs (~100 req/s)
    { duration: '15s', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // P95 < 500ms, P99 < 1s
    errors: ['rate<0.05'],                           // Error rate < 5%
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
let authToken = '';

// Setup: login as seeded admin and create a test book
export function setup() {
  // Login as admin (seeded by init-db.js)
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: 'admin@library.com',
      password: 'admin123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const body = JSON.parse(loginRes.body);
  const token = body.data?.token || '';

  // Create a book so we have a valid ID for lookups
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const bookRes = http.post(
    `${BASE_URL}/api/v1/books`,
    JSON.stringify({
      title: 'K6 Setup Book',
      author: 'K6 Author',
      isbn: `978${Date.now().toString().slice(-10)}`,
    }),
    { headers }
  );

  const bookBody = JSON.parse(bookRes.body);
  const bookId = bookBody.data?.id || null;

  return { token, bookId };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Scenario 1: Health check (public)
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health status UP': (r) => JSON.parse(r.body).status === 'UP',
    });
    errorRate.add(res.status !== 200);
  });

  // Scenario 2: List books (public, most frequent operation)
  group('List Books', () => {
    const res = http.get(`${BASE_URL}/api/v1/books`);
    bookListDuration.add(res.timings.duration);
    check(res, {
      'list books 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  // Scenario 3: List books with filters
  group('Search Books', () => {
    const res = http.get(`${BASE_URL}/api/v1/books?author=Test&page=1&size=10`);
    check(res, {
      'search books 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  // Scenario 4: Get a specific book
  group('Get Book by ID', () => {
    const bookId = data.bookId || '00000000-0000-0000-0000-000000000001';
    const res = http.get(`${BASE_URL}/api/v1/books/${bookId}`);
    check(res, {
      'get book returns 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  // Scenario 5: Create a book (authenticated as admin)
  group('Create Book', () => {
    const isbn = `978${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const res = http.post(
      `${BASE_URL}/api/v1/books`,
      JSON.stringify({
        title: `Load Test Book ${Date.now()}`,
        author: 'K6 Author',
        isbn: isbn,
      }),
      { headers }
    );
    bookCreateDuration.add(res.timings.duration);
    check(res, {
      'create book 201': (r) => r.status === 201,
    });
    errorRate.add(res.status !== 201);
  });

  // Scenario 6: Metrics endpoint
  group('Metrics', () => {
    const res = http.get(`${BASE_URL}/metrics`);
    check(res, {
      'metrics 200': (r) => r.status === 200,
      'metrics has content': (r) => r.body.length > 0,
    });
    errorRate.add(res.status !== 200);
  });

  sleep(0.5); // pace requests
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: '2 minutes + ramp-up/down',
    targetLoad: '100 VUs (~100 req/s)',
    results: {
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      rps: data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0,
      avgDuration:
        data.metrics.http_req_duration?.values?.avg?.toFixed(2) + 'ms',
      p50: data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) + 'ms',
      p95: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) + 'ms',
      p99: data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) + 'ms',
      maxDuration:
        data.metrics.http_req_duration?.values?.max?.toFixed(2) + 'ms',
      errorRate:
        (data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) + '%',
      httpReqFailed: data.metrics.http_req_failed?.values?.passes || 0,
    },
    thresholds: {
      p95Under500ms: data.metrics.http_req_duration?.thresholds?.['p(95)<500']
        ? 'PASS'
        : 'FAIL',
      p99Under1s: data.metrics.http_req_duration?.thresholds?.['p(99)<1000']
        ? 'PASS'
        : 'FAIL',
      errorRateUnder5pct: data.metrics.http_req_failed?.thresholds?.[
        'rate<0.05'
      ]
        ? 'PASS'
        : 'FAIL',
    },
  };

  return {
    'tests/performance/results.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data) {
  return `
=== PERFORMANCE TEST RESULTS ===
Target: 100 req/s for 2 minutes
Total Requests: ${data.metrics.http_reqs?.values?.count || 0}
RPS: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0}

Latency:
  avg: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2)}ms
  P50: ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2)}ms
  P95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2)}ms
  P99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2)}ms

Error Rate: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2)}%
================================
`;
}
