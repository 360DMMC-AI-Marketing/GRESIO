# 🧠 CIOS - Company Internal Operating System

Full-stack internal company dashboard connecting ClickUp, GitHub, Microsoft Teams, and Outlook.

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Recharts
- **Backend:** Node.js + Express + Socket.IO + MongoDB (Mongoose)
- **Auth:** JWT + Role-Based Access Control (Admin, PM, Developer, Intern)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
cd cios/backend && npm install
cd ../frontend && npm install
```

### 2. Environment

```bash
cp cios/backend/.env.example cios/backend/.env
# Edit .env with your MongoDB URI and API keys
```

### 3. Seed Database

```bash
cd cios/backend
node src/seed.js
```

### 4. Run

```bash
# Terminal 1 - Backend
cd cios/backend && npm run dev

# Terminal 2 - Frontend
cd cios/frontend && npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@cios.com | password123 | Admin |
| pm@cios.com | password123 | PM |
| dev@cios.com | password123 | Developer |
| intern@cios.com | password123 | Intern |

## Features

- **Smart Status Engine** - Auto-detects Active/Idle/In Meeting/Inactive/Offline
- **Activity Scoring** - Weighted score from all integrated tools
- **Real-time Updates** - WebSocket for live notifications
- **Dashboard** - Company health, activity feed, project status
- **Project Management** - Tasks, progress, deadlines, risk detection
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
cios/
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
