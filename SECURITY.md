# Security Policy

## Supported Versions

Only the latest release on the `main` branch is actively supported with security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in this project:
1. Please **do NOT** open a public issue.
2. Email security reports privately to the repository maintainer.
3. Include detailed steps to reproduce the issue and any proof of concept.

## Security Best Practices

- Never commit `.env` files or credentials into git.
- Keep `SESSION_SECRET` private, random, and at least 32 bytes.
- Run administrator bootstrapping only on trusted networks.
- Production CORS origins should never use wildcards for authenticated routes.
