const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

beforeAll(async () => {
  // Table already created by app.js — bas wait karo
  await new Promise(resolve => setTimeout(resolve, 1000));
});

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

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Alice');
    expect(response.body.email).toBe('alice@test.com');

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
      .send({ name: 'Bob' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 if email already exists', async () => {
    const user = { name: 'Alice', email: 'alice@test.com' };

    const response = await request(app)
      .post('/users')
      .send(user)
      .expect(409);

    expect(response.body.error).toBe('Email already exists');
  });
});