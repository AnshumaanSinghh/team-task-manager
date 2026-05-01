# 🚀 TaskFlow — Intelligent Team Task Manager

A production-grade, full-stack SaaS application for team collaboration. Built with AI-powered task creation, real-time project health monitoring, visual activity playback, and enterprise-level audit logging. This is not just a task manager — it's a system that **understands, predicts, and explains** project behavior.

**🔗 Live App**: [https://frontend-lake-tau-31.vercel.app](https://frontend-lake-tau-31.vercel.app)
**🔗 API Base**: [https://backend-mu-two-25.vercel.app](https://backend-mu-two-25.vercel.app)

---

## ✨ Features

### Core Platform
- 🔐 **JWT Authentication** — Secure signup/login with bcrypt password hashing
- 👥 **Role-Based Access Control (RBAC)** — Admin (full CRUD) vs Member (view + status updates only)
- 📁 **Project Management** — Create, edit, and assign members to projects
- ✅ **Task Management** — Full CRUD with subtasks, priorities, and deadlines
- 📊 **Dashboard Analytics** — Completion rate ring, status pie chart, per-project bar chart, priority breakdown
- 🎯 **Kanban Board** — Drag-and-drop task management with optimistic UI updates and confetti on completion

### 🧠 AI-Powered Features
- ⚡ **AI Magic Task Creator** — Type natural language like *"Build login page by Friday, assign to Raj"* and the system auto-creates the task with correct title, deadline, assignee, and priority. Uses a multi-model routing strategy (Groq → Gemini → OpenRouter) with automatic fallback.
- 🤖 **AI "Next Best Action"** — Click "Suggest Next Step" in any task to receive rule-based, intelligent recommendations (e.g., *"Raj is overloaded with 7 pending tasks. Consider reassigning."*)

### 💓 Project Intelligence
- 📡 **Live Project Pulse** — A real-time health score (0-100) that calculates project health from task completion rate, overdue count, and team activity. Features an animated ECG wave that changes color (Green/Yellow/Red) and speed based on the score.
- 🏷️ **Pulse Risk Badge** — Dynamic status badge (Healthy / At Risk / Critical) that updates every 15 seconds.
- 🔥 **Burnout Detection** — Automatically flags team members with heavy workloads or too many overdue tasks.
- 💡 **Smart Insights** — Auto-generated 1-line insights like "Project has gone dormant" or "High activity, team is actively pushing."

### 🎬 Activity & Playback
- 📋 **Activity Timeline** — Full audit log tracking every task creation, status change, and comment.
- 👻 **Ghost Playback** — A cinematic, animated timeline replay of all project activities. Features Play/Pause controls, smooth transitions, and visual Smart Highlights:
  - 🏆 Largest task completed
  - ⚠️ Missed deadlines count
  - 📈 Peak activity moment

### 💬 Collaboration
- 💬 **Smart Comments** — Markdown-supported threaded comments inside each task.
- 📌 **Decision Mode** — Mark any comment as a "Key Decision". Pinned decisions appear prominently at the top of the task for easy reference.

### 🌐 Sharing & Export
- 🔗 **Public Share Links** — Generate a unique, secure URL to share any project board in read-only mode (no login required). Perfect for demos, clients, and recruiters.
- 📥 **1-Click CSV Export** — Export filtered task boards to CSV instantly.

### 🎨 Premium UX
- 🔴🟡🟢 **Priority System** — High, Medium, Low with color-coded badges
- ⏰ **Smart Deadline Indicators** — Overdue (red), Due Soon (amber), Safe (green)
- 🔍 **Search & Filters** — Real-time search and priority filtering
- ⚡ **Skeleton Loaders** — Premium loading states across all pages
- 🎨 **Micro-Animations** — fadeIn, slideUp, scaleIn transitions with Framer Motion
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT + bcryptjs |
| AI Routing | Groq (Llama 3), Google Gemini Flash, OpenRouter |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Animations | Framer Motion |
| Markdown | react-markdown |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| Deployment | Vercel (Serverless Edge) |

---

## 📂 Project Structure

```
team-task-manager/
├── backend/
│   ├── config/db.js                  # MongoDB connection with serverless caching
│   ├── controllers/
│   │   ├── authController.js         # Login, Signup, User listing
│   │   ├── projectController.js      # CRUD, Share, Pulse, Playback
│   │   └── taskController.js         # CRUD, AI Create, Comments, Decisions, Suggestions
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification + RBAC
│   │   └── errorMiddleware.js        # Global error handler
│   ├── models/
│   │   ├── Activity.js               # Audit log schema
│   │   ├── Comment.js                # Task comments schema
│   │   ├── Project.js                # Project schema with shareId
│   │   ├── Task.js                   # Task schema with decisionLog
│   │   └── User.js                   # User schema with roles
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   └── taskRoutes.js
│   └── server.js                     # Express app with serverless DB middleware
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── CreateProjectModal.jsx
│       │   ├── CreateTaskModal.jsx
│       │   ├── GhostPlayback.jsx     # Cinematic activity replay
│       │   ├── Navbar.jsx
│       │   ├── ProjectPulse.jsx      # Live health monitor widget
│       │   ├── TaskDetailsModal.jsx  # Comments, Decisions, AI Suggestions
│       │   └── AIGeneratorModal.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Login.jsx
│       │   ├── ProjectDetails.jsx    # Kanban + AI bar + Pulse + Playback
│       │   ├── Projects.jsx
│       │   ├── PublicProject.jsx     # Read-only shared view
│       │   └── Signup.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ThemeContext.jsx
│       └── App.jsx
└── README.md
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/users` | ✅ | Get all users |

### Projects
| Method | Endpoint | Auth | Access | Description |
|--------|----------|------|--------|-------------|
| GET | `/api/projects` | ✅ | All | Get user's projects |
| GET | `/api/projects/:id` | ✅ | All | Get single project |
| POST | `/api/projects` | ✅ | Admin | Create project |
| PUT | `/api/projects/:id` | ✅ | Admin | Update project |
| GET | `/api/projects/:id/activity` | ✅ | All | Get activity timeline |
| GET | `/api/projects/:id/pulse` | ✅ | All | Get project health score |
| GET | `/api/projects/:id/playback-highlights` | ✅ | All | Get playback data + highlights |
| POST | `/api/projects/:id/share` | ✅ | Admin | Generate public share link |
| GET | `/api/projects/public/:shareId` | ❌ | Public | View shared project (read-only) |

### Tasks
| Method | Endpoint | Auth | Access | Description |
|--------|----------|------|--------|-------------|
| GET | `/api/tasks` | ✅ | All | Get tasks (supports ?projectId, ?status, ?priority, ?search) |
| GET | `/api/tasks/dashboard` | ✅ | All | Get dashboard analytics |
| POST | `/api/tasks` | ✅ | Admin | Create task |
| PUT | `/api/tasks/:id` | ✅ | All | Update task (Members: status only) |
| DELETE | `/api/tasks/:id` | ✅ | Admin | Delete task |
| POST | `/api/tasks/ai-create` | ✅ | Admin | AI-powered natural language task creation |
| GET | `/api/tasks/:id/comments` | ✅ | All | Get task comments |
| POST | `/api/tasks/:id/comments` | ✅ | All | Add comment |
| PUT | `/api/tasks/:id/comments/:commentId/decision` | ✅ | All | Toggle comment as decision |
| GET | `/api/tasks/:id/suggest-next-step` | ✅ | All | Get AI suggestion for task |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
git clone <repo-url>
cd team-task-manager

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/taskflow
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

> **Note**: AI API keys (GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY) are injected via Vercel's encrypted environment variables in production and are NOT stored in any files.

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run

From the root directory:
```bash
npm run dev
```

This starts both servers concurrently:
- Frontend → http://localhost:3000
- Backend → http://localhost:5000

---

## 🌐 Deployment (Mandatory Requirement)

As per project requirements, the API is structured to run on Railway, while the frontend is optimized for Vercel.

### Backend (Railway)
- Set Root Directory to `backend`
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment Variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`

### Frontend (Vercel)
- Set Root Directory to `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://your-railway-backend-url.up.railway.app/api`

---

## 🔐 Security Measures
- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens with 7-day expiry
- AI API keys stored exclusively in Vercel's encrypted vault (never in source code)
- Input sanitization & validation on all endpoints
- Role-based middleware enforcement (Admin vs Member)
- CORS configuration
- Request body size limits (10MB)
- No debug/diagnostic endpoints in production

---

## 👤 Author
Built as a production-ready, portfolio-grade SaaS project demonstrating full-stack engineering, AI integration, and real-time analytics.
