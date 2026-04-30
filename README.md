# 🚀 TaskFlow — Team Task Manager

A production-grade full-stack SaaS application for team collaboration. Organize projects, manage tasks with Kanban boards, track analytics, and control access with role-based permissions.

**Live Demo**: *Deploy to Vercel + Railway*

---

## ✨ Features

### Core
- 🔐 **JWT Authentication** — Secure signup/login with bcrypt password hashing
- 👥 **Role-Based Access Control** — Admin (full CRUD) vs Member (view + status updates)
- 📁 **Project Management** — Create, edit, and assign members to projects
- ✅ **Task Management** — Create, assign, update, delete tasks with full CRUD
- 📊 **Dashboard Analytics** — Completion rate ring, status pie chart, tasks-per-project bar chart, priority breakdown
- 🎯 **Kanban Board** — Drag-and-drop task management across To Do / In Progress / Completed

### Advanced
- 🔴🟡🟢 **Priority System** — High, Medium, Low with color-coded badges
- ⏰ **Smart Deadline Indicators** — Overdue (red), Due Soon (yellow), Safe (green)
- 🔍 **Search & Filters** — Search tasks by title, filter by priority
- 📝 **Activity Log** — Real-time timeline: "User X changed status to Completed"
- 🌙 **Dark Mode** — Toggleable with localStorage persistence
- 📱 **Responsive Design** — Works perfectly on desktop, tablet, mobile
- ⚡ **Skeleton Loaders** — Premium loading states across all pages
- 🎨 **Micro-Animations** — fadeIn, slideUp, scaleIn transitions

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## 📂 Project Structure

```
team-task-manager/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── Activity.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   └── taskRoutes.js
│   ├── server.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/index.js
│   │   ├── components/
│   │   │   ├── CreateProjectModal.jsx
│   │   │   ├── CreateTaskModal.jsx
│   │   │   └── Navbar.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ProjectDetails.jsx
│   │   │   ├── Projects.jsx
│   │   │   └── Signup.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── .env
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Access | Description |
|--------|----------|------|--------|-------------|
| POST | `/api/auth/signup` | ❌ | All | Register new user |
| POST | `/api/auth/login` | ❌ | All | Login user |
| GET | `/api/auth/users` | ✅ | All | Get all users |
| GET | `/api/projects` | ✅ | All | Get user's projects |
| GET | `/api/projects/:id` | ✅ | All | Get single project |
| POST | `/api/projects` | ✅ | Admin | Create project |
| PUT | `/api/projects/:id` | ✅ | Admin | Update project |
| GET | `/api/tasks` | ✅ | All | Get tasks (supports ?projectId, ?status, ?priority, ?search) |
| GET | `/api/tasks/dashboard` | ✅ | All | Get dashboard analytics |
| POST | `/api/tasks` | ✅ | Admin | Create task |
| PUT | `/api/tasks/:id` | ✅ | All | Update task (Members: status only) |
| DELETE | `/api/tasks/:id` | ✅ | Admin | Delete task |

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
FRONTEND_URL=http://localhost:3000
```

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

> **Zero-config mode**: If no valid MONGO_URI is set, the backend automatically starts an in-memory MongoDB server for instant local development.

---

## 🌐 Deployment

### Backend → Railway / Render
1. Set Root Directory to `backend`
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. Environment Variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`

### Frontend → Vercel
1. Set Root Directory to `frontend`
2. Framework Preset: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variable: `VITE_API_URL=https://your-backend.railway.app/api`

---

## 🔐 Security Measures
- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens with 7-day expiry
- Input sanitization & validation
- Role-based middleware enforcement
- CORS whitelist configuration
- Request body size limits

---

## Author
Built as a production-ready SaaS portfolio project.
