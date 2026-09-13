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
| `ADMIN_API_TOKEN` | Yes for writes | Shared secret that authorizes blacklist mutations. When unset, `POST`/`DELETE` `/api/blacklist` always return `401`. |

### Admin auth for blacklist mutations

- `GET /api/blacklist` remains public (read-only).
- `POST /api/blacklist` and `DELETE /api/blacklist` require either:
  - `Authorization: Bearer <ADMIN_API_TOKEN>`, or
  - a SameSite=Strict httpOnly `admin_session` cookie set by `POST /api/admin/login` with `{ "token": "<ADMIN_API_TOKEN>" }`.
- Clear the session with `DELETE /api/admin/login`.
- The dashboard blacklist UI logs in via that endpoint and sends `credentials: 'same-origin'` on mutation requests.

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
