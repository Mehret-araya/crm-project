# Deployment Guide: Render Infrastructure

This guide details the deployment of MiniCRM on [Render](https://render.com) using Infrastructure-as-Code (`render.yaml` Blueprints).

## Architecture

The project deploys as two connected services in a single Render Blueprint:

1. **`crm-project-api` (Web Service)**:
   - Node.js Express API.
   - Production port: `10000`, listening on `0.0.0.0`.
   - Health check endpoint: `/api/readyz` (verifies process health and MongoDB ping).
   - Dynamic CORS origin support with `FRONTEND_ORIGIN`.
   - Proxy trust level: `TRUST_PROXY_HOPS=1`.

2. **`crm-project-frontend` (Static Site)**:
   - React + Vite SPA hosted on Render's global CDN.
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @workspace/crm build`.
   - Publish directory: `artifacts/crm/dist/public`.
   - SPA route rewrites: `/* -> /index.html`.
   - Automatically links to the backend via `VITE_API_URL` using Render Blueprint service references.

## Environment Variables

### Backend (`crm-project-api`)

| Name | Source | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `render.yaml` | Set to `production`. |
| `NODE_VERSION` | `render.yaml` | Pinned to `24.19.0`. |
| `PORT` | `render.yaml` | `10000`. |
| `TRUST_PROXY_HOPS` | `render.yaml` | `1` (Express trust proxy configuration). |
| `SESSION_SECRET` | Render Blueprint | Automatically generated 256-bit secure secret. |
| `FRONTEND_ORIGIN` | `render.yaml` | Default origin `https://crm-project-frontend.onrender.com`. |
| `DATABASE_URL` | Render Dashboard | **Required manual input**: MongoDB Atlas connection URI. |

### Frontend (`crm-project-frontend`)

| Name | Source | Description |
| :--- | :--- | :--- |
| `NODE_VERSION` | `render.yaml` | Pinned to `24.19.0`. |
| `BASE_PATH` | `render.yaml` | Set to `/`. |
| `VITE_API_URL` | Render Blueprint | Dynamically injected from API `RENDER_EXTERNAL_URL`. |

## Deployment Steps

1. In the **Render Dashboard**, click **New + > Blueprint**.
2. Select repository `Mehret-araya/crm-project` and branch `main`.
3. When prompted, enter your MongoDB Atlas connection string for `DATABASE_URL`.
4. Ensure MongoDB Atlas **Network Access** allows `0.0.0.0/0` (Anywhere).
5. Click **Apply**.
