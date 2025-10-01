/**
 * @fileoverview Unit tests for User API 
 * @module tests/user
 * @version 1.1.0
 * @date 2025-08-12
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');

// Register for token
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

describe('User API', () => {
  /* **********************Get All Users******************** */
  test('GET /user/all → 200 list all users', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/user/all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const tester = users.find(u => u.email === 'tester@example.com');
    expect(res.body.some(u => u.userId === tester.userId)).toBe(true);
  });

  test('GET /user/all → 401 without token', async () => {
    const res = await request(app).get('/user/all');
    expect(res.status).toBe(401);
  });

  /* **********************Get A User******************** */
  test('GET /user/:userId/profile → 200 get user profile', async () => {
    const token = await getToken({ username: 'alice', email: 'alice@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const alice = users.find(u => u.email === 'alice@example.com');

    const res = await request(app)
      .get(`/user/${alice.userId}/profile`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(alice.userId);
    expect(res.body.profile.email).toBe('alice@example.com');
  });

  test('GET /user/:userId/profile → 404 when not found', async () => {
    const token = await getToken({ username: 'ghost', email: 'ghost@example.com' });
    const res = await request(app)
      .get('/user/not-exist/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('GET /user/:userId/profile → 401 without token', async () => {
    const token = await getToken({ username: 'noauth', email: 'noauth@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const u = users.find(x => x.email === 'noauth@example.com');
    const res = await request(app).get(`/user/${u.userId}/profile`);
    expect(res.status).toBe(401);
  });

  /* **********************Set And Get User Status******************** */
  test('PATCH /user/:userId/status & GET /user/:userId/status', async () => {
    const token = await getToken({ username: 'bob', email: 'bob@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const bob = users.find(u => u.email === 'bob@example.com');

    // Set user status
    const setOk = await request(app)
      .patch(`/user/${bob.userId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'online' });
    expect(setOk.status).toBe(200);
    expect(setOk.body).toMatchObject({ message: 'Status updated', userId: bob.userId, status: 'online' });

    // Get user status
    const getOk = await request(app)
      .get(`/user/${bob.userId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(getOk.status).toBe(200);
    expect(getOk.body).toMatchObject({ userId: bob.userId, status: 'online' });

    // Invalid status
    const bad = await request(app)
      .patch(`/user/${bob.userId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sleep' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('Invalid status');
  });

  test('PATCH /user/:userId/status → 404 when user not found', async () => {
    const token = await getToken({ username: 'stx', email: 'stx@example.com' });
    const res = await request(app)
      .patch('/user/not-exist/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'online' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('GET /user/:userId/status → 404 when user not found', async () => {
    const token = await getToken({ username: 'gstat', email: 'gstat@example.com' });
    const res = await request(app)
      .get('/user/not-exist/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('PATCH /user/:userId/status → 401 without token', async () => {
    const token = await getToken({ username: 'noauth2', email: 'noauth2@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const u = users.find(x => x.email === 'noauth2@example.com');
    const res = await request(app)
      .patch(`/user/${u.userId}/status`)
      .send({ status: 'busy' });
    expect(res.status).toBe(401);
  });

  /* **********************Get All User Statuses******************** */
  test('GET /user/status/all → 200 get all statuses', async () => {
    const token = await getToken({ username: 'cara', email: 'cara@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const cara = users.find(u => u.email === 'cara@example.com');

    await request(app)
      .patch(`/user/${cara.userId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'busy' });

    const res = await request(app)
      .get('/user/status/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    if (Array.isArray(res.body)) {
      const one = res.body.find(x => x.userId === cara.userId);
      expect(one && one.status).toBe('busy');
    } else if (res.body && typeof res.body === 'object') {
      expect(res.body[cara.userId]).toBe('busy');
    } else {
      throw new Error('Unknown format from GET /user/status/all');
    }
  });

  test('GET /user/status/all → 401 without token', async () => {
    const res = await request(app).get('/user/status/all');
    expect(res.status).toBe(401);
  });

  /* **********************Update User Profile******************** */
  test('PATCH /user/:userId/profile → 200 update profile', async () => {
    const token = await getToken({ username: 'dave', email: 'dave@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const dave = users.find(u => u.email === 'dave@example.com');

    const res = await request(app)
      .patch(`/user/${dave.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'dave_new', phone: '0400-000-111' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Profile updated');
    expect(res.body.profile.username).toBe('dave_new');
    expect(res.body.profile.phone).toBe('0400-000-111');
  });

  test('PATCH /user/:userId/profile → 200 update email (tokenVersion++)', async () => {
    const token = await getToken({ username: 'ella', email: 'ella@example.com' });
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const ella = users.find(u => u.email === 'ella@example.com');
    const beforeVersion = ella.tokenVersion || 0;

    const res = await request(app)
      .patch(`/user/${ella.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'ella2@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.profile.email).toBe('ella2@example.com');

    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const after = users.find(u => u.userId === ella.userId);
    expect(after.tokenVersion).toBe((beforeVersion || 0) + 1);
  });

  test('PATCH /user/:userId/profile → 200 update password (tokenVersion++))', async () => {
    const token = await getToken({ username: 'frank', email: 'frank@example.com' });
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const frank = users.find(u => u.email === 'frank@example.com');
    const beforeVersion = frank.tokenVersion || 0;
    const oldHash = frank.password;

    const res = await request(app)
      .patch(`/user/${frank.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'NewPass_456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Profile updated');

    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const updated = users.find(u => u.userId === frank.userId);
    expect(updated.tokenVersion).toBe((beforeVersion || 0) + 1);
    expect(updated.password).not.toBe(oldHash);
  });

  test('PATCH /user/:userId/profile → 200 when email unchanged (tokenVersion unchanged)', async () => {
    const token = await getToken({ username: 'ivy', email: 'ivy@example.com' });
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const ivy = users.find(u => u.email === 'ivy@example.com');
    const beforeVersion = ivy.tokenVersion || 0;

    const res = await request(app)
      .patch(`/user/${ivy.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'ivy@example.com' }); // same email

    expect(res.status).toBe(200);
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const after = users.find(u => u.userId === ivy.userId);
    expect(after.tokenVersion || 0).toBe(beforeVersion);
  });

  test('PATCH /user/:userId/profile → 200 when password unchanged (tokenVersion unchanged)', async () => {
    const token = await getToken({ username: 'samepwd', email: 'samepwd@example.com' });
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const me = users.find(u => u.email === 'samepwd@example.com');
    const beforeVersion = me.tokenVersion || 0;

    const res = await request(app)
      .patch(`/user/${me.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password_123' }); // same as register

    expect(res.status).toBe(200);
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const after = users.find(u => u.userId === me.userId);
    expect(after.tokenVersion || 0).toBe(beforeVersion);
  });

  test('PATCH /user/:userId/profile → 400 when no valid fields', async () => {
    const token = await getToken({ username: 'gina', email: 'gina@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const gina = users.find(u => u.email === 'gina@example.com');

    const res = await request(app)
      .patch(`/user/${gina.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notAField: 'xxx' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No valid profile fields to update');
  });

  test('PATCH /user/:userId/profile → 400 when only whitelisted fields but wrong types', async () => {
    const token = await getToken({ username: 'types', email: 'types@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const u = users.find(x => x.email === 'types@example.com');

    const res = await request(app)
      .patch(`/user/${u.userId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 12345, phone: null });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No valid profile fields to update');
  });

  test('PATCH /user/:userId/profile → 401 without token', async () => {
    const token = await getToken({ username: 'notoken', email: 'notoken@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const u = users.find(x => x.email === 'notoken@example.com');

    const res = await request(app)
      .patch(`/user/${u.userId}/profile`)
      .send({ username: 'nope' });

    expect(res.status).toBe(401);
  });

  /* **********************Delete User******************** */
  test('DELETE /user/:userId → 200 delete user', async () => {
    const token = await getToken({ username: 'hank', email: 'hank@example.com' });
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const hank = users.find(u => u.email === 'hank@example.com');

    const del = await request(app)
      .delete(`/user/${hank.userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(200);
    expect(del.body.message).toBe('User deleted');

    const res404 = await request(app)
      .get(`/user/${hank.userId}/profile`)
      .set('Authorization', `Bearer ${token}`);
    expect([401, 404]).toContain(res404.status);
    if (res404.status === 404) {
      expect(res404.body.error).toBe('User not found');
    }
  });

  test('DELETE /user/:userId → 404 when not found', async () => {
    const token = await getToken({ username: 'nouser', email: 'nouser@example.com' });
    const res = await request(app)
      .delete('/user/not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('DELETE /user/:userId → 200 cascades: removes user from tasks.userIds & teams.members', async () => {
    const token = await getToken({ username: 'cascade', email: 'cascade@example.com' });
    await getToken({ username: 'mate', email: 'mate@example.com' });

    // Find users
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const cascade = users.find(u => u.email === 'cascade@example.com');
    const mate    = users.find(u => u.email === 'mate@example.com');

    // Crate team and add users
    const mkTeam = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'CascadeTeam', userId: cascade.userId });
    const teamId = mkTeam.body.team.teamId;

    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: mate.userId });

    // Create tasks
    const mkTask = await request(app).post('/task')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'CascadeTask',
        description: '-',
        deadline: '2025-08-20',
        userIds: [cascade.userId, mate.userId],
        userId: cascade.userId,
      });
    expect(mkTask.status).toBe(201);

    // Delete cascade user
    const del = await request(app)
      .delete(`/user/${cascade.userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    // Delete cascade from tasks
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    const t = tasks.find(x => x.title === 'CascadeTask');
    expect(t.userIds).toEqual([mate.userId]);

    // Delete cascade from team
    const viewerToken = await getToken({ username: 'viewer', email: 'viewer@example.com' });
    const teamGet = await request(app)
      .get(`/team/${teamId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect([200]).toContain(teamGet.status);
    if (teamGet.status === 200) {
      expect(teamGet.body.members).not.toContain(cascade.userId);
    }
  });
});
