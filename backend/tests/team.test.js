/**
 * @fileoverview Unit tests for Team API
 * @module tests/team
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

describe('Team API', () => {
  /* **********************Create Team******************** */
  test('POST /team → 201 create team', async () => {
    const token = await getToken({ username: 'alice', email: 'alice@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const alice = users.find(u => u.email === 'alice@example.com');

    const res = await request(app)
      .post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Alpha', userId: alice.userId });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Team created');
    expect(res.body.team).toMatchObject({
      teamName: 'Alpha',
      administrator: alice.userId,
      members: [alice.userId],
    });
  });

  test('POST /team → 400 when missing fields', async () => {
    const token = await getToken({ username: 'zeta', email: 'zeta@example.com' });
    const res = await request(app)
      .post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'NoUser' }); // missing userId
    expect(res.status).toBe(400);
  });

  /* **********************Get Team******************** */
  test('GET /team/:teamId → 200 get team and 404 when not found', async () => {
    const token = await getToken({ username: 'bob', email: 'bob@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const bob = users.find(u => u.email === 'bob@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Bravo', userId: bob.userId });

    const teamId = mk.body.team.teamId;

    const ok = await request(app).get(`/team/${teamId}`).set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.teamId).toBe(teamId);

    const nope = await request(app).get('/team/not-exist').set('Authorization', `Bearer ${token}`);
    expect(nope.status).toBe(404);
  });

  /* **********************Add Member******************** */
  test('PATCH /team/:teamId/member → 200 add member; idempotent when duplicate; 404 when user not exist', async () => {
    const token = await getToken({ username: 'carol', email: 'carol@example.com' });
    await getToken({ username: 'dave',  email: 'dave@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const carol = users.find(u => u.email === 'carol@example.com');
    const dave  = users.find(u => u.email === 'dave@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Charlie', userId: carol.userId });
    const teamId = mk.body.team.teamId;

    // Add once
    const add1 = await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: dave.userId });
    expect(add1.status).toBe(200);
    expect(add1.body.team.members).toContain(dave.userId);

    // Add the member again
    const add2 = await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: dave.userId });
    expect(add2.status).toBe(200);
    expect(add2.body.team.members.filter(x => x === dave.userId).length).toBe(1);

    // Add non-exist user
    const add404 = await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'not-exist' });
    expect([404]).toContain(add404.status);
  });

  /* **********************Assign Role******************** */
  test('PATCH /team/:teamId/role → 200 assign role; 404 when user not in team', async () => {
    const token = await getToken({ username: 'frank', email: 'frank@example.com' });
    await getToken({ username: 'grace', email: 'grace@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const frank = users.find(u => u.email === 'frank@example.com');
    const grace = users.find(u => u.email === 'grace@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Echo', userId: frank.userId });
    const teamId = mk.body.team.teamId;

    // Add the member before assigning role
    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: grace.userId });

    const ok = await request(app).patch(`/team/${teamId}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: grace.userId, role: 'leader' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ message: 'Role assigned', userId: grace.userId, role: 'leader' });

    // Assign role to user who are not in the team
    const bad = await request(app).patch(`/team/${teamId}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'not-exist', role: 'leader' });
    expect([404]).toContain(bad.status);
  });

  /* **********************Members Detailed******************** */
  test('GET /team/:teamId/members/detailed → 200 with tasks; 404 when team not found', async () => {
    const token = await getToken({ username: 'henry', email: 'henry@example.com' });
    await getToken({ username: 'iris',  email: 'iris@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const henry = users.find(u => u.email === 'henry@example.com');
    const iris  = users.find(u => u.email === 'iris@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Foxtrot', userId: henry.userId });
    const teamId = mk.body.team.teamId;

    // Add iris
    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: iris.userId });

    // Add multiple tasks
    const mkTask = (title, assignees) =>
      request(app).post('/task').set('Authorization', `Bearer ${token}`).send({
        title, description: '-', deadline: '2025-08-20', userIds: assignees, userId: henry.userId,
      });
    await mkTask('F-task-1', [henry.userId]);
    await mkTask('F-task-2', [iris.userId]);

    const ok = await request(app).get(`/team/${teamId}/members/detailed`)
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    const H = ok.body.find(m => m.userId === henry.userId);
    const I = ok.body.find(m => m.userId === iris.userId);
    expect(H.tasks.map(t => t.title)).toContain('F-task-1');
    expect(I.tasks.map(t => t.title)).toContain('F-task-2');

    const nope = await request(app).get('/team/not-exist/members/detailed')
      .set('Authorization', `Bearer ${token}`);
    expect([404]).toContain(nope.status);
  });

  /* **********************Leave Team******************** */
  test('POST /team/:teamId/leave → member leaves; admin leaves (delete or transfer)', async () => {
    const token = await getToken({ username: 'jack', email: 'jack@example.com' });
    await getToken({ username: 'kate', email: 'kate@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const jack = users.find(u => u.email === 'jack@example.com');
    const kate = users.find(u => u.email === 'kate@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Golf', userId: jack.userId });
    const teamId = mk.body.team.teamId;

    // Add kate
    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: kate.userId });

    // Remove Kate, no admin
    const leaveMember = await request(app).post(`/team/${teamId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: kate.userId });
    expect(leaveMember.status).toBe(200);

    // Remove admin
    const leaveAdmin = await request(app).post(`/team/${teamId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: jack.userId });
    expect([200]).toContain(leaveAdmin.status);
    expect(/Administrator left, team deleted|User left the team/.test(leaveAdmin.body.message)).toBe(true);
  });

  test('POST /team/:teamId/leave → 400 when user not in team', async () => {
    const token = await getToken({ username: 'leo', email: 'leo@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const leo = users.find(u => u.email === 'leo@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Hotel', userId: leo.userId });
    const teamId = mk.body.team.teamId;

    const res = await request(app).post(`/team/${teamId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'not-in-team' });
    expect([400]).toContain(res.status);
  });

    /* **********************Admin Transfer Rule******************** */
  test('POST /team/:teamId/leave → admin leaves; admin transfers to earliest remaining member', async () => {
    const token = await getToken({ username: 'anna', email: 'anna@example.com' });
    await getToken({ username: 'ben',   email: 'ben@example.com'   });
    await getToken({ username: 'chris', email: 'chris@example.com' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const anna  = users.find(u => u.email === 'anna@example.com');
    const ben   = users.find(u => u.email === 'ben@example.com');
    const chris = users.find(u => u.email === 'chris@example.com');

    // A Create team
    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'Jade', userId: anna.userId });
    const teamId = mk.body.team.teamId;

    // Add B firstly , then add B
    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: ben.userId });
    await request(app).patch(`/team/${teamId}/member`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: chris.userId });

    // A leave team
    const leaveA = await request(app).post(`/team/${teamId}/leave`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: anna.userId });

    expect(leaveA.status).toBe(200);
    expect(/User left the team|Administrator left, team deleted/.test(leaveA.body.message)).toBe(true);

    // B should became a administrator
    const getTeam = await request(app).get(`/team/${teamId}`).set('Authorization', `Bearer ${token}`);
    expect(getTeam.status).toBe(200);
    expect(getTeam.body.administrator).toBe(ben.userId);
    expect(getTeam.body.members).toEqual([ben.userId, chris.userId]);
  });

  /* **********************Delete Team******************** */
  test('DELETE /team/:teamId → 200 delete team; 404 when not found', async () => {
    const token = await getToken({ username: 'mike', email: 'mike@example.com' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const mike = users.find(u => u.email === 'mike@example.com');

    const mk = await request(app).post('/team')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamName: 'India', userId: mike.userId });
    const teamId = mk.body.team.teamId;

    const ok = await request(app).delete(`/team/${teamId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.message).toBe('Team deleted');

    const nope = await request(app).delete('/team/not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(nope.status).toBe(404);
  });
});
