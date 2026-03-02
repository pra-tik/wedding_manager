# Wedding Planner & Guest Management System

Full-stack wedding guest management application with RSVP tracking, multi-event attendance, analytics, event timeline, CSV import/export, and deployment-ready setup.

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + Lucide + `motion/react` + Recharts
- Backend: Express + TypeScript
- Database: PostgreSQL
- CSV: multer + csv-parser + fast-csv

## Features

- Guest CRUD with name, email, phone, RSVP status
- Per-event attendance flags (Engagement, Sangeet, Wedding, Reception)
- Real-time search + filtering by RSVP status and event attendance
- CSV import/export for bulk operations
- Analytics dashboard:
  - RSVP distribution (pie)
  - Attendance per event (bar)
  - Total guest count + pending responses
- Event timeline with date, time, location
- Animated transitions and toast notifications

## Project Structure

- `client/`: React frontend
- `server/`: Express API + PostgreSQL access
- `.github/workflows/ci-cd.yml`: CI/CD pipeline

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file from template:
   ```bash
   cp .env.example server/.env
   ```
   Update `DATABASE_URL` as needed.
3. Start the app:
   ```bash
   npm run dev
   ```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

The server auto-runs initial SQL migration (`server/src/migrations/init.sql`) at startup.

## CSV Format

CSV headers expected:

```csv
host,name,family,location,stay_required,saree,probability,physical_patrika,Return Gift,Saree Cost,email,phone,rsvpStatus,engagement,sangeet,wedding,reception
```

- `rsvpStatus`: `Pending` | `Attending` | `Declined`
- `stay_required`: accepts `yes/no/blank` (case-insensitive)
- `saree`, `physical_patrika`, `Return Gift`: `true/false` (also supports `yes/no`, `1/0`)
- `Saree Cost`: numeric
- Event flags: `true/false` (also supports `yes/no`, `1/0`)

## Production

- `process.env.PORT` is used for runtime port configuration
- `Dockerfile` and `docker-compose.yml` included
- `Procfile` included for Heroku-compatible process startup

### Build & Start

```bash
npm run build
npm run start
```

## CI/CD

GitHub Actions workflow:

- CI on PR/main: install, typecheck, build, PostgreSQL service
- CD on main: Azure deployment step if repository secrets are set:
  - `AZURE_WEBAPP_NAME`
  - `AZURE_WEBAPP_PUBLISH_PROFILE`

## Azure App Service Deployment Checklist

Use the existing GitHub Actions workflow (`.github/workflows/ci-cd.yml`) with publish profile deployment.

Required App Settings in Azure Web App:

- `NODE_ENV=production`
- `PORT=8080` (App Service injects this at runtime; keep for clarity)
- `DATABASE_URL=<your-postgres-connection-string>`
- `DB_SSL_MODE=verify-full` (recommended for cloud Postgres)
- `DB_SSL_CA=<PEM CA cert with \\n escaped>` (if your provider requires custom CA chain)

Recommended Azure configuration:

- Runtime stack: Node 20 LTS
- Startup command: `npm run start`
- Health check path: `/api/health`

Notes:

- CSV imports write to `server/uploads` on local filesystem. App Service filesystem is ephemeral, which is fine for temporary upload processing, but not for durable file storage.
- The app runs DB migrations automatically during startup (`initializeDatabase()`).
