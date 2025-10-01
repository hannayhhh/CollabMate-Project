/**
 * @fileoverview Unit tests for Task API
 * @module tests/task
 * @version 1.0.0
 * @date 2025-08-12
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const TEAMS_FILE = path.join(__dirname, '../data/teams.json');

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

describe('Task API', () => {
  /* **********************Create Task******************** */
  test('POST /task → 201 create task', async () => {
    const token = await getToken();
    // Create an assigned user
    await getToken({ username: 'worker', email: 'worker@example.com' });
    // Obtain users information
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker = users.find(u => u.email === 'worker@example.com');

    const res = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Write tests',
        description: 'Add jest/supertest cases',
        deadline: '2025-08-20',
        status: 'To Do',
        userIds: [worker.userId],
        userId: creator.userId,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Task created');
    expect(res.body.task).toMatchObject({
      title: 'Write tests',
      description: 'Add jest/supertest cases',
      deadline: '2025-08-20',
      status: 'To Do',
      userIds: [worker.userId],
      creator: creator.userId,
      gitlabIssueId: null,
    });
    expect(res.body.task).toHaveProperty('taskId');
    expect(res.body.task).toHaveProperty('createdAt');
    expect(res.body.task).toHaveProperty('updatedAt');
  });

  test('POST /task → 400 when missing required title', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // title missing
        description: 'no title',
        deadline: '2025-08-20',
        status: 'To Do',
        userIds: [],
        userId: 'any-user-id',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required title');
  });

  test('POST /task → 400 when missing userId', async () => {
    const token = await getToken();

    const res = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'No creator',
        description: 'userId is required',
        deadline: '2025-08-20',
        status: 'To Do',
        userIds: [],
        // userId missing
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing userId');
  });

  test('POST /task → 400 when userIds is not array', async () => {
    const token = await getToken();
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users[0];

    const res = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad userIds',
        description: 'userIds must be array',
        deadline: '2025-08-20',
        status: 'To Do',
        userIds: 'not-array',
        userId: creator.userId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("'userIds' must be an array");
  });

  /* **********************Update Task******************** */
  test('PUT /task/:taskId → 200 update task', async () => {
    const token = await getToken();
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users[0];

    // First create
    const created = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Original',
        description: 'desc',
        deadline: '2025-08-20',
        userIds: [],
        userId: creator.userId,
      });
    const id = created.body.task.taskId;

    // Then update
    const res = await request(app)
      .put(`/task/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task updated');
    expect(res.body.task.title).toBe('Updated Title');
  });

  test('PUT /task/:taskId → 404 when not found', async () => {
    const token = await getToken();

    const res = await request(app)
      .put('/task/not-exist')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'whatever' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  /* **********************Assign Task******************** */
  test('PATCH /task/:taskId/assign → 200 assign user', async () => {
    const token = await getToken();
    // Create worker1 user for assignment
    await getToken({ username: 'worker', email: 'worker@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker = users.find(u => u.email === 'worker@example.com');

    const created = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Assignee test',
        description: 'assign',
        deadline: '2025-08-20',
        userIds: [],
        userId: creator.userId,
      });
    const id = created.body.task.taskId;

    // First assignment
    const res1 = await request(app)
      .patch(`/task/${id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: worker.userId });

    expect(res1.status).toBe(200);
    expect(res1.body.task.userIds).toContain(worker.userId);

    // Second assignment (idempotent)
    const res2 = await request(app)
      .patch(`/task/${id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: worker.userId });

    expect(res2.status).toBe(200);
    expect(res2.body.task.userIds.filter(u => u === worker.userId).length).toBe(1);
  });

  test('PATCH /task/:taskId/assign → 404 when task not found', async () => {
    const token = await getToken();

    const res = await request(app)
      .patch('/task/not-exist/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'u1' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  /* **********************Change Task Status******************** */
  test('PATCH /task/:taskId/status → 200 change status', async () => {
    const token = await getToken();
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users[0];

    const created = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Change status',
        description: 'desc',
        deadline: '2025-08-20',
        userIds: [],
        userId: creator.userId,
      });
    const id = created.body.task.taskId;

    const res = await request(app)
      .patch(`/task/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newStatus: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task status updated');
    expect(res.body.task.status).toBe('In Progress');
  });

  test('PATCH /task/:taskId/status → 404 when task not found', async () => {
    const token = await getToken();

    const res = await request(app)
      .patch('/task/not-exist/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ newStatus: 'Done' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  /* **********************Get tasks based on filter criteria******************** */
  test('GET /task → 200 list tasks; supports status/userId filter', async () => {
    const token = await getToken();
    // Add more users
    await getToken({ username: 'worker1', email: 'worker1@example.com' });
    await getToken({ username: 'worker2', email: 'worker2@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker1 = users.find(u => u.email === 'worker1@example.com');
    const worker2 = users.find(u => u.email === 'worker2@example.com');

    // Create more tasks
    const createOne = (title, status, uids) =>
      request(app).post('/task').set('Authorization', `Bearer ${token}`).send({
        title, description: '-', deadline: '2025-08-20', status, userIds: uids, userId: creator.userId,
      });

    await createOne('A', 'To Do', [worker1.userId]);
    await createOne('B', 'In Progress', [worker1.userId, worker2.userId]);
    await createOne('C', 'Done', [worker2.userId]);

    // No filter
    const r0 = await request(app).get('/task').set('Authorization', `Bearer ${token}`);
    expect(r0.status).toBe(200);
    expect(r0.body.tasks.length).toBe(3);

    // By status
    const r1 = await request(app).get('/task').set('Authorization', `Bearer ${token}`).query({ status: 'Done' });
    expect(r1.status).toBe(200);
    expect(r1.body.tasks.map(t => t.title)).toEqual(['C']);

    // By userId
    const r2 = await request(app).get('/task').set('Authorization', `Bearer ${token}`).query({ userId: worker1.userId });
    expect(r2.status).toBe(200);
    expect(r2.body.tasks.map(t => t.title).sort()).toEqual(['A','B']);

    // By teamId 
    const mkTeam = await request(app).post('/team').set('Authorization', `Bearer ${token}`).send({ 
        teamName: 'Alpha', userId: worker2.userId 
    });
    const teamId = mkTeam.body.team.teamId;

    const r3 = await request(app).get('/task').set('Authorization', `Bearer ${token}`).query({ teamId });
    expect(r3.status).toBe(200);
    expect(r3.body.tasks.map(t => t.title)).toEqual(['B','C']); 
  });

  test('GET /task → 404 when filtering by non-existent teamId', async () => {
    const token = await getToken();

    const res = await request(app)
      .get('/task')
      .set('Authorization', `Bearer ${token}`)
      .query({ teamId: 'nope' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Team not found');
  });

  /* **********************Get similar tasks according to categories******************** */
  test('GET /task/grouped?by=status → 200 groups by status', async () => {
    const token = await getToken();
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users[0];

    const createTask = (title, status) =>
      request(app).post('/task').set('Authorization', `Bearer ${token}`).send({
        title, description: '-', deadline: '2025-08-20', status, userIds: [], userId: creator.userId,
      });

    await createTask('A', 'To Do');
    await createTask('B', 'Done');
    await createTask('C', 'In Progress');

    const res = await request(app)
      .get('/task/grouped')
      .set('Authorization', `Bearer ${token}`)
      .query({ by: 'status' });

    expect(res.status).toBe(200);
    expect(res.body.groups['To Do'].length).toBe(1);
    expect(res.body.groups['Done'].length).toBe(1);
    expect(res.body.groups['In Progress'].length).toBe(1);
  });

  test('GET /task/grouped?by=team → 200 groups by team', async () => {
    const token = await getToken();
    // Three users
    await getToken({ username: 'worker1', email: 'worker1@example.com' });
    await getToken({ username: 'worker2', email: 'worker2@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker1 = users.find(u => u.email === 'worker1@example.com');
    const worker2 = users.find(u => u.email === 'worker2@example.com');

    // Two teams
    const tA = await request(app).post('/team').set('Authorization', `Bearer ${token}`).send({ 
        teamName: 'team001', userId: worker1.userId 
    });
    const tB = await request(app).post('/team').set('Authorization', `Bearer ${token}`).send({ 
        teamName: 'team002', userId: worker2.userId 
    });
    const team001 = tA.body.team.teamId;
    const team002 = tB.body.team.teamId;

    const createTask = (title, uids) =>
      request(app).post('/task').set('Authorization', `Bearer ${token}`).send({
        title, description: '-', deadline: '2025-08-20', userIds: uids, userId: creator.userId,
      });

    await createTask('task001', [worker1.userId]);
    await createTask('task002', [worker2.userId]);
    await createTask('task003', [worker1.userId, worker2.userId]);

    const res = await request(app)
      .get('/task/grouped')
      .set('Authorization', `Bearer ${token}`)
      .query({ by: 'team' });

    expect(res.status).toBe(200);
    expect(res.body.groups[team001].map(t => t.title).sort()).toEqual(['task001','task003']);
    expect(res.body.groups[team002].map(t => t.title).sort()).toEqual(['task002','task003']);
  });

  test('GET /task/grouped?by=invalidgroup → 400 invalid grouping', async () => {
    const token = await getToken();

    const res = await request(app)
      .get('/task/grouped')
      .set('Authorization', `Bearer ${token}`)
      .query({ by: 'invalidgroup' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid grouping method/);
  });

  /* **********************Delete Task******************** */
  test('DELETE /task/:taskId → 200 delete and cascade user refs', async () => {
    const token = await getToken();
    await getToken({ username: 'worker', email: 'worker@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker = users.find(u => u.email === 'worker@example.com');

    // Pre-write the user's task reference
    let usersMut = users.map(u => ({ ...u }));
    usersMut = usersMut.map(u => {
      if (u.userId === worker.userId) {
        u.taskId = 'temp-tid';
        u.tasks = ['temp-tid'];
      }
      return u;
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersMut, null, 2));

    // Create a task replacing temp-tid
    const created = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'to be deleted',
        description: '-',
        deadline: '2025-08-20',
        userIds: [worker.userId],
        userId: creator.userId,
      });
    const tid = created.body.task.taskId;

    // Change user references to real tid
    const withRealRef = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).map(u => {
      if (u.userId === worker.userId) {
        u.taskId = tid;
        u.tasks = [tid];
      }
      return u;
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(withRealRef, null, 2));

    const res = await request(app)
      .delete(`/task/${tid}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted');

    // The task is deleted 
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    expect(tasks.find(t => t.taskId === tid)).toBeUndefined();

    // The assignee of the task is cleared
    const usersAfter = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const wAfter = usersAfter.find(u => u.userId === worker.userId);
    expect(wAfter.taskId).toBeNull();
    expect(wAfter.tasks).toEqual([]);
  });

  test('DELETE /task/:taskId → 404 when not found', async () => {
    const token = await getToken();

    const res = await request(app)
      .delete('/task/not-exist')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  /* **********************Delete All Tasks******************** */
  test('DELETE /task/all → 200 clear all tasks and user refs', async () => {
    const token = await getToken();
    await getToken({ username: 'worker', email: 'worker@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const creator = users.find(u => u.email === 'tester@example.com');
    const worker = users.find(u => u.email === 'worker@example.com');

    // Create more tasks
    const createTask = async (title) => {
      const r = await request(app).post('/task')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title, description: '-', deadline: '2025-08-20',
          userIds: [worker.userId], userId: creator.userId,
        });
      return r.body.task.taskId;
    };

    const t1 = await createTask('t1');
    const t2 = await createTask('t2');

    const withRefs = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).map(u => {
      if (u.userId === worker.userId) {
        u.taskId = t1;
        u.tasks = [t1, t2];
      }
      return u;
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(withRefs, null, 2));

    const res = await request(app)
      .delete('/task/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/All tasks deleted|No tasks to delete/);

    const tasksAfter = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    expect(tasksAfter).toEqual([]);

    const usersAfter = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const wAfter = usersAfter.find(u => u.email === 'worker@example.com');
    expect(wAfter.taskId).toBeNull();
    expect(wAfter.tasks).toEqual([]);
  });
});
