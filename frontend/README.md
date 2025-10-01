# React + Vite

# Frontend - CollabMate

A React-based team collaboration platform for managing tasks and team members.

## Features

- **User Authentication**
  - User registration with validation
  - Login with token-based authentication

- **Task Management**
  - Create new tasks with title, description, and deadline
  - Form validation for required fields
  - View tasks categorized by status(e.g. To Do, In progress, Done)
  - Update task status to reflect progress
  - Modify task information or delete the task

- **Team Management**
  - Create a team if the user does not belong to any team
  - Add members to the team
  - View team members and their details
  - Team data management
  - Search and filter team members based on keywords

- **Profile**
  - Edit name, role, and contact info  
  - Upload/change avatar  
  - Avatar updates reflect immediately in navbar, team status, and team page 

## Tech Stack

- **React** - Frontend framework
- **Material-UI (MUI)** - UI component library
- **React Router** - Navigation and routing
- **Vite** - Build tool and development server

## Project Structure

```
frontend/
├── src/
│   ├── assets/                # Static assets (logos, icons, images)
│   │   ├── gitlab.png
│   │   ├── icon1.png
│   │   ├── icon2.png
│   │   └── logo.png
│   ├── components/            # Reusable UI components
│   │   ├── CalendarView.jsx
│   │   ├── CreateTaskDialog.jsx
│   │   ├── EditTaskDialog.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskProgressChart.jsx
│   │   ├── TaskSummaryCard.jsx
│   │   └── TeamStatus.jsx
│   ├── NavBar/                # Sidebar / navigation components
│   │   └── DashboardNavBar.jsx
│   ├── pages/                 # Route-level page components
│   │   ├── Dashboard.jsx
│   │   ├── GitLab.jsx
│   │   ├── Login.jsx
│   │   ├── Profile.jsx
│   │   ├── Register.jsx
│   │   ├── Tasks.jsx
│   │   └── Team.jsx
│   ├── App.jsx                # Root app layout / router setup
│   └── main.jsx               # Entry point
├── public/                    # Public/static served assets
├── package.json              # Scripts and dependencies
```

## API Integration

The frontend communicates with the backend API using JWT authentication:

- **Login**: `POST /auth/login` - Returns JWT token
- **Register**: `POST /auth/register` - Creates new user account
- **Create Task**: `POST /task` - Creates new task (requires authentication)
- **Dashboard**: `GET /dashboard/summary`, `GET /dashboard/calendar` - Dashboard data
- **Teams**: `GET /team`, `POST /team` - Team management
- **Team Members**: `GET /team/:teamId/members` - Team member details

## Authentication Flow

1. User registers/logs in
2. JWT token is stored in localStorage
3. Token is included in Authorization header for protected routes
4. Token is automatically used for authenticated requests