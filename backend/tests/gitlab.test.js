/**
 * @fileoverview Unit tests for GitLab API 
 * @module tests/gitlab
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
const FRONTEND_URL = process.env.FRONTEND_URL;

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

// Get user by email from memfs
const getUserByEmail = (email) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return users.find(user => user.email === email);
};

// Complete gitlab linking via callback route 
const linkGitlabForUser = async (userId, { token = 'gl_token', gitlabUserId = 777, username = 'gl-user' } = {}) => {
    axios.post.mockResolvedValueOnce({ data: { access_token: token } });
    axios.get.mockResolvedValueOnce({ data: { id: gitlabUserId, username } });
    const callback = await request(app).get(`/gitlab/callback?code=abc&state=${userId}`);
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe(`${FRONTEND_URL}/gitlab?gitlab=success`);
};

describe('GitLab API', () => {
    beforeEach(async () => {
        jest.resetAllMocks();
        const token = await getToken();
        await request(app).delete('/task/all').set('Authorization', `Bearer ${token}`);
    });

    /* **********************OAuth Login******************** */
    test('GET /gitlab/login → 302 redirect to GitLab OAuth', async () => {
        const token = await getToken({ username: 'gl1', email: 'gl1@example.com' });
        const user = getUserByEmail('gl1@example.com');

        const res = await request(app)
            .get('/gitlab/login')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(302);
        const location = res.headers.location;
        expect(location.startsWith(`${OAUTH_URL}?`)).toBe(true);
        expect(location).toContain(`client_id=${encodeURIComponent(CLIENT_ID)}`);
        expect(decodeURIComponent(location)).toContain(`redirect_uri=${REDIRECT_URI}`);
        expect(location).toContain(`state=${user.userId}`);
        expect(location).toMatch(/scope=read_user(\+|%20| )read_api(\+|%20| )read_repository/);
    });

    test('GET /gitlab/login → 401 without token', async () => {
        const res = await request(app).get('/gitlab/login');
        expect(res.status).toBe(401);
    });

    /* **********************OAuth Callback******************** */
    test('GET /gitlab/callback → 302 success; token stored', async () => {
        await getToken({ username: 'gl2', email: 'gl2@example.com' });
        const user = getUserByEmail('gl2@example.com');

        axios.post.mockResolvedValueOnce({ data: { access_token: 'tok123' } });
        axios.get.mockResolvedValueOnce({ data: { id: 999, username: 'gl2' } });

        const res = await request(app).get(`/gitlab/callback?code=abc&state=${user.userId}`);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${FRONTEND_URL}/gitlab?gitlab=success`);

        const after = getUserByEmail('gl2@example.com');
        expect(after.gitlabAccessToken).toBe('tok123');
        expect(after.gitlabUserId).toBe(999);
    });

    test('GET /gitlab/callback → 400 when missing code/state', async () => {
        const res = await request(app).get('/gitlab/callback');
        expect(res.status).toBe(400);
        expect(String(res.body.message || '')).toMatch(/missing code or state/i);
    });

    test('GET /gitlab/callback → 404 when user not found', async () => {
        axios.post.mockResolvedValueOnce({ data: { access_token: 'x' } });
        const res = await request(app).get('/gitlab/callback?code=abc&state=not-exist');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('User not found');
    });

    test('GET /gitlab/callback → 500 when token exchange fails', async () => {
        await getToken({ username: 'gl2x', email: 'gl2x@example.com' });
        const user = getUserByEmail('gl2x@example.com');

        axios.post.mockRejectedValueOnce(new Error('exchange down'));

        const res = await request(app).get(`/gitlab/callback?code=abc&state=${user.userId}`);
        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/oauth failed/i);
        expect(String(res.body.error || '')).toMatch(/exchange down/i);
    });

    test('GET /gitlab/callback → 500 when fetching user fails after token', async () => {
        await getToken({ username: 'gl2y', email: 'gl2y@example.com' });
        const user = getUserByEmail('gl2y@example.com');

        axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } });
        axios.get.mockRejectedValueOnce(new Error('user api fail'));

        const res = await request(app).get(`/gitlab/callback?code=abc&state=${user.userId}`);
        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/oauth failed/i);
        expect(String(res.body.error || '')).toMatch(/user api fail/i);
    });

    /* **********************Get A GitLab User Profile******************** */
    test('GET /gitlab/user → 200 returns gitlab user profile', async () => {
        const token = await getToken({ username: 'gl3', email: 'gl3@example.com' });
        const user = getUserByEmail('gl3@example.com');
        await linkGitlabForUser(user.userId, { token: 'T3', gitlabUserId: 333, username: 'gl3' });

        axios.get.mockResolvedValueOnce({ data: { id: 333, username: 'gl3' } });

        const res = await request(app).get('/gitlab/user')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 333, username: 'gl3' });
    });

    test('GET /gitlab/user → 401 when not linked', async () => {
        const token = await getToken({ username: 'nlink', email: 'nlink@example.com' });
        const res = await request(app).get('/gitlab/user')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    test('GET /gitlab/user → 500 when fetch gitLab user fails', async () => {
        const token = await getToken({ username: 'gl3e', email: 'gl3e@example.com' });
        const user = getUserByEmail('gl3e@example.com');
        await linkGitlabForUser(user.userId, { token: 'T3e', gitlabUserId: 3333, username: 'gl3e' });

        axios.get.mockRejectedValueOnce(new Error('gitlab user fail'));
        const res = await request(app).get('/gitlab/user')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/failed to fetch gitlab user info/i);
    });

    /* **********************Fetch Gitlab Projects******************** */
    test('GET /gitlab/projects → 200 returns list', async () => {
        const token = await getToken({ username: 'gl4', email: 'gl4@example.com' });
        const user = getUserByEmail('gl4@example.com');
        await linkGitlabForUser(user.userId, { token: 'T4', gitlabUserId: 444 });

        axios.get.mockResolvedValueOnce({ data: [{ id: 1, name: 'p1' }, { id: 2, name: 'p2' }] });

        const res = await request(app).get('/gitlab/projects')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.map(p => p.name).sort()).toEqual(['p1', 'p2']);
    });

    test('GET /gitlab/projects → 401 when not linked', async () => {
        const token = await getToken({ username: 'gl5', email: 'gl5@example.com' });
        const res = await request(app).get('/gitlab/projects')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    test('GET /gitlab/projects → 500 when GitLab projects API fails', async () => {
        const token = await getToken({ username: 'gl4e', email: 'gl4e@example.com' });
        const user = getUserByEmail('gl4e@example.com');
        await linkGitlabForUser(user.userId, { token: 'T4e', gitlabUserId: 4444 });

        axios.get.mockRejectedValueOnce(new Error('projects fail'));
        const res = await request(app).get('/gitlab/projects')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/failed to fetch projects/i);
    });

    /* **********************Unlink Gitlab******************** */
    test('DELETE /gitlab/unlink → 200 then /gitlab/user → 401', async () => {
        const token = await getToken({ username: 'gl6', email: 'gl6@example.com' });
        const user = getUserByEmail('gl6@example.com');
        await linkGitlabForUser(user.userId, { token: 'T6', gitlabUserId: 666 });

        const del = await request(app).delete('/gitlab/unlink')
            .set('Authorization', `Bearer ${token}`);
        expect(del.status).toBe(200);
        expect(String(del.body.message || '')).toMatch(/unlinked/i);

        const after = await request(app).get('/gitlab/user')
            .set('Authorization', `Bearer ${token}`);
        expect(after.status).toBe(401);
    });

    test('unlinkGitlab controller → 404 when user not found', () => {
        jest.resetModules();
        const ctrl = require('../controllers/gitlabController');
        const userStore = require('../models/userStore');

        const spy = jest.spyOn(userStore, 'findUserById').mockReturnValue(null);

        const req = { userId: 'no-such-user' };
        const res = {
            statusCode: 0,
            payload: null,
            status(code) { this.statusCode = code; return this; },
            json(obj) { this.payload = obj; return this; },
        };

        ctrl.unlinkGitlab(req, res);

        spy.mockRestore();

        expect(res.statusCode).toBe(404);
        expect(String(res.payload?.message || '')).toMatch(/user not found/i);
    });

    /* **********************Get Gitlab Project Name List******************** */
    test('GET /gitlab/projects/names → 401 when not linked', async () => {
        const token = await getToken({ username: 'glpn', email: 'glpn@example.com' });
        const res = await request(app).get('/gitlab/projects/names')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(String(res.body.error || res.body.message || '')).toMatch(/not linked|token/i);
    });

    test('GET /gitlab/projects/names → 200 success after OAuth linking', async () => {
        const token = await getToken({ username: 'glps', email: 'glps@example.com' });
        const me = getUserByEmail('glps@example.com');
        await linkGitlabForUser(me.userId, { token: 'X-ACCESS', gitlabUserId: 2024, username: 'glps' });

        axios.get.mockResolvedValueOnce({
            data: [{ id: 11, name: 'n1' }, { id: 22, name: 'n2' }],
        });

        const res = await request(app).get('/gitlab/projects/names')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ projects: [{ id: 11, name: 'n1' }, { id: 22, name: 'n2' }] });
    });

    test('GET /gitlab/projects/names → 500 when GitLab API fails after linking', async () => {
        const token = await getToken({ username: 'glpe', email: 'glpe@example.com' });
        const me = getUserByEmail('glpe@example.com');
        await linkGitlabForUser(me.userId, { token: 'X-ACCESS-ERR', gitlabUserId: 2025 });

        axios.get.mockRejectedValueOnce(new Error('names fail'));

        const res = await request(app).get('/gitlab/projects/names')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(500);
        expect(String(res.body.error || res.body.message || '')).toMatch(/failed|error/i);
    });


    /* **********************Fetch Gitlab Issues As tasks******************** */
    test('GET /gitlab/projects/:id/issues/as-tasks → 200 converts and upserts tasks', async () => {
        const token = await getToken({ username: 'gl8', email: 'gl8@example.com' });
        const user = getUserByEmail('gl8@example.com');
        await linkGitlabForUser(user.userId, { token: 'T8', gitlabUserId: 888 });

        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1001, iid: 11, title: 'I-A', description: 'd1', state: 'opened', due_date: '2025-08-20', assignees: [{ id: 888 }] },
                { id: 1002, iid: 12, title: 'I-B', description: 'd2', state: 'closed', due_date: null, assignees: [] },
            ],
        });

        const r1 = await request(app)
            .get('/gitlab/projects/123/issues/as-tasks')
            .set('Authorization', `Bearer ${token}`);

        expect(r1.status).toBe(200);
        expect(String(r1.body.message || '')).toMatch(/converted/i);
        const tIds = r1.body.tasks.map(t => t.taskId).sort();
        expect(tIds).toEqual(['gitlab-1001', 'gitlab-1002']);
        const t1 = r1.body.tasks.find(t => t.taskId === 'gitlab-1001');
        expect(t1.status).toBe('To Do');
        expect(Array.isArray(t1.userIds)).toBe(true);

        const fileTasks1 = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
        expect(fileTasks1.find(x => x.taskId === 'gitlab-1001')).toBeTruthy();
    });

    test('GET /gitlab/projects/:id/issues/as-tasks → maps single assignee object to userIds', async () => {
        const token = await getToken({ username: 'asA', email: 'asA@example.com' });
        const me = getUserByEmail('asA@example.com');
        await linkGitlabForUser(me.userId, { token: 'TOK-AS', gitlabUserId: 9001 });

        // Exist a user assigned to gitlab issue
        await getToken({ username: 'assignee1', email: 'assignee1@example.com' });
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const assigneeUser = users.find(user => user.email === 'assignee1@example.com');
        assigneeUser.gitlabUserId = 7000;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        // GitLab return a assignee rather than assignees array
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 2001, iid: 21, title: 'S-A', description: 'single', state: 'opened', assignee: { id: 7000 } },
            ],
        });

        const res = await request(app)
            .get('/gitlab/projects/321/issues/as-tasks')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const t = res.body.tasks.find(x => x.taskId === 'gitlab-2001');
        expect(t).toBeTruthy();
        expect(t.userIds).toContain(assigneeUser.userId);
    });

    test('GET /gitlab/projects/:id/issues/as-tasks → 401 when not linked', async () => {
        const token = await getToken({ username: 'gl8n', email: 'gl8n@example.com' });
        const res = await request(app)
            .get('/gitlab/projects/123/issues/as-tasks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    test('GET /gitlab/projects/:id/issues/as-tasks → 500 when GitLab API fails', async () => {
        const token = await getToken({ username: 'gl8e', email: 'gl8e@example.com' });
        const user = getUserByEmail('gl8e@example.com');
        await linkGitlabForUser(user.userId, { token: 'T8e', gitlabUserId: 881 });

        axios.get.mockRejectedValueOnce(new Error('issues fail'));
        const res = await request(app)
            .get('/gitlab/projects/123/issues/as-tasks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/failed to fetch gitlab issues/i);
    });

    /* **********************Get Gitlab Issues IDs ******************** */
    test('GET /gitlab/projects/:id/issues/ids → 200 simplified list', async () => {
        const token = await getToken({ username: 'gl9', email: 'gl9@example.com' });
        const user = getUserByEmail('gl9@example.com');
        await linkGitlabForUser(user.userId, { token: 'T9', gitlabUserId: 999 });

        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1, iid: 101, title: 'A', state: 'opened' },
                { id: 2, iid: 102, title: 'B', state: 'closed' },
            ],
        });

        const res = await request(app)
            .get('/gitlab/projects/55/issues/ids')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { issueId: 1, title: 'A', state: 'opened', issueIid: 101 },
            { issueId: 2, title: 'B', state: 'closed', issueIid: 102 },
        ]);
    });

    test('GET /gitlab/projects/:id/issues/ids → 401 when not linked', async () => {
        const token = await getToken({ username: 'gl9n', email: 'gl9n@example.com' });
        const res = await request(app)
            .get('/gitlab/projects/55/issues/ids')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    test('GET /gitlab/projects/:id/issues/ids → 500 when GitLab API fails', async () => {
        const token = await getToken({ username: 'gl9e', email: 'gl9e@example.com' });
        const user = getUserByEmail('gl9e@example.com');
        await linkGitlabForUser(user.userId, { token: 'T9e', gitlabUserId: 1999 });

        axios.get.mockRejectedValueOnce(new Error('ids fail'));
        const res = await request(app)
            .get('/gitlab/projects/55/issues/ids')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(500);
    });

    /* **********************Fetch A Gitlab Issue As Task******************** */
    test('GET /gitlab/projects/:id/issues/:iid → 201 import issue as task', async () => {
        const token = await getToken({ username: 'gl10', email: 'gl10@example.com' });
        const user = getUserByEmail('gl10@example.com');
        await linkGitlabForUser(user.userId, { token: 'T10', gitlabUserId: 1010 });

        axios.get.mockResolvedValueOnce({
            data: { id: 555, iid: 5, title: 'One', state: 'opened', description: 'x', assignees: [] },
        });

        const res = await request(app)
            .get('/gitlab/projects/77/issues/5')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Issue imported as task');
        expect(res.body.task).toMatchObject({
            taskId: 'gitlab-555',
            title: 'One',
            description: 'x',
            status: 'To Do',
            gitlabIssueId: 555,
            gitlabIssueIid: 5,
            gitlabProjectId: '77',
            creator: user.userId,
        });
    });

    test('GET /gitlab/projects/:id/issues/:iid → 201 import maps single assignee object', async () => {
        const token = await getToken({ username: 'oneA', email: 'oneA@example.com' });
        const me = getUserByEmail('oneA@example.com');
        await linkGitlabForUser(me.userId, { token: 'TOK-ONE', gitlabUserId: 9100 });

        await getToken({ username: 'assignee2', email: 'assignee2@example.com' });
        const users2 = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const assignee2 = users2.find(user => user.email === 'assignee2@example.com');
        assignee2.gitlabUserId = 7331;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users2, null, 2));

        axios.get.mockResolvedValueOnce({
            data: { id: 3003, iid: 33, title: 'ONE-A', state: 'opened', description: 'x', assignee: { id: 7331 } },
        });

        const res = await request(app)
            .get('/gitlab/projects/777/issues/33')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(201);
        expect(res.body.task).toMatchObject({ taskId: 'gitlab-3003', title: 'ONE-A' });
        expect(res.body.task.userIds).toContain(assignee2.userId); 
    });

    test('GET /gitlab/projects/:id/issues/:iid → 401 when not linked', async () => {
        const token = await getToken({ username: 'gl10n', email: 'gl10n@example.com' });
        const res = await request(app)
            .get('/gitlab/projects/77/issues/5')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    test('GET /gitlab/projects/:id/issues/:iid → 404 when issue not found (empty data)', async () => {
        const token = await getToken({ username: 'gl10x', email: 'gl10x@example.com' });
        const user = getUserByEmail('gl10x@example.com');
        await linkGitlabForUser(user.userId, { token: 'T10x', gitlabUserId: 1011 });

        axios.get.mockResolvedValueOnce({ data: null });
        const res = await request(app)
            .get('/gitlab/projects/77/issues/5')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    test('GET /gitlab/projects/:id/issues/:iid → 500 when GitLab API fails', async () => {
        const token = await getToken({ username: 'gl-err', email: 'gl-err@example.com' });
        const user = getUserByEmail('gl-err@example.com');
        await linkGitlabForUser(user.userId, { token: 'T-ERR', gitlabUserId: 20250 });

        axios.get.mockRejectedValueOnce(new Error('GitLab outage'));
        const res = await request(app)
            .get('/gitlab/projects/77/issues/5')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(500);
        expect(String(res.body.message || '')).toMatch(/Failed to import issue/i);
        expect(String(res.body.error || '')).toMatch(/GitLab outage/i);
    });
});
