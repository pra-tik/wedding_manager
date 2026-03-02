# Wedding Planner System Description

## Overview
This project is a full-stack Wedding Management application to manage guests, RSVPs, multi-event attendance, stays, tasks, imports, and analytics in one system.

The app is implemented as a monorepo with separate frontend and backend workspaces, and is deployment-ready for cloud environments like Azure App Service.

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Recharts (charts)
- Lucide React (icons)
- `motion/react` (animations)
- `react-hot-toast` (notifications)

### Backend
- Node.js + Express + TypeScript
- PostgreSQL via `pg`
- Input validation via `zod`
- File upload with `multer`
- CSV parsing with `csv-parser`
- CSV export with `@fast-csv/format`

### Tooling / DevOps
- npm workspaces
- GitHub Actions CI/CD
- Azure App Service deployment

## Architecture
- `client/`: SPA frontend.
- `server/`: API server + static file hosting in production.
- In production, one Node process serves both:
  - API endpoints under `/api/*`
  - built frontend from `client/dist`

## Core Features
- Guest CRUD management
- RSVP tracking (`Pending`, `Attending`, `Declined`)
- Event attendance per guest
- Multi-delete guests
- Search and filter (global + per-column)
- CSV import/export
- Async import jobs with progress tracking
- Analytics dashboard (guest + task insights)
- Event management (CRUD + meals + themes + custom options)
- To-Do/task management
- Stay management (grouping guests by stay)
- Authentication and role-based access control (RBAC)

## Data Models

### 1) Users (`users`)
- `id`
- `username` (unique)
- `password_hash`
- `is_admin`
- `permissions_json`
- `created_at`, `updated_at`

Permissions are page-level with values:
- `none`
- `read`
- `edit`

Pages:
- `guests`
- `analytics`
- `timeline`
- `todos`
- `imports`
- `users`
- `stays`

### 2) Events (`events`)
- `id`, `slug`, `name`
- `event_date`, `event_time`, `location`
- `lunch_provided`, `dinner_provided`, `snacks_provided`
- `dress_theme`, `other_options`
- `created_at`

### 3) Guests (`guests`)
- `id`
- `host`, `name`, `family`, `location`
- `stay_required`
- `stay_id` (FK to `stays`, nullable)
- `saree`, `probability`, `physical_patrika`, `return_gift`, `saree_cost`
- `email`, `phone`
- `rsvp_status`
- `created_at`, `updated_at`

### 4) Guest Event Attendance (`guest_event_attendance`)
Join table mapping guest-to-event attendance:
- `guest_id`
- `event_id`
- `attending`
- Composite primary key: (`guest_id`, `event_id`)

### 5) Todos (`todos`)
- `id`
- `title`
- `assignee_name`
- `assignee_count`
- `status` (`Pending`, `In Progress`, `Completed`)
- `expected_completion_date`
- `created_at`, `updated_at`

### 6) Stays (`stays`)
- `id`
- `name`
- `location`
- `notes`
- `created_at`, `updated_at`

### 7) Import Job (runtime model)
In-memory job tracking for CSV import status:
- `id`, `fileName`
- `status` (`queued`, `processing`, `completed`, `failed`)
- row counters (`totalRows`, `processedRows`, `insertedRows`, `skippedRows`, `failedRows`)
- error summary list

## Authentication and Authorization

### Authentication
- Login endpoint returns a bearer token.
- Password hashing uses Node crypto `scrypt` with salt.
- Session tokens are maintained server-side with expiration.

### Authorization
- Every protected route checks page permission:
  - `read` endpoints require `read` or `edit`
  - mutating endpoints require `edit`
- Admin users get `edit` access to all pages.

## CSV Import/Export

### Import
- Uploaded via `multer`
- Parsed via `csv-parser`
- Executed asynchronously as background job
- Live progress available through import job APIs

Supported headers include custom format fields:
- `host`, `name`, `family`, `location`
- `stay_required`
- `saree`, `probability`, `physical_patrika`, `Return Gift`, `Saree Cost`
- `email`, `phone`, `rsvpStatus`
- event slug columns

Behavior notes:
- Header matching is case-insensitive/normalized.
- `stay_required` supports `Yes`, `No`, blank.
- If no event attendance columns are provided, guest is assumed attending all events.

### Export
- Exports current guests with core fields and event attendance columns to CSV.

## UI Modules
- Sidebar navigation with page-based visibility from permissions.
- Guest dashboard with filters and sticky columns.
- Analytics dashboard with pie/bar charts and summary cards.
- Event manager + timeline view.
- To-Do panel.
- Import jobs panel.
- User management panel (create, edit access, reset passwords, delete).
- Stay panel (create/edit/delete stays + assign stay-required guests).

## Deployment Notes
- Runtime port uses `process.env.PORT`.
- Server startup initializes DB schema unless skipped.
- Optional env to skip migration/seed when reusing existing DB:
  - `DB_SKIP_MIGRATIONS=true`
- Build copies SQL migration into:
  - `server/dist/migrations/init.sql`

## Environment Variables
- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `DB_SSL_MODE` (`disable`, `no-verify`, `verify-full`)
- `DB_SSL_CA` (optional, escaped PEM)
- `DB_SKIP_MIGRATIONS` (`true`/`false`)

## CI/CD
GitHub Actions workflow (`.github/workflows/ci-cd.yml`) performs:
- install
- typecheck
- build
- deploy to Azure App Service (on main push, when secrets are configured)

Required GitHub secrets for Azure deploy:
- `AZURE_WEBAPP_NAME`
- `AZURE_WEBAPP_PUBLISH_PROFILE`
