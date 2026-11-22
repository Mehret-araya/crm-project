# Contributing to MiniCRM

Thank you for contributing to MiniCRM!

## Development Requirements

- Node.js >= 24.19.0
- pnpm >= 12.21.0
- MongoDB Atlas or local MongoDB instance

## Setup Instructions

1. Clone the repository and install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```

2. Copy the environment template:
   ```bash
   cp lib/.env.example lib/.env
   ```
   Configure `DATABASE_URL` with your MongoDB connection string.

3. Start the API server:
   ```bash
   pnpm --filter @workspace/api-server dev
   ```

4. Start the frontend development server:
   ```bash
   pnpm --filter @workspace/crm dev
   ```

## Running Verification

Before submitting changes, run all checks:
```bash
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/crm test
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/crm build
```
