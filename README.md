This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
