# Tysonpe — Core Commerce (Sub-project 1)

Tysonpe is a creator-commerce platform modelled on the Tagmango product suite (India-first: INR, UPI, GST). Own brand, own code; no Tagmango name, logo, copy, or assets.

## Suite decomposition (each is its own spec → plan → build)

1. **Core commerce** (this spec)
2. Content: course builder, drip, quizzes, certificates, DRM video
3. Community: feed, channels, gamification
4. Growth: affiliates, funnels, abandoned cart, email/WhatsApp automations
5. Live: Zoom, live upsell, 1:1 bookings
6. Platform: site builder, custom domains, plan billing, team roles
7. AI assistant, native apps

## Scope of sub-project 1

Roles: **creator** and **learner** (one account can be either; a creator account is a user with a Creator profile).

| Area | Behaviour |
|---|---|
| Auth | Email + password, bcrypt, JWT session in httpOnly cookie, signup as learner or creator |
| Creator profile | Handle (`/@handle`-style public URL at `/c/{handle}`), display name, bio, brand colour |
| Products | Types: course, membership, webinar, download, consultation. CRUD (create, edit, publish/unpublish, delete-if-no-orders). Price in INR, GST-inclusive, one-time or monthly label |
| Content items | Minimal lesson list per product (video URL, PDF URL, text, link) so the learner library has something to open. Full builder is sub-project 2 |
| Storefront | `/c/{handle}` lists published products; `/c/{handle}/{slug}` product page with buy button |
| Coupons | Per-creator code, percent or flat off, max redemptions, expiry, active flag. Full CRUD |
| Checkout | Coupon apply, price breakdown (subtotal, discount, GST component, total), pay |
| Payments | `PaymentProvider` interface. `RazorpayProvider` (test keys) and `MockProvider` (no keys needed; local simulate-pay page). Selected by env. Signature verified server-side, webhook idempotent |
| Orders | created → paid / failed → refunded (status change only, no gateway refund call in v1) |
| Enrollment | Created on verified payment, idempotent, unique per (user, product) |
| Learner library | `/library` lists enrolled products; `/library/{productId}` shows content items |
| Creator dashboard | Overview (revenue, orders, learners), products, coupons, orders (with refund mark), learners, payouts ledger |
| Invoice | Per-order invoice page with GST breakdown (HTML, printable) |
| Payout ledger | Per order: gross, platform fee (plan rate, default Basic 10%), gateway fee (2%), net. Read-only ledger; no money movement |

Out of scope: real money, KYC, bank payouts, email/WhatsApp, native apps, file hosting (URLs only), DRM.

## Architecture

Next.js 16 App Router + TypeScript + Tailwind 4. Prisma 7 with SQLite for dev through the better-sqlite3 adapter; schema uses string statuses and integer paise so it ports to Postgres by swapping provider + adapter.

```
src/
  app/                 routes (marketing, auth, c/[handle], checkout, library, dashboard, api/webhooks)
  lib/
    db.ts              Prisma client singleton
    auth/              password hashing, session JWT, getSession/requireUser
    money.ts           paise helpers, GST split, coupon maths (pure, unit-tested)
    payments/          provider interface, razorpay, mock, signature verify
    orders.ts          createOrder, markOrderPaid (idempotent), refundOrder
  components/          UI
prisma/schema.prisma, seed.ts
```

Boundaries: `money.ts` and `payments/signature` are pure and tested. Route handlers and server actions stay thin and call `orders.ts`. All writes check ownership (creator may only touch own products/coupons/orders).

## Data model

User, Creator, Product, ContentItem, Coupon, Order, Enrollment, LedgerEntry, WebhookEvent. Money is integer paise. Order stores the computed breakdown so later price edits never change history.

## Security

- Passwords bcrypt cost 12; session cookie httpOnly, sameSite=lax, secure in production; `SESSION_SECRET` required (≥32 chars) outside dev.
- Zod validation on every server action input.
- Payment success is only trusted after signature verification (checkout callback) or verified webhook; client "success" is never trusted.
- Webhook events deduplicated by event id.
- Ownership checks on every creator mutation; learner content only via enrollment.
- Mock provider is refused when `NODE_ENV=production`.

## Testing

Vitest: money/coupon/GST maths, signature verification, markOrderPaid idempotency and enrollment, ownership checks, mock provider refusal in production. Manual browser run of the full loop (signup creator → product → coupon → learner buys → library → invoice → creator sees revenue).

## Success criteria

A creator can publish a product, a learner can buy it through the (mock or Razorpay-test) checkout with a coupon, get access in their library, and the creator sees the order, invoice, and ledger entry. Re-delivering the same payment/webhook never duplicates an order, enrollment, or ledger entry.
