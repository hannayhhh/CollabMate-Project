/**
 * @fileoverview End-to-end "happy path" test: auth → team → task → gitlab → dashboard
 * @module tests/happy-e2e
 * @version 1.0.0
 * @date 2025-08-12
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
jest.mock('axios');

const app = require('../app');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');

const OAUTH_URL = process.env.GITLAB_OAUTH_URL;
const CLIENT_ID = process.env.GITLAB_CLIENT_ID;
const REDIRECT_URI = process.env.GITLAB_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost';

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const readTasks = () => JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));

const getUserByEmail = (email) => readUsers().find(u => u.email === email);

// Link Gitlab
const linkGitlabForUser = async (userId, { token = 'GL-ACCESS', gitlabUserId = 2024, username = 'gl-user' } = {}) => {
  axios.post.mockResolvedValueOnce({ data: { access_token: token } });           
  axios.get.mockResolvedValueOnce({ data: { id: gitlabUserId, username } });   
  const cb = await request(app).get(`/gitlab/callback?code=abc&state=${userId}`);
  expect(cb.status).toBe(302);
  expect(cb.headers.location).toBe(`${FRONTEND_URL}/gitlab?gitlab=success`);
};

describe('Happy Path E2E', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    // Clear all tasks
    const t = await request(app).post('/auth/register').send({
      username: 'boot',
      email: 'boot@example.com',
      password: 'Password_123',
    });
    const token = t.body.token;
    await request(app).delete('/task/all').set('Authorization', `Bearer ${token}`);
  });

  test('Common processes for simulating user operations: auth → team → task → gitlab → dashboard', async () => {
    // Register owner
    const regOwner = await request(app).post('/auth/register').send({
      username: 'owner',
      email: 'owner@example.com',
      password: 'Password_123',
    });
    expect(regOwner.status).toBe(201);
    // Login owner
    const loginOwner = await request(app).post('/auth/login').send({
      email: 'owner@example.com',
      password: 'Password_123',
    });
    expect(loginOwner.status).toBe(200);
    const token = loginOwner.body.token;
    expect(token).toBeTruthy();

    // Register new members
    await request(app).post('/auth/register').send({
      username: 'eva',
      email: 'eva@example.com',
      password: 'Password_123',
    });
    await request(app).post('/auth/register').send({
      username: 'joe',
      email: 'joe@example.com',
      password: 'Password_123',
    });

    const owner = getUserByEmail('owner@example.com');
    const eva   = getUserByEmail('eva@example.com');
    const joe   = getUserByEmail('joe@example.com');
    expect(owner && eva && joe).toBeTruthy();

    // Create a new team
    const createTeam = await request(app)
      .post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Dream', userId: owner.userId });
    expect(createTeam.status).toBe(201);
    const teamId = createTeam.body.team.teamId;

    // Add team members
    const addEva = await request(app)
      .patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: eva.userId });
    expect(addEva.status).toBe(200);

    const addJoe = await request(app)
      .patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: joe.userId });
    expect(addJoe.status).toBe(200);

    // Assign team role to member
    const setRoleEva = await request(app)
      .patch(`/team/${teamId}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: eva.userId, role: 'Front-end development' });
    expect(setRoleEva.status).toBe(200);

    // Delete a member
    const joeLeaves = await request(app)
      .post(`/team/${teamId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: joe.userId });
    expect(joeLeaves.status).toBe(200);

    // Verify that the deleted member is no longer on the team 
    const teamGet = await request(app)
      .get(`/team/${teamId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(teamGet.status).toBe(200);
    expect(Array.isArray(teamGet.body.members || [])).toBe(true);
    expect(teamGet.body.members).not.toContain(joe.userId);

    // Create Tasks 
    const createSelfTask = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Self Task',
        description: 'For the owner',
        deadline: '2025-12-31',
        status: 'To Do',
        userIds: [owner.userId],
        userId: owner.userId, // creator
      });
    expect(createSelfTask.status).toBe(201);
    const selfTaskId = createSelfTask.body.task.taskId;

    const createEvaTask = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Eva Task',
        description: 'For eva',
        deadline: '2025-12-31',
        status: 'To Do',
        userIds: [eva.userId],
        userId: owner.userId, // Created by owner
      });
    expect(createEvaTask.status).toBe(201);
    const evaTaskId = createEvaTask.body.task.taskId;

    // Change task status
    const selfToIP = await request(app)
      .patch(`/task/${selfTaskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newStatus: 'In Progress' });
    expect(selfToIP.status).toBe(200);

    const evaToDone = await request(app)
      .patch(`/task/${evaTaskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newStatus: 'Done' });
    expect(evaToDone.status).toBe(200);

    // Link gitlab
    const loginGl = await request(app).get('/gitlab/login').set('Authorization', `Bearer ${token}`);
    expect(loginGl.status).toBe(302);
    const location = loginGl.headers.location;
    expect(location.startsWith(`${OAUTH_URL}?`)).toBe(true);
    expect(location).toContain(`client_id=${encodeURIComponent(CLIENT_ID)}`);
    expect(decodeURIComponent(location)).toContain(`redirect_uri=${REDIRECT_URI}`);
    expect(location).toContain(`state=${owner.userId}`);

    await linkGitlabForUser(owner.userId, { token: 'X-TOKEN', gitlabUserId: 555 });

    // Fetch gitlab issues as tasks
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 9001, iid: 11, title: 'GL A', description: 'a', state: 'opened', due_date: null, assignees: [] },
        { id: 9002, iid: 12, title: 'GL B', description: 'b', state: 'closed', due_date: '2025-09-10', assignees: [] },
      ],
    });
    const importIssues = await request(app)
      .get('/gitlab/projects/123/issues/as-tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(importIssues.status).toBe(200);
    expect(String(importIssues.body.message || '')).toMatch(/converted/i);

    // The imported issues are also in the database
    const afterImport = readTasks();
    expect(afterImport.find(t => t.taskId === 'gitlab-9001')).toBeTruthy();
    expect(afterImport.find(t => t.taskId === 'gitlab-9002')).toBeTruthy();

    // Unlink gitlab
    const un = await request(app).delete('/gitlab/unlink').set('Authorization', `Bearer ${token}`);
    expect(un.status).toBe(200);
    const afterUnlink = await request(app).get('/gitlab/user').set('Authorization', `Bearer ${token}`);
    expect(afterUnlink.status).toBe(401);

    // Back to dashboard to see general information about the task
    const createTodo = await request(app)
      .post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Todo Task',
        description: 'for 0 percent',
        deadline: '2025-12-31',
        status: 'To Do',
        userIds: [owner.userId],
        userId: owner.userId,
      });
    expect(createTodo.status).toBe(201);
    const todoTaskId = createTodo.body.task.taskId;

    const rDone = await request(app)
      .get(`/dashboard/task-progress/${evaTaskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(rDone.status).toBe(200);
    expect(rDone.body).toMatchObject({ taskId: evaTaskId, progress_percent: 100 });

    const rIP = await request(app)
      .get(`/dashboard/task-progress/${selfTaskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(rIP.status).toBe(200);
    expect(rIP.body).toMatchObject({ taskId: selfTaskId, progress_percent: 50 });

    const rTodo = await request(app)
      .get(`/dashboard/task-progress/${todoTaskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(rTodo.status).toBe(200);
    expect(rTodo.body).toMatchObject({ taskId: todoTaskId, progress_percent: 0 });

    // Review the task list to confirm that the status distribution is as expected
    const list = await request(app).get('/task').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const titlesByStatus = list.body.tasks.reduce((acc, t) => {
      acc[t.status] = acc[t.status] || [];
      acc[t.status].push(t.title);
      return acc;
    }, {});
    expect((titlesByStatus['Done'] || [])).toContain('Eva Task');
    expect((titlesByStatus['In Progress'] || [])).toContain('Self Task');
    expect((titlesByStatus['To Do'] || [])).toContain('Todo Task');
  });
});
