# Alchemist Backend (Auth and Hub API)

FastAPI service for sign-in and the hub's shared data. It issues JWTs and enforces role-based access.

## Features

- JWT authentication (`/auth/login`, `/auth/me`, `/auth/change-password`)
- Roles: `admin`, `pm`, `tl`, `developer`, `ml`
- CRUD for projects, team members, leave records, daily hygiene, delivery checklist, improvements
- File upload endpoint for hub documents

## Setup

```bash
cd alchemist-backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then edit the values
python seed_data.py                 # creates the initial users
uvicorn main:app --reload --port 8001
```

- API docs: <http://localhost:8001/docs>
- Health check: `GET /health`

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Long random string used to sign tokens. Never reuse across environments |
| `JWT_ALGORITHM` | Signing algorithm (default `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default 10080 = 7 days) |

## Layout

```
alchemist-backend/
├── main.py           # routes
├── auth.py           # hashing, tokens, role guards
├── models.py         # SQLAlchemy models
├── schemas.py        # Pydantic models
├── database.py       # engine and session
├── seed_data.py      # creates the initial users
├── reset_db.py       # drops and recreates tables (development only)
└── vercel.json       # Vercel deployment
```

## Endpoints

| Area | Paths |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register` (admin), `GET /auth/me`, `POST /auth/change-password`, `GET /auth/users` (admin) |
| Projects | `GET/POST /projects`, `PUT/DELETE /projects/{id}` |
| Members | `GET/POST /members`, `PUT/DELETE /members/{id}` |
| Leave | `GET/POST /leaves`, `PUT/DELETE /leaves/{id}` |
| Hygiene | `GET/POST /daily-hygiene`, `PUT /daily-hygiene/{id}` |
| Checklist | `GET/POST /checklist`, `PUT /checklist/{id}`, `/checklist-meta` |
| Improvements | `GET/POST /improvements`, `PUT/DELETE /improvements/{id}` |
| Files | `POST /upload` |

Write access depends on role: admins can do everything, PMs and TLs can manage most hub data, and other roles are mostly read-only.

## Seed users and passwords

`seed_data.py` creates the initial admin and PM accounts. **Change those passwords immediately** after the first sign-in (`POST /auth/change-password`), and never run the seed script against a production database with the default values.

## Deployment (Vercel)

Create a Vercel project with root directory `alchemist-backend`, set the variables above, and redeploy. In the frontend project set `VITE_AUTH_API_URL` to this deployment's origin.

## Notes

- `reset_db.py` deletes data. Use it only on a development database.
- Keep `.env` out of version control; only `.env.example` is committed.
