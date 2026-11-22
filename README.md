# MiniCRM

MiniCRM is a lead management application in a pnpm workspace. It includes a React and TypeScript web client, an Express API, MongoDB persistence, generated API schemas and clients, and a standalone UI mockup sandbox.

## Contents

- [Workspace](#workspace)
- [Features](#features)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Accounts and access](#accounts-and-access)
- [API reference](#api-reference)
- [Checks and code generation](#checks-and-code-generation)
- [Deployment](#deployment)
- [Security](#security)

## Workspace

| Path | Description |
| --- | --- |
| `artifacts/crm` | React, TypeScript, and Vite web application |
| `artifacts/api-server` | Express API for authentication, leads, dashboards, and health checks |
| `artifacts/mockup-sandbox` | Standalone UI mockup application |
| `lib/db-mongo` | Mongoose connection and MongoDB models |
| `lib/api-spec` | OpenAPI source and client generation workflow |
| `lib/api-zod` | Generated API schemas and request validation |
| `lib/api-client-react` | Generated React Query hooks and API client |
| `scripts` | Administrator bootstrap utility and backend tests |

## Features

- Dashboard statistics, lead activity, and source summaries.
- Lead creation, search, filtering, sorting, pagination, editing, and deletion.
- Account registration and JWT-based sign-in.
- Role-based lead visibility: users manage their own leads; administrators can manage all leads, including unowned legacy leads.
- MongoDB readiness checks and validated API inputs.

## Requirements

- Node.js 24 or later
- pnpm 12
- A MongoDB database accessible to the API; MongoDB Atlas is supported

Install dependencies from the repository root:

```powershell
pnpm.cmd install
```

## Local development

### 1. Configure MongoDB

The API development launcher reads `DATABASE_URL` from `lib/.env`. Create or edit this file locally and use a valid MongoDB URI. For Atlas, copy the connection string from **Cluster0 > Connect > Drivers > Node.js**, use a database user, and set the database path to `/crmdb`. Preserve Atlas query parameters and URL-encode reserved characters in the username or password when required.

Keep this file private. It is ignored by Git. Never put credentials in source code, terminal commands, screenshots, or chat. Use a development database user and allow network access only from the development environment.

### 2. Start the API

In a PowerShell window at the project root:

```powershell
pnpm.cmd --filter @workspace/api-server dev
```

The development command builds the API, loads `lib/.env`, and listens on `http://127.0.0.1:10001`. It starts accepting requests only after MongoDB connects. If no `SESSION_SECRET` is provided, the local launcher generates a random, process-only secret without printing or saving it; local login tokens become invalid when the API restarts. For stable local sessions, configure a private `SESSION_SECRET` of at least 32 bytes in `lib/.env`.

Check API and database readiness in another PowerShell window:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:10001/api/readyz"
```

A ready API returns `status: ok`. The endpoint returns an unsuccessful response when MongoDB is unavailable.

### 3. Start the web application

In a second terminal at the project root:

```powershell
pnpm.cmd --filter @workspace/crm dev
```

Vite uses port `8081` by default and may choose another available port if it is occupied. Open the URL printed by Vite. During development, requests under `/api` are proxied to `http://127.0.0.1:10001`.

## Accounts and access

Public registration creates normal-user accounts only. New users can view, create, update, and delete their own leads. Unowned leads, including leads created before ownership was introduced, are administrator-only. Administrators retain access to the full lead workspace and dashboard data.

To create the initial administrator, use the trusted bootstrap command only when the database does not already contain an administrator:

```powershell
pnpm.cmd --filter @workspace/scripts seed-admin
```

The bootstrap utility reads `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `DATABASE_URL` from `lib/.env`. It uses a MongoDB lock to prevent a second initial administrator. Normal-user registrations do not count as administrators. Do not remove the bootstrap lock while an administrator exists. This command is for initial setup, not normal registration.

## API reference

All API routes are served under `/api`. Authenticated routes use a bearer token returned by sign-in.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/healthz` | Process health |
| `GET` | `/api/readyz` | Readiness, including a MongoDB ping |
| `POST` | `/api/auth/register` | Register a normal-user account |
| `POST` | `/api/auth/login` | Sign in an administrator or normal user |
| `GET` | `/api/auth/me` | Get the current account profile |
| `GET` | `/api/leads` | Search, filter, sort, and paginate visible leads |
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads/:id` | Get a visible lead |
| `PUT` | `/api/leads/:id` | Update a visible lead |
| `DELETE` | `/api/leads/:id` | Delete a visible lead |
| `PATCH` | `/api/leads/:id/status` | Update a visible lead status |
| `GET` | `/api/dashboard/stats` | Statistics for leads visible to the account |
| `GET` | `/api/dashboard/recent` | Recent visible leads |
| `GET` | `/api/dashboard/sources` | Visible lead counts by source |

## Checks and code generation

Run the available checks from the repository root:

```powershell
pnpm.cmd --filter @workspace/api-server run typecheck
pnpm.cmd --filter @workspace/crm run typecheck
pnpm.cmd --filter @workspace/crm test
pnpm.cmd --filter @workspace/scripts test:security
pnpm.cmd --filter @workspace/scripts test:reliability
pnpm.cmd --filter @workspace/crm build
```

The OpenAPI document is the source for generated API schemas and clients. After changing it, regenerate them with:

```powershell
pnpm.cmd --filter @workspace/api-spec run codegen
```

## Deployment

`render.yaml` defines the API service's Render build, start, health-check, and environment configuration. The CRM frontend can be built with `pnpm.cmd --filter @workspace/crm build`. Production API URL configuration is supplied through `VITE_API_URL`; the Vite proxy to port `10001` is for local development only.

## Security

- Keep MongoDB credentials and `SESSION_SECRET` private and out of source control and logs.
- Production must receive a stable `SESSION_SECRET` of at least 32 bytes through its protected environment configuration. Rotating it invalidates existing JWTs.
- Passwords are hashed before storage. Registration never grants administrator privileges.
- Use the one-time admin bootstrap only for initial trusted setup; do not rerun it when an administrator already exists.
- Use development-only credentials and data for local work.
