# Member 360° Healthcare Intelligence Assistant — Working MVP

This package is a synthetic-data full-stack prototype for the Member 360 hackathon.

## Stack

- Backend: FastAPI + Pydantic
- Frontend: React 18 + Vite + Tailwind CSS
- API client: Axios
- Charts/UI icons: Recharts + Lucide React
- Data: synthetic in-memory records in `backend/seed_data.py`
- AI Summary: deterministic rule-based synthetic insights (no external LLM call)

## Important demo note

This is a **hackathon prototype**, not a production healthcare system. It contains synthetic data and mock SSO. Do not use it with real PHI.

## What was fixed

The original project allowed the browser to create a local token without backend authentication and did not protect most API endpoints.

The updated version:

1. Authenticates credentials in FastAPI.
2. Issues a signed, expiring demo session token.
3. Requires `Authorization: Bearer <token>` for protected APIs.
4. Enforces staff vs. member access.
5. Prevents a member from opening another member's record.
6. Uses a backend SSO mock instead of creating an SSO token in React.
7. Does not return demo passwords from `/api/auth/demo-users`.
8. Handles expired/invalid sessions in Axios and returns the user to `/login`.
9. Uses an 8-hour token lifetime by default.
10. Restricts CORS to the local Vite development origins by default.

## Demo accounts

| Username | Password | Role |
|---|---|---|
| `servicerep` | `demo1234` | Service Rep |
| `caremanager` | `demo1234` | Care Manager |
| `clinician` | `demo1234` | Clinician |
| `admin` | `demo1234` | Administrator |
| `user` | `password123` | Clinical Specialist |

Synthetic member login:

- Username: `MEM123456`
- Password: `MEM123456`
- This member is redirected directly to their own Member 360 profile.

## Run on Windows

### 1. Backend

Open PowerShell:

```powershell
cd member360-fullstack\member360\backend

python -m venv venv
venv\Scripts\activate

python -m pip install --upgrade pip
pip install -r requirements.txt

$env:M360_APP_SECRET="change-this-demo-secret"
uvicorn main:app --reload --port 8000
```

Backend:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

Keep this terminal running.

### 2. Frontend

Open a second PowerShell:

```powershell
cd member360-fullstack\member360\frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

If `.env` does not exist, create it from `.env.example`:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

## Authentication flow

```text
React Login
     |
     | POST /api/auth/login
     v
FastAPI validates username/password
     |
     | valid
     v
Signed expiring session token
     |
     v
React stores token
     |
     | Authorization: Bearer <token>
     v
Protected Member 360 APIs
```

For SSO:

```text
React SSO button
     |
     | POST /api/auth/sso
     v
FastAPI mock enterprise SSO
     |
     v
Signed clinician session
```

## Core API endpoints

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/sso`
- `GET /api/auth/me`

### Dashboard

- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-searches`
- `GET /api/alerts`

### Member 360

- `GET /api/members`
- `GET /api/members/{member_id}`
- `GET /api/members/{member_id}/overview`
- `GET /api/members/{member_id}/eligibility`
- `GET /api/members/{member_id}/claims`
- `GET /api/members/{member_id}/medications`
- `GET /api/members/{member_id}/authorizations`
- `GET /api/members/{member_id}/interactions`
- `GET /api/members/{member_id}/timeline`
- `GET /api/members/{member_id}/ai-summary`

## Recommended next step for the hackathon

After the MVP works end-to-end, the strongest next upgrade is:

1. Replace in-memory `seed_data.py` with PostgreSQL/Supabase.
2. Replace mock SSO with a real identity provider.
3. Add RAG over plan/policy documents.
4. Add source citations to every AI insight.
5. Add a real next-best-action engine using care gaps, claims and authorization status.
6. Add audit logging for member-record access.
7. Add automated tests for authentication and every Member 360 endpoint.

## Normalized PostgreSQL database

The backend now uses a proper normalized PostgreSQL schema instead of storing
the original datasets as JSONB. The existing synthetic records in
`backend/seed_data.py` are used only as a one-time seed source.

### Tables

`members`, `eligibility`, `claims`, `medications`, `authorizations`,
`interactions`, `timeline_events`, `ai_summaries`, `ai_insights`,
`ai_recommendations`, `alerts`, `dashboard_stats`, `users`,
`admin_credentials`.

All member-related transactional tables use `members.member_id` as a
foreign key. The existing API and RAG code retain their response shapes while
reading through the PostgreSQL-backed `DataStore`.

### Setup

1. Create PostgreSQL database:

```sql
CREATE DATABASE member360;
```

2. Copy `backend/.env.example` to `backend/.env` and set the PostgreSQL
password.

3. From `backend`:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python init_db.py
python -m uvicorn main:app --reload
```

4. Start the frontend in a second terminal:

```powershell
cd ..\frontend
npm install
npm run dev
```

Open `http://localhost:5173/`.

For schema/reference SQL, see `backend/schema_postgres.sql`.
