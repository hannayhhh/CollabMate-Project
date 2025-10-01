# Backend Testing Guide

## 1. Testing strategy

- **Unit**:
  - Controllers Layer: auth, task, team, user, search, gitlab
  - Store Layer: userStore, taskStore, teamStore
- **Integration**: Routing + Middleware + File Storage/DB Read and Write
- **End-to-End**: A complete happy path that covers the core user journey and synchronizes with GitLab

## 2. How to run

Execute the following command in the project root directory

```dash
cd backend
npm ci --include=dev
npm test
```

The coverage report is output to `backend/coverage/index.html`.

## 3. Environment and dependencies

- **No `.env` required**: Tests are automatically injected with secure default environment variables (see `backend/tests/env.setup.js`) before startup, and no online keys are used.
- **No external network**: GitLab-related calls have been **mocked**, and unit/integration tests do not access the Internet or real GitLab.
- **Write-free disk**: Using an in-memory file system (`memfs`), reset data before each test. It won't change your local files.
- **No Port Opened**: The test is directly introduced into the `app` instance **without the need to listen to the port**.
- **To make a real connection**: Please start the backend service and configure GitLab OAuth according to the README, and then use the browser to go through the authorization process. It is not recommended to connect directly to the Internet in unit tests.

## 4. Test suites with focused use cases

- `auth.test.js`: Normal or abnormal registration/login (illegal email address, weak password, wrong password, etc.)
- `user.test.js`: Information/status update; Modify email/password to trigger tokenVersion++; Cascading cleanup to remove users
- `team.test.js`: Create, add members (idempotent), role assignment, member exit/admin transfer, delete
- `task.test.js`: Create/Update/Assign/State Switch; filtering, grouping by status/member; Delete and cite cleanup
- `dashboard.test.js`：/dashboard/calendar、/dashboard/summary、/dashboard/task-progress/:id
- `search.test.js`: Task/User/Team search; Parameter verification and authentication
- `gitlab.test.js`: OAuth login/callback/unbinding; Project/Issue list; Single issue import as Task; Various types of 401/404/500
- `store.test.js`: store layer reads and writes and exceptions (missing files, bad JSON, non-arrays, etc.)

## 5. End-to-end Happy Path

Simulates the common flow of actions that users use the website:

1. Registered users → log in to get tokens
2. Register a number of more members (add them to the team)
3. Create a team, add members in batches, delete 1 member, change the role for a member (e.g., "front-end development")
4. Create multiple tasks, assign members to tasks, update status (To Do → In Progress → Done)
5. Connect to GitLab (mock or real) and import Issues as a task
6. Disconnect GitLab
7. Go back to the Dashboard to view the calendar and summary statistics

The above steps are completed by `tests/happy.e2e.test.js` at once.

## 6. Coverage

Last Results (Summary):

```text
All files | Stmts 98.19% | Branch 87.82% | Funcs 98.26% | Lines 98.63%
```

## 7. Data isolation and reproducibility

Each test file is cleaned up in the test data directory/memory state in beforeEach/afterEach

It does not rely on external uncontrollable states, ensuring consistent operation across multiple times
