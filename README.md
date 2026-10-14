# Tysonpe

Creator-commerce platform for India, modelled on the Tagmango product suite. Creators open a storefront and sell courses, memberships, webinars, downloads and consultations; learners pay by UPI/cards and get instant access. Own brand and code; nothing is copied from Tagmango.

**Status: sub-project 1 of 7 (core commerce).** See `docs/superpowers/specs/` for the design and the full suite decomposition.

## What works today

| Area | Details |
|---|---|
| Auth | Email + password (bcrypt), signed httpOnly session cookie, login rate limiting, learner or creator signup |
| Storefront | `/c/{handle}` and `/c/{handle}/{slug}` with per-creator brand colour |
| Products | 5 types, draft/publish, GST-inclusive INR pricing, lesson list (video, PDF, text, link) with reorder and edit |
| Checkout | Coupons (percent/flat, expiry, usage cap), GST breakdown, free and 100%-off orders |
| Payments | Razorpay (test mode) or a built-in mock gateway; signature-verified callback and idempotent webhook |
| Learner | Library, YouTube/Vimeo playback, printable GST invoice |
| Creator | Overview + 14-day revenue, orders (with refund marking), learners, coupons CRUD, payout ledger, store settings |

## Run it

```bash
npm install
cp .env.example .env        # set SESSION_SECRET (>= 32 chars outside dev)
npx prisma migrate deploy
npm run db:seed             # demo creator /c/asha-rao + demo learner (see prisma/seed.ts)
npm run dev -- -p 3100
```

Tests and checks:

```bash
npm test          # vitest: money, signatures, orders (real SQLite), auth, validation
npm run typecheck
npm run build
```

## Payments

- **No keys set**: a mock provider runs the whole loop locally ("Simulate successful/failed payment"). It uses the same HMAC verification path as Razorpay and **refuses to start when `NODE_ENV=production`**.
- **Razorpay test mode**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in `.env`. In the Razorpay dashboard add a webhook to `https://<your-host>/api/webhooks/razorpay` for `payment.captured`, `order.paid` and `payment.failed`.
- Payment success is never trusted from the browser: the callback signature is verified server-side, and webhooks are deduplicated by event id.
- Money is stored as integer paise. Prices are GST-inclusive; the invoice shows the GST component.

No real money moves in this version. Going live needs Razorpay KYC/live keys and a separate review.

## Layout

```
src/lib/money.ts          pure price, coupon, GST and fee maths
src/lib/orders.ts         createCheckoutOrder, markOrderPaid (idempotent), confirmPayment, handleWebhook, refundOrder
src/lib/payments/         provider interface, Razorpay, mock, HMAC verification
src/lib/auth/             session token, rate limiter, current-user helpers
src/app/actions/          server actions (auth, creator CRUD, checkout)
prisma/schema.prisma      SQLite for dev; string statuses + integer paise keep it Postgres-portable
```

## Moving to Postgres

Change the datasource provider in `prisma/schema.prisma`, swap `@prisma/adapter-better-sqlite3` for `@prisma/adapter-pg` in `src/lib/db.ts`, regenerate migrations, and point `DATABASE_URL` at your database. The login limiter is per-process; use a shared store (Redis) when running more than one instance.

## Roadmap

Course builder with drip and quizzes, community and gamification, affiliates and funnels, email/WhatsApp automations, live sessions via Zoom, site builder and custom domains, plan billing, AI assistant, native apps.
