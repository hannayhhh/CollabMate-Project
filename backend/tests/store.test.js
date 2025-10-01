/**
 * @fileoverview Unit tests for Store modules
 * @module tests/store
 * @version 1.0.0
 * @date 2025-08-12
 */

const path = require('path');
const fs = require('fs');

const {
    loadUsers,
    saveUsers,
    findUserByEmail,
    findUserById,
    userExists,
    setUserStatus,
    getUserStatus,
    getAllUserStatuses,
} = require('../models/userStore');

const {
    loadTasks,
    saveTasks,
    findTaskById,
    upsertTasks,
} = require('../models/taskStore');

const {
    loadTeams,
    saveTeams,
    findTeamById,
} = require('../models/teamStore');

// Data file path
const USERS_FILE = path.join(__dirname, '../data/users.json');
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const TEAMS_FILE = path.join(__dirname, '../data/teams.json');

describe('Store modules are centrally tested', () => {
    beforeEach(() => {
        expect(JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))).toEqual([]);
        expect(JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))).toEqual([]);
        expect(JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'))).toEqual([]);
    });

    /* ********************** userStore ******************** */
    describe('userStore', () => {
        test('Read, Write, and Find by the User', () => {
            const u1 = { userId: 'u-1', username: 'alice', email: 'alice@example.com' };
            const u2 = { userId: 'u-2', username: 'bob', email: 'bob@example.com' };
            saveUsers([u1, u2]);

            const loaded = loadUsers();
            expect(loaded.map(u => u.userId).sort()).toEqual(['u-1', 'u-2']);

            const byEmail = findUserByEmail('alice@example.com');
            expect(byEmail && byEmail.userId).toBe('u-1');

            const byId = findUserById('u-2');
            expect(byId && byId.email).toBe('bob@example.com');

            expect(userExists('alice@example.com')).toBe(true);
            expect(userExists('none@example.com')).toBe(false);
        });

        test('Get and Set for user states', () => {
            const users = [
                { userId: 'u-1', email: 'a@x.com' },
                { userId: 'u-2', email: 'b@x.com', status: 'online' },
            ];
            saveUsers(users);

            // Default user status
            expect(getUserStatus('u-1')).toBe('offline');
            expect(getUserStatus('u-2')).toBe('online');

            // Update user status
            const ok = setUserStatus('u-1', 'busy');
            expect(ok).toBe(true);
            expect(getUserStatus('u-1')).toBe('busy');

            // No user
            const fail = setUserStatus('not-exist', 'online');
            expect(fail).toBe(false);

            // Get all users status
            const all = getAllUserStatuses();
            const asMap = Object.fromEntries(all.map(x => [x.userId, x.status]));
            expect(asMap['u-1']).toBe('busy');
            expect(asMap['u-2']).toBe('online');
        });
        test('loadUsers → [] when users.json is missing', () => {
            fs.unlinkSync(USERS_FILE);
            expect(loadUsers()).toEqual([]);
        });

        test('loadUsers throws SyntaxError when users.json is invalid JSON', () => {
            fs.writeFileSync(USERS_FILE, '{not-json}', 'utf8');
            expect(() => loadUsers()).toThrow(SyntaxError);
        });

        test('loadUsers returns raw object when JSON is not an array', () => {
            fs.writeFileSync(USERS_FILE, JSON.stringify({ foo: 1 }), 'utf8');
            const data = loadUsers();
            expect(Array.isArray(data)).toBe(false);
            expect(data).toEqual({ foo: 1 });
        });
    });

    /* ********************** taskStore ******************** */
    describe('taskStore', () => {
        test('Read, Write, and Find by the Task', () => {
            const t1 = { taskId: 't-1', title: 'A' };
            const t2 = { taskId: 't-2', title: 'B' };
            saveTasks([t1, t2]);

            const loaded = loadTasks();
            expect(loaded.map(t => t.taskId).sort()).toEqual(['t-1', 't-2']);

            const byId = findTaskById('t-2');
            expect(byId && byId.title).toBe('B');

            expect(findTaskById('not-exist')).toBeNull();
        });

        test('Repeatedly write the same task, and then write the previous data', () => {
            const baseCreatedAt = '2024-01-01T00:00:00.000Z';
            const initial = [
                {
                    taskId: 'gitlab-1',
                    title: 'Old',
                    description: 'old-desc',
                    createdAt: baseCreatedAt,
                    creator: 'u-creator',
                    other: 'x',
                },
            ];
            saveTasks(initial);

            upsertTasks([
                {
                    taskId: 'gitlab-1',
                    title: 'New Title',
                    description: 'new-desc',
                    createdAt: '2025-01-01T00:00:00.000Z',
                    creator: 'someone-else',
                    other: 'y',
                },
            ]);

            // Upsert: push a new task
            upsertTasks([
                { taskId: 'gitlab-2', title: 'Another', description: 'desc-2' },
            ]);

            const after = loadTasks();
            const a1 = after.find(t => t.taskId === 'gitlab-1');
            const a2 = after.find(t => t.taskId === 'gitlab-2');

            expect(a1.title).toBe('New Title');
            expect(a1.description).toBe('new-desc');
            expect(a1.other).toBe('y');

            // Remain createdAt and creator
            expect(a1.createdAt).toBe(baseCreatedAt);
            expect(a1.creator).toBe('u-creator');

            expect(a2 && a2.title).toBe('Another');
        });

        test('loadTasks → [] when tasks.json is missing', () => {
            fs.unlinkSync(TASKS_FILE);
            expect(loadTasks()).toEqual([]);
        });

        test('loadTasks throws SyntaxError when tasks.json is invalid JSON', () => {
            fs.writeFileSync(TASKS_FILE, '[[}', 'utf8');
            expect(() => loadTasks()).toThrow(SyntaxError);
        });

        test('loadTasks returns raw object when JSON is not an array', () => {
            fs.writeFileSync(TASKS_FILE, JSON.stringify({ nope: true }), 'utf8');
            const data = loadTasks();
            expect(Array.isArray(data)).toBe(false);
            expect(data).toEqual({ nope: true });
        });
    });

    /* ********************** teamStore ******************** */
    describe('teamStore', () => {
        test('Read, Write, and Find by the Team', () => {
            const g1 = { teamId: 'team-1', teamName: 'Alpha', members: ['u-1'] };
            const g2 = { teamId: 'team-2', teamName: 'Beta', members: ['u-2', 'u-3'] };
            saveTeams([g1, g2]);

            const loaded = loadTeams();
            expect(loaded.map(t => t.teamId).sort()).toEqual(['team-1', 'team-2']);

            const byId = findTeamById('team-2');
            expect(byId && byId.teamName).toBe('Beta');

            expect(findTeamById('nope')).toBeNull();
        });
        test('loadTeams → [] when teams.json is missing', () => {
            fs.unlinkSync(TEAMS_FILE);
            expect(loadTeams()).toEqual([]);
        });

        test('loadTeams throws SyntaxError when teams.json is invalid JSON', () => {
            fs.writeFileSync(TEAMS_FILE, 'oops', 'utf8');
            expect(() => loadTeams()).toThrow(SyntaxError);
        });

        test('loadTeams returns raw object when JSON is not an array', () => {
            fs.writeFileSync(TEAMS_FILE, JSON.stringify({ any: 'thing' }), 'utf8');
            const data = loadTeams();
            expect(Array.isArray(data)).toBe(false);
            expect(data).toEqual({ any: 'thing' });
        });
    });
});
