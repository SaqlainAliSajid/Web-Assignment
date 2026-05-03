const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

// Wait for DB to be ready
beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

// Cleanup after all tests
afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  await pool.end();
});

describe('POST /users', () => {
  it('should register a new user and store in DB', async () => {
    const newUser = { name: 'Alice', email: 'alice@test.com' };

    const response = await request(app)
      .post('/users')
      .send(newUser)
      .expect(201);

    // Verify response
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Alice');
    expect(response.body.email).toBe('alice@test.com');

    // Verify it's actually in the database
    const dbResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['alice@test.com']
    );
    expect(dbResult.rows.length).toBe(1);
    expect(dbResult.rows[0].name).toBe('Alice');
  });

  it('should return 400 if name or email is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ name: 'Bob' }) // missing email
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 if email already exists', async () => {
    const user = { name: 'Alice', email: 'alice@test.com' };

    await request(app).post('/users').send(user); // first insert

    const response = await request(app)
      .post('/users')
      .send(user) // duplicate
      .expect(409);

    expect(response.body.error).toBe('Email already exists');
  });
});