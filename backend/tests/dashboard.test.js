/**
 * @fileoverview Unit tests for Dashboard API
 * @module tests/dashboard
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

// Create Task using route
const createTask = (token, payload) =>
  request(app).post('/task').set('Authorization', `Bearer ${token}`).send(payload);

describe('Dashboard API', () => {
  let token;
  let creator;
  let worker;

  beforeEach(async () => {
    token = await getToken(); // creator
    await getToken({ username: 'worker', email: 'worker@example.com' }); // assignee

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    creator = users.find(u => u.email === 'tester@example.com');
    worker  = users.find(u => u.email === 'worker@example.com');

    // Clear tasks to ensure controllable test data
    await request(app).delete('/task/all').set('Authorization', `Bearer ${token}`);
  });

  /* **********************Calendar******************** */
  test('GET /dashboard/calendar → 200 empty when no tasks', async () => {
    const res = await request(app)
      .get('/dashboard/calendar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('GET /dashboard/calendar → 200 lists created tasks', async () => {
    // Create tasks with unique prefixes to avoid crosstalk
    await createTask(token, {
      title: 'DB-Cal-1',
      description: 'calendar item 1',
      deadline: '2025-08-20',
      status: 'To Do',
      userIds: [worker.userId],
      userId: creator.userId,
    });
    await createTask(token, {
      title: 'DB-Cal-2',
      description: 'calendar item 2',
      deadline: '2025-08-21',
      status: 'Done',
      userIds: [worker.userId],
      userId: creator.userId,
    });

    const res = await request(app)
      .get('/dashboard/calendar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rows = res.body.filter(data => /^DB-Cal-/.test(data.title));
    expect(rows.map(row => row.title).sort()).toEqual(['DB-Cal-1', 'DB-Cal-2']);
    rows.forEach(row => {
      expect(row).toHaveProperty('taskId');
      expect(row).toHaveProperty('title');
      expect(row).toHaveProperty('deadline');
      expect(row).toHaveProperty('status');
    });
  });

  test('GET /dashboard/calendar → 401 without token', async () => {
    const res = await request(app).get('/dashboard/calendar');
    expect(res.status).toBe(401);
  });

  /* **********************Summary******************** */
  test('GET /dashboard/summary → 200 totals & breakdown', async () => {
    // total=3, completed=1, remaining=2
    await createTask(token, {
      title: 'DB-Sum-A', description: '-', deadline: '2025-08-20',
      status: 'Done', userIds: [worker.userId], userId: creator.userId,
    });
    await createTask(token, {
      title: 'DB-Sum-B', description: '-', deadline: '2025-08-21',
      status: 'In Progress', userIds: [worker.userId], userId: creator.userId,
    });
    await createTask(token, {
      title: 'DB-Sum-C', description: '-', deadline: '2025-08-22',
      status: 'To Do', userIds: [worker.userId], userId: creator.userId,
    });

    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, completed: 1, remaining: 2 });
  });

  test('GET /dashboard/summary → 401 without token', async () => {
    const res = await request(app).get('/dashboard/summary');
    expect(res.status).toBe(401);
  });

  /* **********************Task Progress******************** */
  test('GET /dashboard/task-progress/:taskId → 200 progress per current logic', async () => {
    const createdDone = await createTask(token, {
      title: 'DB-Prog-Done', description: '-', deadline: '2025-08-20',
      status: 'Done', userIds: [worker.userId], userId: creator.userId,
    });
    const createdIP = await createTask(token, {
      title: 'DB-Prog-IP', description: '-', deadline: '2025-08-21',
      status: 'In Progress', userIds: [worker.userId], userId: creator.userId,
    });
    const createdTodo = await createTask(token, {
      title: 'DB-Prog-Todo', description: '-', deadline: '2025-08-22',
      status: 'To Do', userIds: [worker.userId], userId: creator.userId,
    });

    const idDone = createdDone.body.task.taskId;
    const idIP   = createdIP.body.task.taskId;
    const idTodo = createdTodo.body.task.taskId;

    const rDone = await request(app).get(`/dashboard/task-progress/${idDone}`)
      .set('Authorization', `Bearer ${token}`);
    const rIP = await request(app).get(`/dashboard/task-progress/${idIP}`)
      .set('Authorization', `Bearer ${token}`);
    const rTodo = await request(app).get(`/dashboard/task-progress/${idTodo}`)
      .set('Authorization', `Bearer ${token}`);

    expect(rDone.status).toBe(200);
    expect(rIP.status).toBe(200);
    expect(rTodo.status).toBe(200);

    expect(rDone.body).toMatchObject({ taskId: idDone, progress_percent: 100 });
    expect(rIP.body).toMatchObject({ taskId: idIP,   progress_percent: 50 });
    expect(rTodo.body).toMatchObject({ taskId: idTodo, progress_percent: 0 }); 
  });

  test('GET /dashboard/task-progress/:taskId → 404 when task not found', async () => {
    const res = await request(app)
      .get('/dashboard/task-progress/not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('GET /dashboard/task-progress/:taskId → 401 without token', async () => {
    const res = await request(app).get('/dashboard/task-progress/not-exist');
    expect(res.status).toBe(401);
  });
});
