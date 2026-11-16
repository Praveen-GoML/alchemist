# Go Alchemists Hub (Alchemist)

Internal delivery hub for goML. It brings project tracking, the **PreQ** client-readiness tracker, team hygiene and leave tracking, and shared docs into one app.

This repository contains the web app and both of its backends:

| Folder | What it is | Stack |
| --- | --- | --- |
| `/` (`src/`) | **Frontend**: the Alchemist hub UI | React 18, Vite 6, MUI 6 |
| [`preq-backend/`](preq-backend/README.md) | **PreQ API**: SOW analysis, prerequisites, BRD, evidence, credentials | FastAPI, SQLAlchemy, Gemini |
| [`alchemist-backend/`](alchemist-backend/README.md) | **Auth and hub API**: login, users, roles, hub data | FastAPI, SQLAlchemy, JWT |

```
Browser (Vite app, :5174)
   ├── /auth, hub data ──► alchemist-backend  (:8001)
   └── /api/*          ──► preq-backend       (:8002)
```

## Features

- **Home**: portfolio tiles for every project with status and UAT dates.
- **Projects**: registry with stage, lead(s), UAT dates, blockers and progress.
- **Pre-req (PreQ tracker)**
  - Upload a SOW or proposal and let AI extract requirements, prerequisites, dependencies, risks and open questions. Every prerequisite is checked against the source text.
  - Per-project dashboard with readiness score, blockers, evidence submission and AI/manual verification.
  - Business Requirements Document viewer plus Word and Excel exports.
  - **Context** button: one Markdown document with the whole project context, ready to paste into an AI assistant. Secrets are never included.
  - Credentials are encrypted at rest and shown only as a masked hint.
- **Daily hygiene** and **Leave tracker**: every person edits only their own row.
- **Docs and Drive**, **Team**, **Checklist**, **Improvements**, **Tracker links**, **Playbook**.
- Light and dark theme (toggle in the top bar, remembered per browser).
- A standalone, public client page exists at `#client/<project-id>` for clients to share evidence and credentials. It is not linked from the internal UI.

## Prerequisites

- Node.js 18 or newer and npm
- Python 3.10 or newer (for the backends)
- A Gemini API key (for AI features) and a Firebase web app (for Docs and Drive)

## Quick start

```bash
# 1. Frontend (this folder)
npm install
cp .env.example .env        # fill in the values
npm run dev                 # http://localhost:5174

# 2. PreQ backend (new terminal)
cd preq-backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8002

# 3. Auth backend (new terminal)
cd alchemist-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed_data.py          # creates the initial users (see the backend README)
uvicorn main:app --reload --port 8001
```

Open `http://localhost:5174` and sign in with a seeded user.

## Frontend

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 5174 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run backend` | Shortcut that starts the PreQ API on port 8002 |

### Environment variables

Copy `.env.example` to `.env`. Only `VITE_` variables reach the browser, so never put secrets here.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | PreQ backend origin (defaults to `http://127.0.0.1:8002` locally) |
| `VITE_AUTH_API_URL` | Auth backend origin, no trailing `/api` (defaults to `http://localhost:8001` in dev) |
| `VITE_BASE_URL` | Optional public origin for generated links |
| `VITE_FIREBASE_*` | Firebase web app config used by Docs and Drive |

### Structure

```
src/
├── App.jsx               # app shell, auth gate, hash routing
├── components/           # shell (Sidebar, TopBar), modals, shared UI
│   └── views/            # one file per sidebar page (Overview, Projects, Prereq, ...)
├── pages/                # PreQ screens (ExecutiveDashboard, ProjectDashboard, CreateProject, ClientPortal, ...)
├── context/AuthContext   # login state and role-based permissions
├── services/             # Firebase storage helper
├── utils/                # helpers, theme, project-context builder, credential guides
├── data/initialState.js  # seed data for the local hub state
└── styles.css, styles/   # design tokens, base styles, PreQ and polish layers
```

Navigation is hash-based (`#overview`, `#projects`, `#prereq`, `#prereq/<id>`, `#hygiene`, `#leave`, `#docs`, ...), so the app deploys as a static site.

### Styling

Colours, radii and shadows are CSS variables in `src/styles.css`. `src/styles/polish.css` is loaded last and refines the dark theme, buttons and inputs. Prefer the variables (`var(--surface)`, `var(--ink)`, `var(--line)`, `var(--accent)`) over fixed hex colours so dark mode keeps working.

## Deployment (Vercel)

Deploy three separate Vercel projects from this repository:

1. **Frontend**: root directory `/`, framework Vite. Set the `VITE_*` variables.
2. **preq-backend**: root directory `preq-backend`. Set `DATABASE_URL`, `GEMINI_API_KEY` and `CREDENTIAL_ENCRYPTION_KEY`.
3. **alchemist-backend**: root directory `alchemist-backend`. Set `DATABASE_URL` and `JWT_SECRET`.

Redeploy a project after changing its environment variables.

## Security notes

- `.env*` files are git-ignored. Only the `.env.example` templates are committed.
- Credentials shared by clients are encrypted with `CREDENTIAL_ENCRYPTION_KEY`. Losing that key makes stored credentials unreadable, so keep it in a secrets manager.
- Several permissions (for example the own-row rule in Daily hygiene and Leave) are enforced in the browser, because that data is stored locally. They prevent mistakes but are not a security boundary.
- Rotate any API key that has been pasted into chat, logs or screenshots.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot connect to backend server` on login | Start `alchemist-backend` on port 8001 and check `VITE_AUTH_API_URL` |
| SOW analysis returns 503 | Check `GEMINI_API_KEY` and the backend log for the per-model error |
| A new endpoint returns 404 | The backend is an old process; restart `uvicorn` |
| Styles look stale after an edit | Hard-refresh (Ctrl+Shift+R) or restart `npm run dev` |
