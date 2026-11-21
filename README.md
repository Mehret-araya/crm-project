# MiniCRM

MiniCRM is a pnpm workspace for a lead management application. It includes a React frontend, an Express API, MongoDB persistence, generated API clients and schemas, and a separate mockup sandbox.

## Workspace

| Path | Purpose |
| --- | --- |
| `artifacts/crm` | React, TypeScript, and Vite CRM frontend |
| `artifacts/api-server` | Express API for authentication, leads, dashboard data, and health checks |
| `artifacts/mockup-sandbox` | Standalone UI mockup application |
| `lib/db-mongo` | Mongoose connection and MongoDB models used by the API |
| `lib/api-spec` | OpenAPI source and API client generation workflow |
| `lib/api-zod` | Generated API schemas and request validation |
| `lib/api-client-react` | Generated React Query hooks and API client |
| `scripts` | Admin bootstrap utility and backend test commands |

## Requirements

- Node.js 24
- pnpm
- A MongoDB database reachable from the API process (local MongoDB or MongoDB Atlas)

Install workspace dependencies from the repository root:

```sh
pnpm install
```

## Local development

The API requires `DATABASE_URL`, `SESSION_SECRET`, and `PORT` in its process environment. `DATABASE_URL` must use a MongoDB URI (`mongodb://` or `mongodb+srv://`). `SESSION_SECRET` must be a private value of at least 32 bytes. The API does not load a `.env` file automatically; configure these values in your terminal environment or IDE run configuration. Never commit credentials or place production credentials in a local development environment.

For a local API process, use port `10000`, which is also the target configured by the Vite development proxy. Configure the required environment variables in the API terminal, then build and start the API:

```sh
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

In a second terminal, start the CRM frontend:

```sh
pnpm --filter @workspace/crm dev
```

Vite defaults to port `8081` and may select another available port if that port is occupied. In development, requests under `/api` are proxied to `http://127.0.0.1:10000`. Start the API before using authenticated CRM pages.

The repository does not include a Docker Compose setup or a bundled local MongoDB server. MongoDB Atlas is supported: its `mongodb+srv://` URI is accepted by the connection layer. Create a development-only database user, restrict network access to your development environment, and keep the URI private.

## Initial administrator

There are no demo credentials or public admin-seed endpoint. The initial administrator is created through the one-time bootstrap script:

```sh
pnpm --filter @workspace/scripts seed-admin
```

The script reads `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `DATABASE_URL` from the ignored `lib/.env` file. Bootstrap requires an empty admin collection and uses a MongoDB lock to prevent a second initial administrator. Do not remove the lock while an administrator exists. The API process separately needs `DATABASE_URL` and `SESSION_SECRET` in its own environment.

## Useful commands

```sh
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/crm build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/crm run typecheck
pnpm --filter @workspace/scripts test:security
pnpm --filter @workspace/scripts test:reliability
pnpm --filter @workspace/api-spec run codegen
```

The API build and start are separate commands so the API environment can be configured explicitly. The API starts listening only after MongoDB connects successfully.

## API overview

All application routes are served under `/api`. Authenticated routes require a bearer token obtained from login.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/healthz` | Process health |
| `GET` | `/api/readyz` | Readiness, including MongoDB connectivity |
| `POST` | `/api/auth/login` | Authenticate an administrator |
| `GET` | `/api/auth/me` | Current administrator profile |
| `GET` | `/api/leads` | Search, filter, sort, and paginate leads |
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads/:id` | Get a lead |
| `PUT` | `/api/leads/:id` | Update a lead |
| `DELETE` | `/api/leads/:id` | Delete a lead |
| `PATCH` | `/api/leads/:id/status` | Update lead status |
| `GET` | `/api/dashboard/stats` | Dashboard statistics |
| `GET` | `/api/dashboard/recent` | Recent leads |
| `GET` | `/api/dashboard/sources` | Lead counts by source |

## Deployment

`render.yaml` defines the Render API service, including its build and start commands, health check, and required environment configuration. The frontend can be built with `pnpm --filter @workspace/crm build`. Production API URL configuration is supplied separately through `VITE_API_URL`; the Vite development proxy applies only to the development server.

## Security notes

- Keep database credentials and `SESSION_SECRET` out of source control and logs.
- Use a unique, private session secret of at least 32 bytes. Rotating it invalidates existing JWTs.
- Admin bootstrap is intended for the initial trusted setup only.
- Do not use production credentials or production data for local development.
