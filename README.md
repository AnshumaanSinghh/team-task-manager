# TaskFlow — Team Task Manager

A full-stack team task manager for small teams that want more than a to-do list: a Kanban board with **WIP limits and blockers**, **Focus Mode** that logs real time to tasks, a **live team workload** view, **one-click async standups**, **@mentions with an inbox**, and **AI planning** that still works with no AI keys at all.

Black, green and white UI with 3D press buttons, tilt cards, page transitions and a circular theme reveal. Dark and light themes.

**Live app:** [frontend-lake-tau-31.vercel.app](https://frontend-lake-tau-31.vercel.app)

![Dashboard](docs/screenshots/dashboard.png)

---

## What makes it different

| Feature | What it does |
|---|---|
| **Blockers / dependencies** | Mark a task as waiting on other tasks. Blocked cards show a lock, and the API refuses to complete a task while its blockers are open. Dependency cycles are rejected. |
| **WIP limits** | Per-column work-in-progress limits (To Do, In Progress, In Review). Columns over the limit get a striped warning so the team finishes before starting more. |
| **Focus Mode** | Start a 25 or 50 minute session from any task. A full-screen timer (or a floating pill) counts down, then the time is logged to the task and to the activity feed. Starting focus on a To Do task moves it to In Progress. |
| **Live team workload** | The Team page shows open work, overdue tasks, story points, weekly output, kudos and focus minutes for each person, flags overloaded people, and shows who is focusing right now. |
| **Async standups** | Generates Done / Doing / Blockers for each member from the board and the activity log (24h, 3 days or a week) and copies it as Markdown for Slack or email. |
| **Quick Add** | Type `Design pricing page by Friday @riya #design 3pts urgent` and get a task with title, owner, due date (in your timezone), tag, estimate and priority. Works offline with a built-in parser; Groq, Gemini or OpenRouter refine it when keys are set. |
| **AI Planner** | Describe a goal and review a full plan (tasks, estimates, checklists, due dates) before anything is created. Falls back to built-in playbooks when no AI provider is configured. |
| **@mentions and inbox** | Mention teammates in comments (with autocomplete). Mentions, assignments, status changes on your tasks and kudos land in a notification inbox that links straight to the task. |
| **Kudos** | Thank the owner of a completed task. Kudos show on the card and on the Team page. |
| **Three views** | Board (drag and drop, keyboard accessible), sortable List, and a month Calendar. |
| **Project pulse** | A 0–100 health score from completion, overdue work, blockers, review bottlenecks and activity, with burnout warnings. |
| **Ghost playback** | Replay the project history event by event, with a scrubber, 1x/2x/4x speed and highlights. |
| **Decision log** | Pin any comment as a key decision so it sits at the top of the task. |
| **Public share links** | Read-only board for clients or reviewers. No emails, comments or time logs are exposed, and links can be revoked. |
| **Command palette and shortcuts** | `Ctrl/⌘ K` searches tasks, projects and commands. `G D` / `G P` / `G T` navigate, `N` new task, `Q` quick add, `/` filter, `1` `2` `3` switch views, `?` shows every shortcut. |

<table>
<tr>
<td><img src="docs/screenshots/board.png" alt="Kanban board"></td>
<td><img src="docs/screenshots/task-details.png" alt="Task details"></td>
</tr>
<tr>
<td><img src="docs/screenshots/focus-mode.png" alt="Focus mode"></td>
<td><img src="docs/screenshots/team.png" alt="Team workload"></td>
</tr>
<tr>
<td><img src="docs/screenshots/board-light.png" alt="Light theme"></td>
<td><img src="docs/screenshots/login.png" alt="Sign in"></td>
</tr>
</table>

## Roles

| | Admin | Member |
|---|---|---|
| See projects | All projects | Projects they belong to |
| Create, edit, delete projects and tasks | Yes | No |
| Move tasks, tick checklists, comment, focus, kudos | Yes | Yes, in their projects |
| Quick Add and AI Planner | Yes | No |
| Pin decisions, manage share links | Yes | No |

Every project, task, comment, activity, pulse, playback and standup endpoint checks project membership on the server, not just in the UI.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Recharts, @hello-pangea/dnd, react-markdown, Lucide |
| Backend | Node.js 20+, Express 5, Mongoose 9 |
| Database | MongoDB |
| Auth | JWT (7 days) + bcrypt (12 rounds), rate-limited sign in and sign up |
| AI (optional) | Groq, Google Gemini, OpenRouter, tried in that order |
| Tests | `node:test` unit tests plus an end-to-end API test against a real MongoDB |

## Getting started

Prerequisites: Node.js 20 or newer and a MongoDB instance (local or Atlas).

```bash
git clone https://github.com/AnshumaanSinghh/team-task-manager.git
cd team-task-manager
npm install
npm run install:all
```

Configure the API:

```bash
cp backend/.env.example backend/.env    # then set MONGO_URI and JWT_SECRET
```

Optionally load demo data (four users, two projects, blockers, comments, a decision and two weeks of activity):

```bash
npm run seed
```

Demo sign-ins after seeding (password `demo1234`): `admin@taskflow.demo` (Admin), `riya@taskflow.demo`, `kabir@taskflow.demo`, `zoya@taskflow.demo` (Members).

Run both servers:

```bash
npm run dev
```

- Frontend: http://localhost:3000 (set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env`, see `frontend/.env.example`)
- API: http://localhost:5000

### Environment variables (backend)

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes in production | Long random string. The server refuses to start in production without it. |
| `PORT` | No | Default `5000` |
| `NODE_ENV` | No | `production` hides stack traces |
| `CORS_ORIGINS` | No | Comma-separated allowed origins. Default allows all. |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | No | Enable AI refinement for Quick Add and the AI Planner |
| `GROQ_MODEL`, `GEMINI_MODEL`, `OPENROUTER_MODEL` | No | Override the default model for each provider |

Secrets belong in your host's environment settings (Railway, Vercel) or a local `.env`, never in the repository.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API and frontend together |
| `npm test` | Backend unit tests, plus the API end-to-end test when `TEST_MONGO_URI` is set |
| `npm run lint` | ESLint for the frontend |
| `npm run build` | Production build of the frontend |
| `npm run seed` | Demo data (refuses to run with `NODE_ENV=production` unless `--yes` is passed) |

Run the full API test against a throwaway database (it is dropped afterwards):

```bash
TEST_MONGO_URI=mongodb://127.0.0.1:27017/taskflow_test npm test
```

## API overview

All routes are under `/api`. Everything except sign up, sign in, health and public boards needs `Authorization: Bearer <token>`.

**Auth** · `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` · `GET /auth/users`

**Projects** · `GET /projects` (with task stats) · `POST /projects` · `GET/PUT/DELETE /projects/:id` · `GET /projects/:id/activity` · `GET /projects/:id/pulse` · `GET /projects/:id/playback-highlights` · `GET /projects/:id/standup?hours=24` · `POST/DELETE /projects/:id/share` · `GET /projects/public/:shareId`

**Tasks** · `GET /tasks?projectId&status&priority&search&assignee=me&tag` · `POST /tasks` · `PUT/DELETE /tasks/:id` · `GET /tasks/dashboard?tz=` · `POST /tasks/ai-create` · `POST /tasks/ai-plan` · `POST /tasks/bulk` · `GET/POST /tasks/:id/comments` · `DELETE /tasks/:id/comments/:commentId` · `PUT /tasks/:id/comments/:commentId/decision` · `GET /tasks/:id/suggest-next-step` · `POST /tasks/:id/kudos` · `POST /tasks/:id/focus` · `POST /tasks/focus/stop`

**Team** · `GET /team/workload?projectId=`

**Notifications** · `GET /notifications` · `PUT /notifications/read-all` · `PUT /notifications/:id/read`

## Project structure

```
team-task-manager/
├── backend/
│   ├── controllers/     auth, project, task, team, notification
│   ├── lib/             access control, quick-add parser, AI providers, planner,
│   │                    pulse score, standup builder, mentions, rate limiter
│   ├── models/          User, Project, Task, Comment, Activity, Notification
│   ├── routes/
│   ├── scripts/seed.js
│   ├── test/            unit tests + end-to-end API test
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  board (Kanban, list, calendar), modals, palette, focus overlay, ui kit
│       ├── context/     auth, theme, focus session
│       ├── lib/         formatting, hotkeys, confetti
│       └── pages/       Dashboard, Projects, ProjectDetails, Team, PublicProject, Login, Signup
└── docs/screenshots/
```

## Deployment

**API on Railway:** root directory `backend`, start command `node server.js`, and set the environment variables above.

**Frontend on Vercel:** root directory `frontend`, framework preset Vite, build `npm run build`, output `dist`, and set `VITE_API_URL=https://<your-api-host>/api`.

## Author

Built by **Anshumaan Singh** · [github.com/AnshumaanSinghh](https://github.com/AnshumaanSinghh)
