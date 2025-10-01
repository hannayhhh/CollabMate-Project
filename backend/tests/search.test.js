/**
 * @fileoverview Unit tests for Search API
 * @module tests/search
 * @version 1.0.0
 * @date 2025-08-12
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Register to get token
const getToken = async (overrides = {}) => {
  const reg = {
    username: 'tester',
    email: 'tester@example.com',
    password: 'Password_123',
    ...overrides,
  };
  const res = await request(app).post('/auth/register').send(reg);
  return res.body.token;
};

describe('Search API', () => {
  /* **********************Task Search******************** */
  test('GET /search?type=task&keyword=... → 200 search tasks', async () => {
    const token = await getToken();
    await getToken({ username: 'worker', email: 'worker@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker  = users.find(u => u.email === 'worker@example.com');

    // Create multiple tasks
    const createTask = (title, description, status) =>
      request(app).post('/task').set('Authorization', `Bearer ${token}`).send({
        title, description, deadline: '2025-08-20', status, userIds: [worker.userId], userId: creator.userId,
      });
    await createTask('S-Search-FixBug',  'Contains labrys-bug token', 'To Do');
    await createTask('S-Search-WriteDoc','No special token here',     'In Progress');

    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'task', keyword: 'labrys-bug' });

    expect(res.status).toBe(200);
    const titles = res.body.result.map(t => t.title);
    expect(titles).toContain('S-Search-FixBug');
  });

  /* **********************User Search******************** */
  test('GET /search?type=user&keyword=... → 200 search users', async () => {
    const token = await getToken({ username: 'alice', email: 'alice@example.com' });
    await getToken({ username: 'bob', email: 'bob@example.com' });

    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'user', keyword: 'bob' });

    expect(res.status).toBe(200);
    const names = res.body.result.map(u => u.username);
    expect(names).toContain('bob');
  });

  /* **********************Team Search******************** */
  test('GET /search?type=team&keyword=... → 200 search teams', async () => {
    const token = await getToken({ username: 'leader', email: 'leader@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const leader = users.find(u => u.email === 'leader@example.com');

    const team001 = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Alpha', userId: leader.userId });
    const team002 = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Beta', userId: leader.userId });

    expect(team001.status).toBe(201);
    expect(team002.status).toBe(201);

    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'team', keyword: 'beta' });

    expect(res.status).toBe(200);
    const teamNames = res.body.result.map(t => t.teamName);
    expect(teamNames).toContain('Beta');
  });

  /* **********************Failed to Search******************** */
  test('GET /search → 400 when missing parameters', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'task' }); // missing keyword
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required parameters/);
  });

  test('GET /search → 400 when invalid type', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'invalid', keyword: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid type/);
  });

  test('GET /search → 401 without token', async () => {
    const res = await request(app)
      .get('/search')
      .query({ type: 'task', keyword: 'any' });
    expect(res.status).toBe(401);
  });
});
