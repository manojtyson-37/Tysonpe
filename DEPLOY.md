# Deploying the Tysonpe demo (Vercel + Postgres)

Local dev and tests run on SQLite (`prisma/schema.prisma`, the single source of truth). Hosted deployments run on
Postgres: `prisma/postgres/schema.prisma` is generated from it (`npm run db:sync-pg`; a test fails if it is stale).
`DATABASE_URL` picks the dialect: `postgresql://...` uses Postgres schema, migrations and adapter, `file:...` SQLite.

## Environment variables (Vercel project)

| Variable | Demo project | Live project |
| :-- | :-- | :-- |
| `DATABASE_URL` | Postgres URL (Neon via Vercel Marketplace sets it, plus `DATABASE_URL_UNPOOLED`, used for migrations) | Postgres URL |
| `SESSION_SECRET` | random, 32+ chars | random, 32+ chars, never reused |
| `NEXT_PUBLIC_APP_URL` | the demo URL | the live URL |
| `DEMO_DEPLOYMENT` | `1` | **unset** |
| `PAYMENTS_MODE` | `demo` | unset |
| `NEXT_PUBLIC_DEMO_HANDLE` | `asha-rao` | unset |
| `DEMO_PASSWORD` | optional override of the seeded demo accounts' password | unset |
| `RAZORPAY_*` / `EASEBUZZ_*` | unset | live keys, `EASEBUZZ_ENV=prod` |

`DEMO_DEPLOYMENT=1` is the only way simulated payments run in production (and it is ignored, with an error logged, if live
Razorpay keys or `EASEBUZZ_ENV=prod` are set): anyone could otherwise mark their own
order paid. It also shows the one-click demo logins. Never set it on the live project.

## First deploy

1. `vercel link`, then provision Postgres (Vercel dashboard: Storage, Neon). It injects `DATABASE_URL`.
2. Set the variables above. Build command is `npm run vercel-build` (`prisma migrate deploy && next build`). Migrations use `DATABASE_URL_UNPOOLED` when present
   (a pooler can hang migrate's advisory lock); the app uses the pooled `DATABASE_URL`.
3. Seed the demo data once, from your machine, against the hosted DB (generate the Postgres client first; the seed
   refuses a hosted DB unless `DEMO_DEPLOYMENT=1`):
   ```bash
   export DATABASE_URL="<postgres url>" DEMO_DEPLOYMENT=1
   npx prisma generate && npm run db:seed
   unset DATABASE_URL DEMO_DEPLOYMENT && npx prisma generate   # back to local SQLite
   ```
4. `vercel --prod`.

## Before going live

Use a separate Vercel project and a separate database. Do not seed it. Add Razorpay/Easebuzz live keys and webhook
secrets, a real `SESSION_SECRET`, and confirm `DEMO_DEPLOYMENT` is unset.

## Running the tests on Postgres

The Prisma client is generated per dialect, so generate the Postgres client first, then switch back:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/throwaway"
npx prisma generate
TEST_DATABASE_URL="$DATABASE_URL" npx vitest run   # drops and recreates the public schema; refuses non-local hosts unless TEST_DB_WIPE_OK=1
unset DATABASE_URL && npx prisma generate
```

SQLite hides concurrency races (one writer at a time); Postgres exposes them. The suite caught a duplicate-order race
in checkout this way, now serialized with an advisory lock (`lockKey` in `src/lib/db.ts`).
