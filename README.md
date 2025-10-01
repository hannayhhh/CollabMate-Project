# Project deployment and testing instructions

## Deployment

### 1. Clone Project

Execute in any directory:

```bash
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-25t2-9900-t11a-almond.git
cd capstone-project-25t2-9900-t11a-almond
```

### 2. Catalog structure (simplified)

```text
capstone-project-25t2-9900-t11a-almond/
├─ docker-compose.yml         # Docker container
├─ README.md
├─ TESTING_BACKEND.md         # Backend testing guide
├─ backend/
│  ├─ Dockerfile
│  ├─ .env.example            # Examples of backend environment variables
│  ├─ app.js
│  ├─ server.js
│  ├─ swaggerConfig.js        # swagger-jsdoc configuration
│  ├─ controllers/            # Controller interactions
│  ├─ routes/                 # Routes definition
│  ├─ models/                 # database - json file
│  ├─ middleware/             # JWT
│  ├─ tests/                  # Test
│  ├─ scripts/                # Document build script
│  └─ docs/
│     ├─ swagger.html         # Swagger UI, can be opened on offline
│     └─ swagger.json
└─ frontend/ 
   ├─ Dockerfile
   ├─ .env.example            # Examples of frontend environment variables
   ├─ public/                 # Static resource
   └─ src/
      ├─ components/          # Components
      ├─ pages/               # Pages
      ├─ NavBar/              # Navigation components
      ├─ App.jsx
      └─ main.jsx

```

### 3. Configure environment

The project is deployed using Docker, and both the frontend and backend need to prepare the '.env' file.

1. Create `.env` files in the `frontend/` and `backend/` directories respectively
2. Copy the content of `.env.example` in the corresponding directory to `.env`
3. **Pay special attention**：The following variables in the backend `.env.example` must be configured correctly:

   ```env
   JWT_SECRET=please_change_me_in_real_environment
   GITLAB_CLIENT_ID=please_change_me_in_real_environment
   GITLAB_CLIENT_SECRET=please_change_me_in_real_environment
   ```

   - Random strings of any length: letters + numbers + special symbols
   - `GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET`: From GitLab OAuth Application (see below for details)

### 4. Get GitLab OAuth application credentials

**Note**: If the GitLab OAuth configuration is incorrect, it will prevent GitLab authorization and task synchronization after the project starts.

If you are using a submission package, the available temporary credentials are already included in `backend/.env`, The expiration date is 5 days;
If you are pulling code from GitHub, please follow these steps to get it:

1. Log in to GitLab
2. Click on the upper right corner **Avatar** → **Edit profile** / **Settings** (some versions are Preferences)
3. Find **Applications** in the left menu and click to enter
4. **Add new application**:

   - **Name**：Any (e.g.`CollabMate`)
   - **Redirect URI**：Keep it exactly consistent with `GITLAB_REDIRECT_URI` in `backend/.env` (e.g. `http://localhost:5000/gitlab/callback`)
   - **check**
  
     ```text
     read_user
     read_api
     read_repository
     ```

   - **Confidential**：Yes
   - Click **Save application**
5. Generation parameters:

   - **Application ID** → fill in `GITLAB_CLIENT_ID`
   - **Secret** → fill in `GITLAB_CLIENT_SECRET`

### 5. Start the Docker environment

Make sure Docker Desktop is installed and launched locally, then execute the following command at the project root:

```bash
docker-compose up --build
```

When the command line outputs the following information, it means that the startup is successful:

```text
✅ Frontend running at http://localhost
✅ Backend running at http://localhost:5000
```

- Frontend entry：[http://localhost](http://localhost)
- Backend Swagger file：[http://localhost:5000](http://localhost:5000)

### 6. Swagger documentation offline access

This project provides a static version of the Swagger documentation that can be opened directly in the browser without the need to launch the backend.
Static files are located in `docs/swagger.html` and `docs/swagger.json`, and Click `swagger.html` to browse the API.

## Test

### Run backend tests

The backend of this project uses Jest + Supertest, which includes units, integrations, and an end-to-end (Happy Path) test.

Go to the backend directory and execute:

```bash
cd backend
npm ci --include=dev
npm test
```

Recent Coverage:

```less
All files | Stmts 98.19% | Branch 87.82% | Funcs 98.26% | Lines 98.63%
```

The representative end-to-end process (Happy Path) is automated: Sign up → Login → Bulk register members → Create a team → Join/remove members → Change members' roles → Create multiple tasks → Update task status → Connect to GitLab → Import Issues → Disconnect → Return to the Dashboard to view the summary.

See `TESTING_BACKEND.md` for more details.
