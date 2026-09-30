# Auto-Contributor Dashboard

An authenticated Next.js dashboard for [Auto-Contributor](https://github.com/majiayu000/auto-contributor).
Monitor issue processing, pull requests and statistics, and manage repository blacklists
without querying the database manually. Dashboard data and mutations require administrator
access; this is an operations console, not a public demo.

[Local setup](#getting-started) · [Required environment](#environment) · [Admin access](#admin-auth-for-dashboard-access)

## Getting Started

Requires Node.js 20.9+ and npm, plus a PostgreSQL database for the dashboard APIs.

### Database TLS

Postgres connections verify TLS certificates by default. For local/dev setups that use a self-signed or unverifiable certificate, set `DATABASE_SSL_INSECURE=true` to allow `rejectUnauthorized: false`. Do not enable this in production.

`DATABASE_URL` SSL mode flags cannot disable TLS or certificate/hostname verification. URL certificate options (`sslrootcert`, `sslcert`, `sslkey`) remain supported. Only the exact value `DATABASE_SSL_INSECURE=true` disables verification; TLS remains enabled.

Run the TLS configuration regression checks with `npm test`.

Clone the repository and install the locked dependencies:

```bash
git clone https://github.com/majiayu000/auto-contributor-dashboard.git
cd auto-contributor-dashboard
npm ci
```

Configure `DATABASE_URL` and `ADMIN_API_TOKEN` in your local runtime environment
(see [Environment](#environment)), then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in using the administrator token in the blacklist panel.

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string used by the dashboard APIs |
| `ADMIN_API_TOKEN` | Yes | Shared secret that authorizes dashboard reads and blacklist mutations. When unset, protected APIs always return `401`. |

### Admin auth for dashboard access

- `GET /api/issues`, `/api/prs`, `/api/stats`, `/api/blacklist`, and blacklist mutations require either:
  - `Authorization: Bearer <ADMIN_API_TOKEN>`, or
  - a SameSite=Strict httpOnly `admin_session` cookie set by `POST /api/admin/login` with `{ "token": "<ADMIN_API_TOKEN>" }`.
- The session cookie stores an HMAC-signed, time-limited credential derived from `ADMIN_API_TOKEN` — not the root secret itself. Expired or tampered cookies are rejected.
- `GET /api/admin/login` returns `{ "authenticated": true|false }` so the UI can restore controls from a still-valid cookie after reload.
- Clear the session with `DELETE /api/admin/login`.
- The dashboard login control is in the blacklist panel. Login refreshes private data immediately; logout or an expired session clears it. The UI sends `credentials: 'same-origin'` on mutation requests.
- Surrounding whitespace on `ADMIN_API_TOKEN` is trimmed so file-sourced secrets with a trailing newline still match login/Bearer credentials.

Example:

```bash
export ADMIN_API_TOKEN='replace-with-a-long-random-secret'

# Rejected
curl -i -X POST http://localhost:3000/api/blacklist \
  -H 'Content-Type: application/json' \
  -d '{"repo":"owner/repo","reason":"test"}'

# Accepted
curl -i -X POST http://localhost:3000/api/blacklist \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -d '{"repo":"owner/repo","reason":"test"}'
```

## Development

Validation and framework references:

```bash
npm test
npm run lint
npm run build
```

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

The page declares `noindex, nofollow` because it serves an authenticated operations dashboard. This does not replace API authorization.

## Deploy on Vercel

Set the required database and administrator environment variables in your hosting configuration before deploying. The protected APIs reject unauthenticated requests.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
