/**
 * @fileoverview Unit tests for Auth API
 * @module tests/auth
 * @version 1.0.0
 * @date 2025-08-11
 */

const request = require('supertest');
const app = require('../app');
const {
  validateEmailFormat,
  validatePasswordStrength,
} = require('../controllers/authController');

describe('authController validators', () => {
  /* **********************validateEmailFormat******************** */
  describe('validateEmailFormat', () => {
    test('returns true for valid emails', () => {
      const valid = [
        'good@example.com',
        'a@b.c',
        'first.last@sub.domain.io',
        'name+tag@domain.co',
        'NUM123@ex-ample.org',
      ];
      valid.forEach(e => {
        expect(validateEmailFormat(e)).toBe(true);
      });
    });

    test('returns false for invalid emails', () => {
      const invalid = [
        'no-at-sign.com',
        'bad@no-domain',   // No .com
        'bad@',            // No domain
        '@bad.com',        // No local domain name
        'a@b',             // No dot
        'space in@mail.com',
        'bad@@mail.com',
      ];
      invalid.forEach(e => {
        expect(validateEmailFormat(e)).toBe(false);
      });
    });
  });

  /* **********************validatePasswordStrength******************** */
  describe('validatePasswordStrength', () => {
    test('returns true for strong/allowed passwords', () => {
      const valid = [
        'Abcdef12',     // Basic: 8 digits, letters + numbers
        'Pass_1234',    // Has _
        'Name-1234',    // Has -
        'Name+1234',    // Has +
        'Name@1234',    // Has @
        'A2aaaaaa',     // 8 digits length
        'LONGpassword_2025', // Longer password
      ];
      valid.forEach(pw => {
        expect(validatePasswordStrength(pw)).toBe(true);
      });
    });

    test('returns false for too short / no letter / no number', () => {
      expect(validatePasswordStrength('short1')).toBe(false);     // Too short
      expect(validatePasswordStrength('allletters')).toBe(false); // No number
      expect(validatePasswordStrength('12345678')).toBe(false);   // No letter
    });

    test('returns false for disallowed characters or spaces', () => {
      const invalid = [
        'Bad!Chars1',   // Has !
        'With space1',  // Has space
        'Slash/123',    // Has /
        'Comma,123',    // Has ,
      ];
      invalid.forEach(pw => {
        expect(validatePasswordStrength(pw)).toBe(false);
      });
    });
  });
});

describe('Auth API', () => {
  test('POST /auth/register → 201 register (happy path)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password_123',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toBe('User registered');
  });

  test('POST /auth/register → 400 invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password_123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  test('POST /auth/register → 400 weak password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Password must be at least 8 characters/);
  });

  test('POST /auth/login → 200 login (happy path)', async () => {
    // prepare account
    await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password_123',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password_123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toBe('User logined');
  });

  test('POST /auth/login → 401 email not exists', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'notfound@example.com',
        password: 'Password_123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('User does not exist');
  });

  test('POST /auth/login → 401 wrong password', async () => {
    await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password_123',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPass1',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Incorrect password');
  });
});
