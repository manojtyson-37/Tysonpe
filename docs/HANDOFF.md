# Tysonpe — Handoff (start here in a new session)

Last updated: 2026-10-18 (section 0: UI rebuild); sections 1 to 10 last updated 2026-10-16, after finishing sub-project 3 (community + gamification).
Everything below was verified against the repo at commit `4c8451a` (this handoff is committed on top of it) unless marked **(proposed)**.

## 0. UI rebuild (branch `ui/rebuild`): read this first if you are continuing the redesign

Verified 2026-10-18 at `ui/rebuild` commit `82ac431` (pushed to `origin/ui/rebuild`). Sections 1 to 10 below describe `main` at the end of sub-project 3 and are otherwise unchanged.

**What it is.** A full UI rebuild of Tysonpe on its own branch and worktree (`/Users/manojaaa/Tysonpe- Sandbox/ui-rebuild`, quote the path): design tokens and primitives (`src/components/ui/*`), public shell, console shell, storefront, product page, library and course player, certificate, checkout and pay pages, creator console (products, quiz editor, orders, learners, coupons, payouts, community admin, settings), community, landing page with a live computed ledger, gateway playground (`/demo`), simulated Razorpay and Easebuzz replicas on isolated skins, auth forms, metadata and favicon. Design rules live in `DESIGN.md` and `CLAUDE.md`; research in `docs/design-research/A-E`; spec `docs/superpowers/specs/2026-10-15-tysonpe-ui-rebuild-design.md`; plan `docs/superpowers/plans/2026-10-15-tysonpe-ui-rebuild.md` (32 tasks); step-by-step history in `docs/superpowers/handoff/ui-rebuild-log.md`.

**Status.** Plan Tasks 1 to 31 are done, reviewed (code-reviewer plus an isolated test-engineer mutation pass per task), browser-verified and pushed. Task 32 (audit) ran in part: anti-pattern census, `next build`, `next start` smoke test and an all-routes responsive walk are done; the final whole-branch review and `/design-review` have **not** been run (they should follow the merge decision below, not precede it).

**Numbers (SQLite, this branch).** `npm test`: 149 files, 3237 passed, 1 skipped. `npm run typecheck` and `npm run lint`: clean. `npm run build`: succeeds, 35 route lines. `next start` smoke: public routes 200, gated routes 307, `/favicon.ico` 404 on purpose (the favicon is `src/app/icon.svg`). The sections below that say 541 tests describe `main`, not this branch.

**Not verified (do not assume).** A Postgres run of this branch; the community thread page in a browser (the local `prisma/dev.db` lacks the `comment_edited_at` and `reserve_community_slug` migrations, so the page falls into its error boundary: run `cd "/Users/manojaaa/Tysonpe- Sandbox/ui-rebuild" && npx prisma migrate deploy` yourself, then look at `/c/asha-rao/community/general/p/<postId>`); a screen-reader pass; a real touch device (touch targets were measured with pointer-coarse emulation only); production (https://tysonpe.vercel.app still serves the old build).

### DECISION NEEDED: `origin/main` has moved on without this branch

`origin/main` (`a4fd63f`) is 10 commits and 73 files (+9,945 / -420 lines) ahead of the merge base `c098ca7`, from another worker, and `ui/rebuild` is 108 commits ahead of it. A dry-run merge (`git merge-tree --write-tree origin/main ui/rebuild`) conflicts in 17 files: `(site)/c/[handle]/page.tsx`, `(site)/c/[handle]/[slug]/page.tsx`, `(site)/checkout/pay/[orderId]/page.tsx`, `(site)/checkout/success/[orderId]/page.tsx`, `(site)/signup/page.tsx`, `dashboard/(console)/layout.tsx`, `.../orders/page.tsx`, `.../payouts/page.tsx`, `.../settings/page.tsx`, `src/components/{DashNav,DemoPayPageClient,RazorpayDemoModal,SignupForm,form,gateway-icons,ui}.tsx`, plus a modify/delete conflict on `dashboard/(console)/page.tsx` (this branch moved the overview to `(overview)/page.tsx`).

What `main` gained (from its commit subjects and diffstat, not reviewed by this session): a Storefront Studio editor and storefront sections (`src/components/storefront/*`, `src/lib/storefront.ts`), a console overview redesign, creator UPI settlement settings with dynamic UPI QR checkout, UPI UTR verification, a creator bank-verification flow, a 1-rupee test course, a WhatsApp CRM (`src/components/crm/*`, `src/lib/whatsapp/*`, `src/app/actions/crm.ts`, 3 new migrations in `prisma/migrations` and `prisma/postgres/migrations`), and dashboard performance work. Several of these are payment paths and need their own security review before anything ships. `main`'s `SignupForm.tsx` is the Antigravity rewrite that this branch audited and replaced (six defects: field errors never rendered, controlled radios desynced after a failed submit, handle slugified on every keystroke, duplicate h1, invented trust claims, pre-filled taken handle); it must not win the merge. None of the new `main`-only screens (Storefront Studio, CRM, checkout status page) are in the rebuilt design.

Options: **A (recommended)**: merge `origin/main` into `ui/rebuild` in a task of its own, resolving conflicts toward this branch's design and `main`'s logic, with a review of the payment and migration changes, re-run every gate, then restyle the main-only screens in follow-up tasks; **B**: stop the rebuild and cherry-pick selected pieces onto `main`; **C**: ship `main` unchanged. The merge is the user's call because it combines two designs of the same screens and touches money paths.

**Update 2026-10-19 (merge analysis, `.superpowers/sdd/merge-analysis.md` is local scratch):** `origin/main` is now `15cbc19`: 17 commits, 110 files, +19,100 lines ahead of the merge base; the dry-run merge conflicts in 20 paths (19 content + the `dashboard/(console)/page.tsx` modify/delete). Security findings in `main` (not in this branch; confirmed with `git grep`/`git show` on `origin/main`): Jodo API credentials are hard-coded as source fallbacks in `src/lib/payments/jodo.ts` (rotate them); rendering `/c/asha-rao` writes the creator's payout UPI id and phone and upserts a published 1-rupee product on a GET; the inbound-webhook token lookup accepts a creator handle with no secret; a personal UPI id is hard-coded in six files; the Razorpay "simulation" on `main` renders a payable QR. The analysis also lists tracking-pixel stored XSS and several P1s. Do not push or deploy `origin/main` as it stands. The recommended path (merge on a new branch, fix the P0/P1 items, security-review, then restyle the main-only screens) needs the owner's answers to decisions D1 to D13 in the analysis first (real-money direct UPI, Storefront Studio, Jodo, inbound webhooks, WhatsApp CRM, personal VPA removal).

### Resume the rebuild

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/ui-rebuild"       # worktree; never run git commands that move HEAD in the main checkout
git branch --show-current                              # ui/rebuild
git status --short && git log --oneline -5
npm test                                               # 149 files, 3237 passed, 1 skipped
npm run typecheck && npm run lint
# dev server: preview_start {name:"ui-rebuild"} (.claude/launch.json, port 3200); stop it and `rm -rf .next` before `npm run build`
```

Demo logins on localhost are the one-click buttons on `/login` (Asha creator, Ravi learner). In the local `dev.db` the learner also has a leftover creator profile (`test1`), so his login lands on `/dashboard`. Before every push: `gh auth switch -u manojtyson-37` (the active account resets to `kbdcreditsolutions` and the push 403s).

Work was run as subagent-driven development: brief to a file, one engineer per worktree, then the controller gates (`npm test`, `npm run typecheck`, `npm run lint`) and verifies in a real browser, then a read-only code-reviewer and an isolated test-engineer (`git archive` copy, single-edit mutants), then one fix wave. Local scratch (`.superpowers/sdd/`: briefs, reports, ledger `progress.md`, diffs) is git-excluded and per clone.

### Deploy facts (unchanged)

The Vercel project `tysonpe` (team `kbdcreditsolutions`) has no Git connection and Preview env lacks `SESSION_SECRET`, `DEMO_DEPLOYMENT`, `PAYMENTS_MODE`, `NEXT_PUBLIC_DEMO_HANDLE`; the user runs `vercel env add ... preview` and connects GitHub as `manojtyson-37` in the dashboard. `cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe" && vercel --prod --yes` deploys `main`, which lacks this rebuild. The tooling refused these commands for the assistant, so they are the user's to run.

### Open design and product items on this branch

Carried from the ledger and not re-verified in this last pass unless marked: `Creator.brandColor` schema default is violet `#6d28d9` (needs `prisma/` and `src/lib/auth.ts`, left alone); `.btn-primary` takes the creator colour with no contrast guard (a `--brand-fill` token is recommended); "Payments run in test mode" is hard-coded copy; the invoice is titled "Tax invoice" without a GSTIN; `RazorpayButton` stays disabled if confirm throws; `money.ts` comment vs the fees table (the table does not net the monthly fee); a server-side `brandColor` rejection shows nothing; `HEX6` is duplicated in `form.tsx`; focus falls to `<body>` after a confirmed delete; the storefront list shows "₹499 / month" with a caveat; the gateway chooser keeps the user's pick if a save fails while "Current" shows the old choice; the sandbox check (`simulatedPaymentsAllowed() && provider is mock`) is duplicated in `/demo` and `actions/checkout.ts` (one `demoSandboxActive()` helper would stop drift); the "Full demo" links stay visible on live deployments where `/demo` says it is demo-only; `.btn-sm` is drawn 32px with a 44px hit area. Decisions made on the way that the owner should know: the Easebuzz replica is now a light page (it was dark); the Razorpay modal also closes on a backdrop click when not processing; "256-bit SSL", "PCI-DSS" and "bank-grade" copy was removed; `favicon.ico` was replaced by `icon.svg`; the Antigravity `SignupForm` edits were kept at the owner's request, audited, and rewritten in Task 29.

## 1. State in one paragraph

Tysonpe is a creator-commerce platform for India (a TagMango/Graphy-style product with its own brand): storefronts, UPI/card checkout (test mode), GST invoices, course LMS, payout ledger, and now a community with gamification. Sub-projects **1, 2 and 3 of 7 are built**. Sub-project 3 lives on local `main` (commits `2c540ab^..4c8451a`) and is **not pushed**; `origin/main` is at `662ff47`. 541 tests pass on SQLite and 542 on a real Postgres. The next work is the user's call: push/deploy decision first, then sub-project 4 (growth).

## 2. Resume in five minutes

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe"        # note the space in the path: always quote it
git branch --show-current                            # must be `main` (see section 7, shared checkout)
git status --short && git log --oneline -5
npm test                                             # expect 34 files, 541 passed, 1 skipped
npm run typecheck && npm run lint
npm run dev                                          # port 3100 (3000 is the CSO dashboard)
```

Demo logins (local only, shown as one-click buttons on `/login` when `NODE_ENV` is not production): creator `asha@demo.tysonpe.test` (Asha Rao, `/c/asha-rao`) and learner `learner@demo.tysonpe.test` (Ravi Kumar). The password is `process.env.DEMO_PASSWORD || <constant>` in `prisma/seed.ts` and `src/lib/demo.ts`.

Dev database (`prisma/dev.db`, git-ignored) already has all 10 migrations applied and leftover test data from the browser walkthrough: extra channels (General, Masterclass Q&A, VIP Circle), 2 posts and 1 comment, a throwaway learner `stranger<timestamp>@demo.tysonpe.test`, assorted older test accounts (`demo-*`, `meera.test@example.test`, a second creator `test1`) and gamification switched on. Safe to keep or reset. `npm run db:seed` is idempotent; the seed's community block only runs when the creator has **no** channels, so a dev DB that already has `General` will not get the seeded demo posts.

Cold-start checklist for a fresh clone or a new machine:
- `.env` is git-ignored: copy `.env.example` and set at least `DATABASE_URL=file:./dev.db`, `SESSION_SECRET` (32+ chars) and `PAYMENTS_MODE=mock`. Never print or commit it.
- Before `npm test`, `npm run dev` or `npm run db:seed` run `echo "$DATABASE_URL"`: it must be empty or a `file:` URL. A leftover Postgres URL or a Postgres-generated Prisma client (`npx prisma generate` against the Postgres schema) breaks SQLite work or points at a hosted DB. Fix: `unset DATABASE_URL && npx prisma generate`.
- `AGENTS.md` carries a Next.js rule: this is not the Next.js you know; read `node_modules/next/dist/docs/` before writing framework code.

## 3. Roadmap and status

| # | Sub-project | Status | Where |
|---|---|---|---|
| 1 | Core commerce (products, checkout, orders, GST invoices, coupons, ledger, auth) | done, pushed | commit `3de1e29`, spec `docs/superpowers/specs/2026-10-15-tysonpe-core-commerce-design.md` |
| 2 | Content (sections, lessons, drip, quizzes, progress, certificates) | done, pushed | `da8d77d`, spec `…-content-design.md` |
| (side work by another worker) | Landing page redesign, gateway simulation (Razorpay modal + Easebuzz hosted replica), Postgres dual-dialect support, Vercel demo deploy | done, pushed (demo live at tysonpe.vercel.app) | commits between `da8d77d` and `662ff47` that are not community work (`ec58c21` … `662ff47`); see `DEPLOY.md` |
| 3 | **Community + gamification** | **done, NOT pushed** | `2c540ab^..4c8451a` (39 commits), spec `…-community-design.md`, plan `docs/superpowers/plans/2026-10-15-tysonpe-community.md`, full log `docs/superpowers/handoff/sub-project-3-log.md` |
| (other worker, pending) | **UI rebuild**: branch `ui/rebuild` in the sibling worktree `ui-rebuild`, branched from `41c3dc2`, ~9 commits plus uncommitted edits; rewrites `DESIGN.md`, `src/app/globals.css`, UI primitives (`src/components/ui/*`) and `src/lib/money.ts` | not merged | **Will conflict** with community waves 2-4 when merged (`globals.css` got `--brand-ring`/`--brand-text`; `BrandScope`, the community components, `src/lib/color.ts`). Whoever merges must keep the contrast-safe brand variables and re-check the community UI at 375px and with a light brand colour |
| 4 | Growth: affiliates, funnels, abandoned cart, email/WhatsApp | not started | see section 9 |
| 5 | Live: Zoom, bookings | not started | |
| 6 | Platform: site builder, domains, plan billing, team roles | not started | |
| 7 | AI + native apps | not started | |

Each sub-project goes: brainstorm → spec (committed) → plan (reviewed) → subagent-driven build with per-task review → whole-branch/security/UI review → controller browser verification → final gate → memory + handoff update.

## 4. Product reference (why these features)

Research done 2026-10-15 (pricing pages of TagMango, Graphy; Edmingle's page had no usable numbers):

- TagMango: Basic 0 + 10% fee (200 students); Pro ₹5,000/mo + 5.5%; Advanced ₹15,000/mo + 3.5% (community, gamification, DRM, affiliates, checkout upsell, Zoom webinars of 500 gated here); Ultimate ₹30,000/mo + 0% (AI stack). Custom domain ₹24,999/yr; branded apps ₹74,999 one-time.
- Graphy: Launch ₹24,999/yr + 10%; Grow ₹49,999/yr + 7.5%; Rise ₹99,999/yr + 5%; custom domain, DRM, affiliates, certificates on all plans.
- **Tysonpe's stance:** ship the features TagMango gates behind its ₹15k/mo tier to every creator, and win on a lower per-sale fee. What exists today: a per-plan fee table in `src/lib/money.ts` (`basic` 10% platform + 2% gateway, `pro` 5.5% + 2%, `advanced` 3.5% + 2%, `ultimate` 0% + 1.5%) that mirrors TagMango's tiers, applied to the ledger when an order is paid (`src/lib/orders.ts`, via `Creator.planKey`, default `basic`). What does **not** exist: charging for a plan (billing), an upgrade/downgrade flow, or any feature gating by plan (community and gamification are deliberately ungated). Decide whether Tysonpe keeps TagMango-like tiers or the "low fee for everyone" model before building billing. Do not invent competitor numbers in UI copy (`CLAUDE.md` copy-honesty rule).

## 5. Architecture map

Stack: Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind v4, Prisma 7 with **two dialects** (SQLite locally and in tests, Postgres hosted), Zod 4, Vitest 5.

```
prisma/schema.prisma            SQLite schema = single source of truth
prisma/postgres/schema.prisma   GENERATED by `npm run db:sync-pg` (never edit by hand; a test fails if stale)
prisma/migrations/              SQLite migrations (hand-written SQL; `prisma migrate dev` refuses non-interactive shells)
prisma/postgres/migrations/     Postgres migrations (generate with `prisma migrate diff --from-schema <old> --to-schema prisma/postgres/schema.prisma --script`)
src/lib/                        domain logic, framework-free where possible
  orders.ts, payments/          checkout, webhooks, refunds (refundOrder deletes the Enrollment row)
  learning/                     course outline, drip, quizzes, progress, certificates
  community/                    access.ts (pure), validation.ts, limits.ts, viewer.ts, channels.ts, posts.ts
  gamification/                 time/rules/levels/streak/ranking/badges (pure) + service.ts + hooks.ts
  db.ts                         Prisma client + `lockKey(tx, key)` (Postgres advisory lock; no-op on SQLite)
src/app/actions/                thin server actions (community.ts, community-admin.ts, creator.ts, learning.ts, checkout.ts ...)
src/app/(site)/c/[handle]/...   public storefront + community pages (see routes)
src/app/dashboard/(console)/    creator console (products, orders, learners, coupons, payouts, settings, community)
src/components/                 shared UI; src/components/community/ is the community UI
```

Key routes: `/c/[handle]` storefront, `/c/[handle]/[slug]` product, `/c/[handle]/community[/channel[/p/postId]]`, `/c/[handle]/community/leaderboard`, `/library[/productId]`, `/dashboard/*`, `/dashboard/community`, `/checkout/*`, `/certificates/[publicId]`, `/api/webhooks/*`. Reserved slugs: product slug `community`; channel slugs `leaderboard`, `new` (they would shadow fixed routes).

Models (25): User, Creator, Product, Section, ContentItem, Quiz, QuizQuestion, QuizOption, LessonProgress, QuizAttempt, Certificate, Coupon, Order, Enrollment, LedgerEntry, WebhookEvent, InvoiceCounter, Channel, ChannelProduct, Post, Comment, Like, CommunityBan, PointEvent, UserBadge.

### Community rules worth knowing (full detail in the spec)

- Membership = holding an `Enrollment` for any product of that creator. Refunds delete the row, so access ends at once. Gated channels need an enrollment in a linked product. The creator always has access; banned users have none.
- Every read/write re-checks access **on the server**; no access = `not_found` (never `forbidden`), so a channel's existence isn't leaked. `forbidden` only for someone who has access but lacks permission.
- The community **layout does not call `requireUser`** (so logged-out visitors keep deep links through login). **Every page under `community/` must call `requireUser(<its own full path>)` before loading any data.** A comment in the layout says so.
- Posts and comments are plain text (no HTML/Markdown, escaped by React). Posts and comments are author-editable; the creator can delete, pin (max 3 per channel) and ban (the target must be linked to the creator's community).
- Points (per creator, append-only `PointEvent`, unique on user+creator+kind+refId so replays are no-ops): lesson 10, quiz pass 25, course complete 100, post 5 (3/day), comment 2 (10/day), like received 1 (20/day). Levels: 0/100/250/500/1000/2000/3500/5500/8000/12000, +5000 per level after 10. IST days, Monday week start. The creator earns nothing and is not on the leaderboard; refunded and banned members drop off.
- Points are awarded **after** the learning transaction commits and never fail the learner's action (`src/lib/gamification/hooks.ts`). "Recalculate" in the console replays existing progress (`backfillPoints`).

## 6. How to verify (recipes that worked)

- **Everything:** `npm test`, `npm run typecheck`, `npm run lint`, `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code` (expect "No difference detected"), `node scripts/sync-postgres-schema.mjs --check`, `npm run build`.
- **Do not run `npm run build` in the main tree while a dev server is running** (it overwrites `.next`; symptoms: stale CSS). Kill dev, `rm -rf .next`, restart. Turbopack also refuses a symlinked `node_modules` (use `cp -cR` in a scratch copy).
- **Real Postgres without Docker:** `npm i embedded-postgres` in a scratch dir (pick a free port; other sessions run Postgres instances: never touch them), regenerate the Postgres client **only in a scratch copy** (`prisma generate` against `prisma/postgres/schema.prisma`), `prisma migrate deploy`, then `TEST_DATABASE_URL=postgresql://postgres:pw@localhost:<port>/throwaway npm test`. See `src/test/db-path.ts` and `DEPLOY.md`. After touching Postgres in the main tree, `unset DATABASE_URL && npx prisma generate` to restore the SQLite client.
- **Test isolation:** each vitest run uses its own `prisma/test-<pid>.db`; concurrent runs are safe. Tests share one DB within a run, so never assert on global counts (`count()` with no `where`): scope every query to ids the test created. Check with `--sequence.shuffle.files --sequence.seed=3`.
- **Prove tests can fail:** break the code in a scratch copy (never in the shared tree) and confirm the right tests fail.
- **Browser walkthrough** (controller does this; subagents have no browser): start dev, open it in the Browser pane (`preview_start` with a URL, then `read_page`, `javascript_tool`, screenshots). To log in as a role, use the login page's demo buttons. React forms ignore `.value=`: use the native value setter plus an `input` event, or real clicks. `window.confirm` blocks the pane: override with `window.confirm = () => true`. Measure mobile with `resize_window` (mobile preset = 375px) and compare `document.documentElement.scrollWidth` to `clientWidth`. Reset with the `desktop` preset afterwards.
- **Contrast with a light brand colour:** temporarily `sqlite3 prisma/dev.db "update Creator set brandColor='#ffe08a' where handle='asha-rao'"`, look, then restore `#0f766e`.

## 7. How work is run here (so the next session behaves the same)

- **Owner rules** (`~/.claude/CLAUDE.md`, "CSO"): every reply starts with `CSO:`; research before building; show a plan; real code-reviewer agent for review; learning pass (`/cso-learn`) before "CSO: Complete."; ask before anything destructive, financial, credentials, security posture, or **publishing (git push, deploy)**. Every entity needs Edit as well as Add.
- **Pipeline per sub-project:** `superpowers:brainstorming` (one question at a time, user approves the design) → spec in `docs/superpowers/specs/` → `superpowers:writing-plans` (complete code in each step, no placeholders) → have a reviewer *apply the plan mechanically in a scratch copy* before executing → `superpowers:subagent-driven-development` (implementer subagent + reviewer subagent per task, one fix subagent per area, ledger file) → whole-branch review, adversarial security review, UI/a11y audit → fix waves → delta review → controller browser walkthrough → final test-engineer gate incl. Postgres → memory + this handoff.
- **Models used:** implementers sonnet (haiku for pure transcription), task reviewers sonnet, risky/security reviews and final reviews opus (`code-reviewer` agent), `test-engineer` for gates.
- **Commit trailer** (required on every commit): `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Tell every implementer the exact line; a haiku implementer once wrote its own name.
- **Shared repo rules.** Another worker is rebuilding the UI on branch `ui/rebuild` in a **separate worktree** (`/Users/manojaaa/Tysonpe- Sandbox/ui-rebuild`; `git worktree list`). Do not touch that worktree. This checkout (`/Users/manojaaa/Tysonpe- Sandbox/tysonpe`) is `main`, but other tools sometimes leave uncommitted edits here (during the sub-project 3 build, files such as `CLAUDE.md`, `DESIGN.md` and `public/hero*` appeared and later vanished). Before every commit run `git branch --show-current` (must be `main`); never `git add -A`, `git commit -a`, `git stash` or `git checkout` here; commit with `git commit -m "..." -- <exact paths>`; if a file you must edit has uncommitted changes you did not make, stop and ask.
- **CSO stop-gate hook** (`/Users/manojaaa/Agents and Skills/.cso/hooks/on-stop-gate.js`, read it for exact conditions) blocks ending a turn. Gates: 0/0b unresolved escalated inbox or self-repair tasks; 1 a `/cso-learn` pass + a decisions.jsonl entry mentioning it (fires when a workflow was active or a correction was detected); 2 a commit with no real `code-reviewer` dispatch (a tiny single-file non-infra commit may instead log a self-review); 3 a deploy-config commit needs a `release-engineer` dispatch; 4 a commit touching `.js/.ts/.tsx` code needs a real `test-engineer` dispatch (a ledger line only counts when the transcript can't be read); 5 after a commit the workflow file in `/Users/manojaaa/Agents and Skills/.cso/state/workflows/` (this project's: `workflow-tysonpe-community-2026-10-15.json`) AND `task_history.jsonl` must be updated; 5b no workflow stuck in bootstrapping; 6 a UI commit (`.tsx/.jsx/.css`) needs a local preview screenshot in the transcript (open the app with `preview_start` and take a screenshot; navigation alone did not satisfy it); 7 after a `git push`, a prod screenshot via Chrome MCP. Every reply must also start with `CSO:`. Markdown-only commits skip gates 2, 4, 5 and 6.
- **Local-only artifacts:** `.superpowers/sdd/` (briefs, reports, review diffs, ledger) is a scratch area excluded via `.git/info/exclude` (per clone; recreate that line if you clone fresh). Its ledger is copied into `docs/superpowers/handoff/sub-project-3-log.md`.
- **Memory** (auto-loaded): `/Users/manojaaa/.claude/projects/-Users-manojaaa-Tysonpe--Sandbox/memory/` — `project_tysonpe-status.md`, `feedback_subagent-driven-execution.md`, `reference_cso-stop-gates.md`, `reference_dev-environment-quirks.md` and others. Update `project_tysonpe-status.md` whenever the state changes.

## 8. Open items and deferred follow-ups

Decisions waiting on the user:

1. **Push `main` to `origin`?** At `4c8451a` local `main` was 41 commits ahead of `origin/main` (`662ff47`) (39 community commits `2c540ab^..4c8451a` + 2 plan-revision docs `519d79b`, `b994b63`); the handoff docs commit and anything later add to that. Pushing publishes them to a **public** repo (manojtyson-37/Tysonpe); `.superpowers/` scratch files are excluded from git (one report file that slipped in was untracked in the docs commit). The new migrations (`community`, `comment_edited_at`, `reserve_community_slug`) apply on the next `vercel-build`; deploying also needs the demo env per `DEPLOY.md`.
2. Anything that touches real money stays gated: payments are test mode; going live needs Razorpay KYC, live keys, GST sign-off, a separate Vercel project and database.

Known issues and follow-ups (none block use):

- Leaderboard: the viewer's rank outside the top 20 uses a `groupBy … having` that returns one row per higher earner; replace with a `COUNT` (`$queryRaw` or a subquery) in `getLeaderboard` (`src/lib/gamification/service.ts`).
- Award-after-delete race on Postgres (READ COMMITTED): a late `awardSafely` can insert points for content deleted a moment earlier. Fix by locking/`FOR SHARE` on the source row or pruning orphaned `PointEvent`s (`sourceId` pointing nowhere).
- No feedback when "Turn on"/"Recalculate" is rate-limited (3 per 10 min per creator); no "Posted — see last page" feedback when a new comment lands on a later page (comments paginate by 50); no live character counters (only `maxLength`).
- `loading.tsx` under `community/` makes `requireUser` redirects and `notFound()` client-side (HTTP 200 instead of 307/404). Functionally fine.
- Performance: `resolveCommunity` runs in both layout and page (wrap in React `cache()`); the learning hook runs inside the request (consider `after()`); rate limiters are in-memory per process (move to a shared store before multi-instance); `backfillPoints` runs in-request.
- `ActionForm` keeps one value per key and React 19 resets forms: `CouponForm`/`LessonForm` have the same stale-conditional-UI latent bug that `ChannelForm` fixed with a `reset` listener; a shared fix in `src/components/form.tsx` is the clean answer.
- `ChannelForm` edit form loses ticked products if a save fails.
- Library page's "Community" link shows even if the creator has no channels (the community page explains it).
- Shared `SiteNav` overflows at 375px (539px wide): the other worker's component, not touched.
- `vitest.config.mts` prints a harmless loader warning about the extensionless `db-path` import.
- Postgres concurrency (`lockKey` on the daily cap and pin limit) is only exercised on Postgres; the pin test is `it.runIf(isPostgres)`. A daily-cap concurrency test could not be made to fail without the lock (probably redundant).

## 9. Next steps

**A. Housekeeping (small, do first if wanted)**
1. Ask the user about pushing (section 8). If yes: `git remote -v` owner check (`manojtyson-37`) → `gh auth switch -u manojtyson-37` → `git push origin main`. A push does **not** deploy: the hosted demo (Vercel project `tysonpe`, under the `kbdcreditsolutions` team, GitHub owner `manojtyson-37`) is deployed by CLI (`vercel --prod`) per `DEPLOY.md`. After a push the CSO stop-gate (gate 7) requires a prod verification: Chrome MCP navigate + screenshot of the live site, not just curl. Before pushing, expect the `ui/rebuild` merge conflicts described in section 3.
2. Optional follow-up wave from the list above (cheapest wins: `COUNT` rank query, shared form-reset fix, `cache()` for `resolveCommunity`).

**B. Sub-project 4 — Growth (proposed scope; needs brainstorming with the user, do not skip it)**

Research bar: TagMango gates affiliates and checkout upsell behind ₹15k/mo; WhatsApp/email automations are table stakes on every plan of both competitors; Graphy ships affiliate tracking on all plans. Proposed order inside sub-project 4:

1. **Plan/fee model decision and a commission engine** (pulled forward from sub-project 6): affiliates need payout splits on top of the existing `feeBreakdown` in `src/lib/money.ts` and `LedgerEntry`. Decide the model (keep TagMango-like tiers, or a free tier with a low fee plus one paid tier that drops the fee and adds domain/branding), and whether plan billing (charging creators, upgrade flow) is built now or stays in sub-project 6. Touches `src/lib/money.ts`, `src/lib/orders.ts`, `LedgerEntry`, checkout.
2. **Affiliates:** per-creator programs, referral links/cookies, attribution on orders, commission %, payout ledger lines, creator and affiliate dashboards, fraud guards (self-referral, refunds claw back commission).
3. **Checkout upsell / order bump** (and coupons already exist).
4. **Abandoned cart + notifications** (also covers the community's missing notifications/digests). Needs an email provider decision.
5. **WhatsApp** automations last: needs a WhatsApp Business API provider and Meta verification, which is the user's call and may cost money.
6. Funnels/landing-page builder probably belongs with sub-project 6 (site builder): confirm during brainstorming.

First questions to ask the user (one at a time): email provider and budget; whether WhatsApp is in scope now; the fee/plan model; affiliate commission rules (percentage, cookie window, who pays on refunds).

**C. Later:** sub-project 5 (Zoom/bookings), 6 (site builder, domains, plan billing, team roles), 7 (AI + native apps). Each needs its own spec → plan → build → review cycle.

## 10. Where to find things

- Specs: `docs/superpowers/specs/` (core commerce, content, community). Plan: `docs/superpowers/plans/2026-10-15-tysonpe-community.md`.
- Step-by-step history of sub-project 3 (commits per task, decisions, review rounds, problems found and fixed, verification evidence, the SDD ledger): `docs/superpowers/handoff/sub-project-3-log.md`.
- Deploy and env: `DEPLOY.md`, `.env.example`. Design rules: `CLAUDE.md`, `DESIGN.md`.
- Skills available to the sessions: `superpowers:brainstorming|writing-plans|subagent-driven-development|test-driven-development|requesting-code-review`, `/security-review`, `/design-review`, `/qa`, `/cso-learn`.
