# 🧠 GRESIO - Company Internal Operating System

Full-stack internal company dashboard connecting ClickUp, GitHub, Microsoft Teams, and Outlook.

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Recharts
- **Backend:** Node.js + Express + Socket.IO + MongoDB (Mongoose)
- **Auth:** JWT + Role-Based Access Control (Admin, Project Manager, Team Lead, Manager, QA Tester, Developer, Intern)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
cd gresio/backend && npm install
cd ../frontend && npm install
```

### 2. Environment

```bash
cp gresio/backend/.env.example gresio/backend/.env
# Edit .env with your MongoDB URI and API keys
```

### 3. Seed Database

```bash
cd gresio/backend
node src/seed.js
```

### 4. Run

```bash
# Terminal 1 - Backend
cd gresio/backend && npm run dev

# Terminal 2 - Frontend
cd gresio/frontend && npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000

### 🌐 Live Demo

| URL | Description |
|-----|-------------|
| https://gresio.vercel.app | Frontend (Vercel) |
| https://gresio-api-lqmf.onrender.com | Backend API (Render) |

> ⚠️ Backend may need a manual deploy on Render before seed works.  
> After deploy, visit `GET /api/seed` to populate demo data.

### Demo Accounts (Seeded Users)

| Name | Email | Password | Role |
|------|-------|----------|------|
| Sarah Chen | admin@gresio.com | password123 | Admin |
| James Wilson | pm@gresio.com | password123 | Project Manager |
| Marcus Johnson | dev@gresio.com | password123 | Developer |
| Aisha Patel | qa@gresio.com | password123 | QA Tester |
| Ryan Kim | intern@gresio.com | password123 | Intern |
| Emily Rodriguez | manager@gresio.com | password123 | Manager |
| Olivia Tanaka | designer@gresio.com | password123 | Designer (Developer) |
| David Mohammed | analyst@gresio.com | password123 | Analyst (Manager) |
| Lisa Thompson | scrum@gresio.com | password123 | Team Lead |
| Alex Rivera | test@demo.com | password123 | Test Admin |
| Demo User | demo@demo.com | demo1234 | Demo Admin |

## Features

- **Smart Status Engine** - Auto-detects Active/Idle/In Meeting/Inactive/Offline
- **Activity Scoring** - Weighted score from all integrated tools
- **Real-time Updates** - WebSocket for live notifications
- **Dashboard** - Company health, activity feed, project status
- **Project Management** - Tasks, sprints, progress, deadlines, risk detection
- **Test Case Management** - QA test cases with manual/e2e/integration types
- **Report Generation** - Admin (full KPIs) & Client (summary) PDF reports
- **GitHub Module** - Commits, PRs, issues tracking
- **Teams Module** - Messages, meetings, attendance
- **Outlook Module** - Emails, calendar, workload view
- **Analytics** - Productivity trends, predictions, workload balance
- **Admin Panel** - User/project management, integration config

## Integrations

Set API keys in `.env`:

- `GITHUB_TOKEN` - GitHub personal access token
- `CLICKUP_API_KEY` - ClickUp API key
- `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID` - Microsoft Graph API

## Architecture

```
gresio/
├── backend/
│   └── src/
│       ├── config/        # DB & env config
│       ├── models/        # Mongoose schemas
│       ├── controllers/   # Route handlers
│       ├── routes/        # Express routes
│       ├── middleware/     # Auth & error handling
│       ├── services/      # Business logic & integrations
│       └── socket/        # WebSocket handlers
├── frontend/
│   └── src/
│       ├── components/    # Shared UI (Sidebar, Topbar, etc.)
│       ├── pages/         # Route pages
│       ├── context/       # Auth context
│       ├── hooks/         # Custom hooks (useSocket)
│       └── services/      # API client
└── README.md
```
