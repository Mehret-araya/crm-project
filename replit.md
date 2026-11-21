# Lead Management CRM (MiniCRM)

## Overview

A production-ready full-stack Client Lead Management System (Mini CRM) with JWT authentication, complete CRUD for leads, and a modern React frontend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, framer-motion
- **API framework**: Express 5
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken + bcryptjs)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Brand Colors

- **Primary**: Orange (#F97316)
- **Background/Sidebar**: Black/Dark gray
- **Status badges**: New → Blue, Contacted → Orange, Converted → Green

## Secure local configuration

The API requires `DATABASE_URL` and `SESSION_SECRET`. Set `SESSION_SECRET` to a private random value of at least 32 bytes; the API refuses to start if it is missing or too short. For example, generate one locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"` and store it only in your local ignored environment file or deployment secret manager. Never commit credentials or print them in logs. Rotating `SESSION_SECRET` invalidates existing login tokens.

Create the first admin only from a trusted environment with `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` set, then run `pnpm --filter @workspace/scripts seed-admin`. There are no default credentials or public admin-seed endpoint. Bootstrap is one-time: it requires that no administrator account exists and atomically claims a lock in the MongoDB counters collection. Normal user registrations do not prevent initial admin bootstrap. If the process stops after claiming the lock, inspect the account and counter collections before retrying. Do not delete that lock while an admin exists.

Public registration at `POST /api/auth/register` creates only normal-user accounts. Each normal user can access only leads they create; legacy leads without an owner remain administrator-only. Existing administrator accounts retain access to all leads.

The `seed-admin` command loads `lib/.env` (which is ignored by Git) for local bootstrap values. The API server itself reads environment variables from its process, so supply `DATABASE_URL` and `SESSION_SECRET` through your shell, IDE run configuration, or deployment environment when starting it. Use unique local credentials and do not reuse production secrets.

The API attempts one MongoDB connection during startup, with a 10-second server-selection timeout. It starts listening only after MongoDB connects; otherwise it logs a sanitized startup failure and exits with a nonzero status so the operator or hosting platform can restart it. `GET /api/healthz` reports that the process is responding, while `GET /api/readyz` returns success only when MongoDB is connected. Render uses `/api/readyz` as its deployment health check.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts test:reliability` — run backend reliability tests

## Architecture

```
artifacts/
  crm/           # React + Vite frontend (serves at /)
  api-server/    # Express API (serves at /api)
lib/
  db/            # Drizzle ORM + PostgreSQL schemas (leads, admins)
  api-spec/      # OpenAPI YAML + Orval codegen config
  api-zod/       # Generated Zod schemas (server-side validation)
  api-client-react/ # Generated React Query hooks (frontend)
```

## Features

- JWT authentication with protected routes
- Lead CRUD (create, read, update, delete)
- Lead status management (New / Contacted / Converted)
- Dashboard with stats, recent leads, source breakdown chart
- Search, filter by status, sort by date
- Table and card view toggle
- Dark/light mode toggle
- Responsive sidebar navigation
- Toast notifications
- Empty states
- Pagination

## API Endpoints

- `GET /api/healthz` — API process health (does not check MongoDB)
- `GET /api/readyz` — MongoDB readiness
- `POST /api/auth/login` — Login with email/password
- `GET /api/auth/me` — Get current user (auth required)
- `GET /api/leads` — List leads (search, filter, sort, paginate)
- `POST /api/leads` — Create lead
- `GET /api/leads/:id` — Get lead
- `PUT /api/leads/:id` — Update lead
- `DELETE /api/leads/:id` — Delete lead
- `PATCH /api/leads/:id/status` — Update lead status
- `GET /api/dashboard/stats` — Dashboard statistics
- `GET /api/dashboard/recent` — Recent leads
- `GET /api/dashboard/sources` — Lead source breakdown
