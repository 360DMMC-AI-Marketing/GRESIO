# GRESIO — Company Internal Operating System

Full-stack internal platform connecting project management, sprints, tasks, QA testing, team analytics, and external integrations — all in one place. Built for teams that need structure, visibility, and automation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TailwindCSS 3 + Recharts + Lucide Icons + PWA (Workbox) |
| **Backend** | Node.js + Express 4 + Socket.IO 4 + MongoDB (Mongoose 8) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + Role-Based Access Control (10 roles) |
| **Real-time** | Socket.IO with sticky sessions (cluster support via `@socket.io/sticky` + `@socket.io/cluster-adapter`) |
| **Email** | Azure Communication Service (ACS) via `@azure/communication-email` |
| **2FA** | speakeasy + QRCode (TOTP-based authenticator apps) |
| **Charts** | Recharts + html2canvas + jsPDF (report generation) |
| **Integrations** | Microsoft Graph API, GitHub REST API, ClickUp API, Microsoft Teams |

---

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- MongoDB 6+ (local instance or MongoDB Atlas)
- npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd gresio/backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values. See [Environment Variables](#environment-variables) section below for all options.

### 3. Seed Database

```bash
cd backend
node src/seed.js
```

This creates demo companies, projects, users, tasks, sprints, and test data.

### 4. Run in Development

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Socket.IO:** ws://localhost:5000

---

## Demo Accounts (Seeded)

| Name | Email | Password | Role |
|------|-------|----------|------|
| Super Admin | superadmin@gresio.com | superadmin123 | Super Admin |
| Sarah Chen | admin@gresio.com | password123 | Admin |
| James Wilson | pm@gresio.com | password123 | Project Manager |
| Lisa Thompson | scrum@gresio.com | password123 | Team Lead |
| Emily Rodriguez | manager@gresio.com | password123 | Manager |
| Marcus Johnson | dev@gresio.com | password123 | Developer |
| Aisha Patel | qa@gresio.com | password123 | QA Tester |
| Olivia Tanaka | designer@gresio.com | password123 | Designer |
| David Mohammed | analyst@gresio.com | password123 | Analyst |
| Ryan Kim | intern@gresio.com | password123 | Intern |
| Alex Rivera | test@demo.com | password123 | Test Admin |

All seeded login accounts use `mustChangePassword: false`. New users created via invite or Azure AD import will have `mustChangePassword: true`, forcing them to set a new password on first login.

---

## Production Deployment

### Frontend Build

```bash
cd frontend
npm run build    # outputs to frontend/dist/
```

The build produces a PWA-ready bundle with service worker (Workbox), icon assets, and web manifest.

### Backend Production

```bash
cd backend
NODE_ENV=production npm start
```

Or with cluster mode (multi-core):

```bash
NODE_ENV=production CLUSTER_MODE=true npm start
```

Cluster mode uses `@socket.io/sticky` + `@socket.io/cluster-adapter` for WebSocket affinity across workers.

### Security Headers (Helmet)

Enabled automatically in production mode (`NODE_ENV=production`). Includes:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Referrer-Policy
- Permissions-Policy

### Graceful Shutdown

The server handles `SIGTERM` and `SIGINT` signals, closing all connections and Socket.IO cleanly before exiting. In cluster mode, the primary process forwards the signal to all workers.

### Static File Serving

In production, the backend serves `frontend/dist/` as a static directory, so only the backend needs to be deployed. All frontend routes fall back to `index.html` for SPA navigation.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Backend server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin for frontend |
| `CLUSTER_MODE` | No | `false` | Enable multi-core cluster mode |
| `CORS_ORIGIN` | No | `*` | Additional CORS origins (comma-separated) |

### Email (Azure Communication Service)

| Variable | Required | Description |
|----------|----------|-------------|
| `ACS_CONNECTION_STRING` | Yes* | Azure ACS connection string |
| `GRAPH_SENDER_EMAIL` | Yes* | Verified sender email in ACS |
| `ACS_ENDPOINT` | No | ACS endpoint URL (alternative to connection string) |

*\*Required for email features (invites, password reset, notifications). If not set, email calls return false gracefully.*

### Integrations

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token (classic or fine-grained) |
| `CLICKUP_API_KEY` | ClickUp API key |
| `MICROSOFT_CLIENT_ID` | Microsoft Graph API client ID (Azure app registration) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Graph API client secret |
| `MICROSOFT_TENANT_ID` | Microsoft 365 tenant ID |

---

## Key Features

### Project Management

| Feature | Details |
|---------|---------|
| **5 Project Types** | Software, Design, Business, Content, Research — each with adapted lifecycle phases |
| **7-Phase Lifecycle** | Discovery → Planning → Development → Testing → Review → Launch → Delivered |
| **Auto Status Flow** | Projects auto-advance when conditions are met (tasks complete, tests passed, etc.) |
| **Manual Gates** | Launch, Delivered, and Report steps require explicit approval by Admin/PM/Team Lead |
| **Progress Tracking** | Visual phase bar with completion %, risk levels, and overdue detection |
| **Sub-projects** | Nested child projects with isolation (team only sees their sub-projects) |
| **Project Relay Chains** | Link projects into ordered pipelines A→B→C with auto-notify on delivery |
| **Project Health** | Color-coded cards (green/yellow/red) on Dashboard and detail view |

### Sprints & Tasks

| Feature | Details |
|---------|---------|
| **Sprint Planning** | Time-boxed iterations with goals, start/end dates, burndown charts |
| **Kanban Board** | To Do / In Progress / Done with drag-and-drop (react-beautiful-dnd) |
| **Task Management** | Priorities (Low/Medium/High/Critical), deadlines, subtasks, attachments, assignments |
| **My Tasks** | Personalized view of all assigned tasks across projects |
| **Team Calendar** | Month view with color-coded tasks, sprints, deadlines, milestones, events, reminders |

### Testing & QA

| Feature | Details |
|---------|---------|
| **Test Case Management** | Full CRUD with status flow: Draft → Ready → In Progress → Passed/Failed/Blocked/Skipped |
| **Auto-Create Bug** | Failed tests automatically create Bug tasks linked to the feature |
| **Auto-Generate from Sprints** | Generate test cases from completed sprint tasks |
| **Interest-Based Generation** | Configure topics and GRESIO auto-generates relevant test cases |
| **Test Suite Dashboard** | Pass/fail rates, coverage, recent test activity |

### Work DNA & Analytics

| Feature | Details |
|---------|---------|
| **Work DNA** | Individual productivity profile: activity score, focus hours, task completion rate, collaboration patterns |
| **Company Dashboard** | Health score, active/blocked/completed projects, team online status |
| **Velocity Tracking** | Sprint-over-sprint velocity metrics with trend charts |
| **Workload Analysis** | Low / Medium / High / Critical workload per user with capacity indicators |
| **Admin Reports** | Full KPIs: tasks, sprints, testing, team performance, effort hours, exportable to PDF |
| **Client Reports** | Clean stakeholder summaries with branding "Generated by GRESIO · Certified by 360 DMMC" |

### Team Management

| Feature | Details |
|---------|---------|
| **10 Roles** | Super Admin, Admin, Team Lead, Project Manager, Manager, QA Tester, Developer, Designer, Analyst, Intern — with 27+ granular permissions |
| **Auto Team Groups** | Development, QA, Design, PM, Business, Admin, Interns — color-coded |
| **Smart Invite** | Invite by email with role and group assignment; invited users get `mustChangePassword: true` |
| **Work Logs** | Track hours against tasks and sprints with department-level breakdowns |
| **Azure AD Import** | One-click bulk import users from Azure Active Directory with welcome emails |

### Notifications

| Feature | Details |
|---------|---------|
| **Real-Time** | WebSocket delivery for task assignments, phase changes, sprint events |
| **3-Tab Layout** | Projects / Tasks & Tests / Other with read/unread/delete |
| **Review Call Reminders** | Schedule review calls with automated meeting reminders |
| **Stale Detection** | Deleted review calls retroactively mark notifications as stale (strikethrough) |

### Integrations

| Service | Capabilities |
|---------|-------------|
| **Microsoft 365 / Azure AD** | One-click user import with welcome emails, organizational structure sync |
| **GitHub** | Commits, PRs, issues tracking with activity scoring per user |
| **Microsoft Teams** | Auto-create channels, sync messages, meeting attendance tracking |
| **Outlook Sync** | Email and calendar sync; events appear in GRESIO Calendar |
| **ClickUp Import** | Import tasks from ClickUp workspaces |
| **Lovable / Figma** | Username linking for cross-platform identity |

### Wiki

| Feature | Details |
|---------|---------|
| **Company Wiki** | Markdown-based documentation with rich text editor |
| **Public Reports** | Shareable report pages with client-facing branding |
| **Template Marketplace** | Pre-built project templates for common workflows |

### Security & Enterprise

| Feature | Details |
|---------|---------|
| **JWT Authentication** | Token-based auth with 10-role access control |
| **Two-Factor Auth** | TOTP via authenticator app (Google Authenticator, Authy, etc.) with backup codes |
| **Forced Password Change** | `mustChangePassword` flag on User model — triggers forced password reset on first login after invite or password reset |
| **On-Premise Deployment** | Full data control on your infrastructure |
| **Production Hardening** | Helmet security headers, CORS, compression, graceful shutdown |
| **Rate Limiting** | Built-in request throttling |
| **Password Hashing** | bcryptjs with 12 salt rounds |

---

## Project Permissions (10 Roles)

| Permission | Super Admin | Admin | PM | Team Lead | Manager | QA | Dev | Designer | Analyst | Intern |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage companies | ✅ | — | — | — | — | — | — | — | — | — |
| Manage all projects | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Create projects | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| Edit own projects | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Delete projects | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| Manage all tasks | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Create/edit tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage sprints | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Manage test cases | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invite users | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Generate reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |

---

## Super Admin Panel

Super admins have a dedicated interface at `/super/*` for managing all companies:

| Route | Page |
|-------|------|
| `/super/dashboard` | Cross-company metrics: active companies, admins, total projects, MRR |
| `/super/companies` | View/edit all registered companies, plans (Starter/Team/Enterprise), usage stats |
| `/super/admins` | Manage company-level admins across all tenants |
| `/super/analytics` | Growth charts (6-month), plan distribution, revenue tracking |
| `/super/health` | Service status monitoring (MongoDB, Redis, GitHub API, Teams, Outlook, etc.) |
| `/super/settings` | Global platform settings |

---

## Public Site Routes

| Route | Page |
|-------|------|
| `/` | Landing page with hero, features showcase, testimonials |
| `/features` | All 180+ features organized by category (6 categories) |
| `/how-it-works` | 8-phase lifecycle explained with project type cards |
| `/pricing` | Starter (free), Team ($29/mo), Enterprise ($99/mo) |
| `/contact` | Contact form and support information |
| `/faq` | Frequently asked questions with search |
| `/about` | Company information and team |
| `/blog` | Articles and product updates |
| `/guides` | Tutorials and documentation library |
| `/privacy` | Privacy policy |
| `/careers` | Job openings (if any) |

---

## Project Types & Lifecycles

Each project type has a tailored phase progression:

### Software
1. Discovery & Requirements → 2. Architecture & Planning → 3. Development (Frontend + Backend) → 4. Testing (Unit + Integration) → 5. Code Review → 6. Launch → 7. Delivered

### Design
1. Discovery & Research → 2. Concept & Ideation → 3. Wireframing → 4. Prototyping → 5. Visual Design → 6. Design Handoff → 7. Delivered

### Business
1. Discovery & Research → 2. Strategy & Planning → 3. Execution → 4. Monitoring → 5. Review & Optimization → 6. Launch → 7. Delivered

### Content
1. Discovery & Research → 2. Content Strategy → 3. Content Creation → 4. Review & Editing → 5. Approval → 6. Publication → 7. Delivered

### Research
1. Literature Review → 2. Methodology → 3. Data Collection → 4. Analysis → 5. Findings → 6. Publication → 7. Delivered

---

## Architecture

```
gresio/
├── backend/
│   └── src/
│       ├── config/           # Database connection, environment config
│       │   ├── env.js        # Environment variable loader & validation
│       │   └── db.js         # MongoDB/Mongoose connection
│       ├── models/           # Mongoose schemas
│       │   ├── User.js       # User with roles, 2FA, mustChangePassword
│       │   ├── Project.js    # Projects with phases, relay chains
│       │   ├── Task.js       # Tasks with subtasks, priorities
│       │   ├── Sprint.js     # Sprints with dates, velocity
│       │   ├── Company.js    # Multi-tenant company records
│       │   ├── TestCase.js   # QA test cases
│       │   ├── Notification.js # Real-time notification records
│       │   ├── Activity.js   # User activity logging
│       │   ├── ReviewCall.js # Scheduled review meetings
│       │   ├── WorkLog.js    # Time tracking entries
│       │   ├── Report.js     # Report templates & instances
│       │   └── Wiki.js       # Wiki pages
│       ├── controllers/      # Route handlers (auth, projects, tasks, etc.)
│       ├── routes/           # Express route definitions
│       │   ├── auth.js       # /api/auth/*
│       │   ├── users.js      # /api/users/*
│       │   ├── projects.js   # /api/projects/*
│       │   ├── tasks.js      # /api/tasks/*
│       │   ├── sprints.js    # /api/sprints/*
│       │   ├── notifications.js # /api/notifications/*
│       │   └── ...           # companies, teams, testCases, reports, etc.
│       ├── middleware/        # Auth guard, role check, error handler
│       ├── services/         # Business logic & integrations
│       │   ├── emailService.js       # Azure ACS email sender
│       │   ├── phaseEngine.js        # Project phase auto-advancement
│       │   ├── notificationService.js # Notification dispatch (WS + DB)
│       │   ├── githubService.js      # GitHub API client
│       │   └── microsoftGraph.js     # Microsoft Graph API client
│       ├── socket/           # Socket.IO event handlers
│       ├── app.js            # Express app setup, middleware, routes
│       ├── server.js         # Server entry point, cluster support
│       └── seed.js           # Database seeder
├── frontend/
│   └── src/
│       ├── components/       # Shared reusable components
│       │   ├── Sidebar.jsx   # Main navigation sidebar
│       │   ├── Topbar.jsx    # Top bar with search, notifications, profile
│       │   ├── Modal.jsx     # Reusable modal component
│       │   ├── KanbanBoard.jsx  # Drag-and-drop Kanban
│       │   ├── Logo.jsx      # GRESIO logo component
│       │   ├── VoiceController.jsx # Voice command toast
│       │   └── ...           # Many more shared components
│       ├── pages/            # Route page components
│       │   ├── Login.jsx     # Login + 2FA + forced password change
│       │   ├── Dashboard.jsx # Company dashboard with health/progress
│       │   ├── Projects.jsx  # Project listing with progress bars
│       │   ├── ProjectDetail.jsx # Single project view with phases
│       │   ├── Tasks.jsx     # Kanban + task list views
│       │   ├── WorkLogs.jsx  # Time tracking interface
│       │   ├── Users.jsx     # Team management
│       │   ├── Admin.jsx     # Company settings
│       │   ├── super-admin/  # Super admin panel pages
│       │   └── public/       # Public site pages
│       ├── context/
│       │   └── AuthContext.jsx   # Auth state, login/logout/verify2fa
│       ├── hooks/
│       │   ├── useSocket.js  # Socket.IO connection hook
│       │   └── useTheme.js   # Dark/light theme hook
│       └── services/
│           └── api.js        # Axios instance with auth interceptor
├── .gitignore
├── .prettierrc               # Prettier code formatting config
└── README.md
```

---

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password; returns `mustChangePassword` flag |
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/verify-2fa` | No | Verify 2FA code with temp token |
| POST | `/api/auth/forgot-password` | No | Request password reset email |
| POST | `/api/auth/reset-password/:token` | No | Reset password with token; clears `mustChangePassword` |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PATCH | `/api/auth/profile` | Yes | Update profile (name, theme, etc.) |
| POST | `/api/auth/change-password` | Yes | Change password (needs currentPassword + newPassword); clears `mustChangePassword` |
| POST | `/api/auth/setup-2fa` | Yes | Generate 2FA secret + QR code |
| POST | `/api/auth/enable-2fa` | Yes | Enable 2FA with verification |
| POST | `/api/auth/disable-2fa` | Yes | Disable 2FA (needs password confirmation) |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Yes | List users (filterable by company/role) |
| GET | `/api/users/:id` | Yes | Get user details |
| PATCH | `/api/users/:id` | Yes | Update user (role, name, etc.) |
| POST | `/api/users/invite` | Yes | Invite user by email (sets `mustChangePassword: true`) |
| POST | `/api/users/import-azure` | Yes | Bulk import from Azure AD |
| GET | `/api/users/:id/activity` | Yes | Get user activity log |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | Yes | List projects (filterable by type, status, company) |
| POST | `/api/projects` | Yes | Create project |
| GET | `/api/projects/:id` | Yes | Get project details with progress |
| PATCH | `/api/projects/:id` | Yes | Update project |
| DELETE | `/api/projects/:id` | Yes | Delete project |
| POST | `/api/projects/:id/phases` | Yes | Advance/recede project phase |
| POST | `/api/projects/:id/relay` | Yes | Link project in relay chain |

### Tasks, Sprints, Test Cases, Notifications, Reports, Work Logs, Wiki

Full CRUD with pagination, filtering, and sorting across all entities. See route files for the complete list.

---

## Notable Design Decisions

| Decision | Rationale |
|----------|-----------|
| `transform` removed from `fade-in` keyframes | Prevents breaking `position: fixed` elements (topbars, modals, side panels) across all 43+ page-enter animated routes |
| Nested animation + positioning divs for modals | Separates `animate-scale-in` from `-translate-x/translate-y` centering to avoid transform conflicts |
| `mustChangePassword` as schema field | Forces password change on first login after invite or admin reset — checked after both direct login AND 2FA flow |
| Progress via polling (15s interval) | Avoids WebSocket complexity for non-critical progress bars on project cards |
| Cluster mode opt-in via env var | Keeps development simple while allowing production multi-core scaling |
| Helmet only in production | Avoids CSP issues during local development with Vite HMR |
| Uploads gitignored with `.gitkeep` | Keeps directory structure in version control while excluding user-uploaded files |

---

## PWA Support

The frontend includes:
- Service worker (Workbox) for offline caching
- Web manifest with app icons (48px to 512px)
- iOS splash screens
- `registerSW.js` for service worker lifecycle management

Build creates: `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest`

---

## Code Quality

- `.prettierrc` included for consistent formatting
- ES module-free (CommonJS on backend for simplicity)
- Graceful error handling with centralized error middleware
- Input sanitization (HTML escaping via DOMPurify on frontend)
- All backend JS files pass `node -c` syntax validation

---

## License

© 2026 360 DMMC — All rights reserved.
