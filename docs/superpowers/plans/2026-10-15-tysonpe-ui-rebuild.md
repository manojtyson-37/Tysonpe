# Tysonpe UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. One fresh implementer per task, task review after each, final whole-branch review.

**Goal:** Rebuild every Tysonpe screen so it reads as hand-built fintech software, using the decisions in `docs/superpowers/specs/2026-10-15-tysonpe-ui-rebuild-design.md` and the evidence in `docs/design-research/A..E`.

**Architecture:** Next.js 16 App Router, React 19, Tailwind v4 tokens in `src/app/globals.css`, primitives in `src/components/ui/*` re-exported from `src/components/ui.tsx` so old imports keep working. Server components by default; `"use client"` only where state or framer-motion is needed. framer-motion is already installed.

**Tech stack:** TypeScript, Tailwind v4, framer-motion (`LazyMotion` + `m`), vitest in node env (primitives tested with `react-dom/server` `renderToStaticMarkup`), Prisma (do not touch).

## Global Constraints (binding on every task; copy into reviews)

1. Branch `ui/rebuild`, worktree `/Users/manojaaa/Tysonpe- Sandbox/ui-rebuild`. Work only there. Never edit `prisma/`, `src/app/actions/auth.ts`, or business logic in `src/lib/**` except where a task says so.
2. Light only. Palette tokens only (no `slate/stone/indigo/emerald/rose/amber-NNN`, no raw hex in JSX except the QR drawing and gateway replica skins in Task 30). Paper `#fbfaf7`, surface `#fff`, surface-2 `#f3f0e9`, ink `#16130f` (also primary button), muted `#6b665c`, line `#e4dfd3`, line-strong `#c9c2b2`, emerald `#0f7b4d` money/success/logo only (never a CTA), bad `#b42318`.
3. No gradients, glows, blur blobs, resting card shadows, `animate-pulse`/`animate-ping` indicators, emoji or text glyphs as icons, hover-scale, `transition: all`, `window.confirm`.
4. Radii only: control/button/input 8px, card 12px, dialog 16px, badge/chip full. Express as tokens (`--r-control`, `--r-card`, `--r-dialog`) and utility classes; no `rounded-[Npx]`.
5. Text: body at least 15px on marketing, 14px minimum in app screens, meta 12px minimum. No `text-[9|10|11px]`. All rupee amounts use `formatINR` via the `Money` component with `tabular-nums`.
6. Marketing pages (landing, storefront, product page, catalogue): Taste v2 strict: no eyebrow above headings, h1 at most 2 lines at 390px, at most 2 outlined boxes, no rows of identical icon cards, one ink-filled CTA per band. App screens follow CLAUDE.md and Taste v1 dashboard hardening (group by `divide-y`/negative space, cards only where elevation communicates hierarchy).
7. Motion: tokens from the spec; only transform/opacity/filter/clip-path; every animation has a reduced-motion fallback; no entrance motion on dashboard tables, nav, headings, KPI numbers; at most one stagger group per view.
8. Copy: honest (no invented customers/logos/ratings/counts/SAC/GSTIN/settlement promises); test mode stated; Taste copy ban list applies; sentence case; no "Oops", no exclamation marks in success text; button labels name the action.
9. Test-pinned, do not change: `formatINR` output, regex-matched error substrings in `src/lib/learning/quiz.ts`, `src/lib/learning/admin.ts`, `src/app/actions/checkout.ts`, `REDIRECT:/demo` targets in actions.
10. Every task: `npm test && npm run typecheck && npm run lint` green before commit. One commit per task, message `feat(ui): <task title>` with trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. New primitives get an SSR render test (`*.test.tsx`, `renderToStaticMarkup`) asserting structure, aria attributes, token classes.
11. Do not run `next build` in the main checkout. Dev server for visual checks: `PORT=3200 npm run dev` inside the worktree (controller does browser checks; implementers do not).
12. Never `git add -A`; add exact paths. Never touch files outside the task's list without reporting it.

## Task list overview

Wave 0 foundations: 1-3. Wave 1 primitives: 4-9. Wave 2 shells: 10-12. Wave 3 money path: 13-15. Wave 4 storefront and learner: 16-19. Wave 5 creator console: 20-23. Wave 6 community: 24-25. Wave 7 marketing, demo, gateway: 26-31. Wave 8 audit: 32.

---

### Task 1: Tokens, base layer, DESIGN.md

**Files:** `src/app/globals.css`, `DESIGN.md`, `CLAUDE.md`.
**Do:**
- In `globals.css` add the spec tokens: `--r-control/--r-card/--r-dialog`, spacing helpers, motion tokens (durations, eases, distances, scales, stagger, reduced-motion block from `docs/design-research/B-designmd-motion.md` section 5), focus-ring token (2px ink, offset 2), `--shadow-float` (warm tint `rgba(22,19,15,.12)`), skeleton keyframes, type utilities (`.t-display`, `.t-heading`, `.t-body`, `.t-meta`, `.t-label` for app-screen micro-labels, `.t-num`). Keep every existing class name alive (`.btn`, `.card`, `.input`, `.badge-*`, `.table`) but re-point them at the radius tokens: `.card` 12px no resting shadow with a one-step tone difference, `.btn` 8px, `.input` 8px. Remove `.card-hover` or make it the single hover recipe (border-color + tone shift, 150ms, no translate). Delete `qr-scan`-style loops only if no longer used after Task 27 (leave for now).
- Rewrite `DESIGN.md` on the TypeUI 11-section skeleton (Mission, Brand, Style Foundations, Accessibility, Writing Tone, Rules Do, Rules Don't, Authoring Workflow, Required Output Structure, Component Rule Expectations, Quality Gates) populated from the spec; include the typeface defence, the marketing/app split and a motion budget.
- Update `CLAUDE.md` section 3 and 4 to match the spec (remove "dark luxury", pulse dot, stagger-everything; point to DESIGN.md).
**Acceptance:** build of CSS passes (`npm run typecheck && npm run lint && npm test`); grep shows no `animate-pulse` rule recommended in docs; tokens named exactly as in the spec.

### Task 2: Icon set and formatters

**Files:** new `src/components/icons.tsx`, new `src/lib/format.ts`, new `src/lib/format.test.ts`, edit `src/components/gateway-icons.tsx` only to add nothing (read-only here).
**Do:** 16 stroke icons in one style (24 grid, 1.75 stroke, `currentColor`, `aria-hidden` default, `size` prop): check, x, arrow-right, arrow-left, chevron-down, plus, copy, lock, trash, search, external, drag, menu, info, alert, clock. `format.ts`: `formatDate`, `formatDateTime`, `istDay`, `istDate` consolidating the five existing formatters (`ui.dateFmt`, library `fmt`, certificates `longDate`, dashboard `istDay`/`istDate`, `community/format.stamp`); re-use `formatINR` from `money.ts` (do not duplicate). Tests pin exact outputs (e.g. `15 Oct 2026`, IST boundaries).
**Acceptance:** tests green; no existing call site changed yet (later tasks migrate).

### Task 3: Button, ButtonLink, Badge, StatusBadge, Surface

**Files:** new `src/components/ui/button.tsx`, `badge.tsx`, `surface.tsx`, `index.ts`; edit `src/components/ui.tsx` to re-export; tests `button.test.tsx`, `badge.test.tsx`.
**Do:** `Button` (variants primary|secondary|ghost|danger, sizes sm|md|lg, `loading` with inline spinner icon, `icon` slot, `type` defaults to button), `ButtonLink` (Next `Link`, same styles), `Badge` (neutral|good|bad|warn|brand, optional dot, no pill beside titles by default), `StatusBadge` with human labels (`created`→"Pending", `paid`→"Paid", etc., keep existing statuses), `Surface` (tone default|inset|paper|interactive; paddings sm|md|lg named, not ad-hoc). Press feedback `scale(.97)` small / `.98` lg via `.press` token class. `ui.tsx` keeps exporting `StatusBadge`, `Money`, `Stat`, `Empty`, `PageHeader`, `TYPE_LABEL`, `dateFmt` with unchanged signatures.
**Acceptance:** SSR tests assert classes, `aria-busy` when loading, link renders `<a>`; existing pages unaffected.

### Task 4: Money, Price, Stat, StatStrip, MetricRow, Progress, Avatar

**Files:** new `src/components/ui/money.tsx`, `stat.tsx`, `progress.tsx`, `avatar.tsx`; update `ui.tsx` re-exports and `Brand.tsx` `Avatar` to delegate; tests.
**Do:** `Money` (props `paise`, `tone` default|good|bad|muted, `sign` +/−, `free`, `size`, `mono`), always `tabular-nums`, true minus U+2212. `Price` wraps Free / "/ month" / GST-note. `Stat` inline (no box) and `StatStrip` hairline-separated row with optional delta text. `MetricRow` = `dl` row (label, value, optional sub, strong). `Progress` bar with `role="progressbar"` and text value. `Avatar` letter tile with optional image, sizes, no gradient.
**Acceptance:** `formatINR` outputs unchanged; tests cover free, negative, tone, aria values.

### Task 5: Table kit

**Files:** new `src/components/ui/table.tsx`, test.
**Do:** `Table`, `Th`, `Td`, `Tr`, `MoneyCell` (right aligned, tabular), `DateCell`, `RowActions`; sticky header option; horizontal scroll wrapper with right-edge fade; `EmptyRow`; below `sm` optionally render rows as stacked label/value blocks via a `stack` prop. Hairlines via `divide-y`, no card box by default.
**Acceptance:** SSR test asserts `scope="col"`, caption/aria-label support, stack mode.

### Task 6: Form controls

**Files:** `src/components/form.tsx` (extend, keep `Field`, `SubmitButton` exports and signatures), new tests.
**Do:** add `Input`, `Textarea`, `Select` (custom chevron icon, native select underneath), `Checkbox`, `RadioCard` (single component replacing the 5 hand-built radio cards; roving focus, `role="radio"` semantics via native input), `Switch`, `InputGroup` (prefix/suffix), `ColorField`. Label above, helper below, error with `role="alert"`, `aria-invalid`, `aria-describedby`. `SubmitButton` now uses `Button` with pending state. Input targets 44px high on touch.
**Acceptance:** tests assert label/for wiring, aria-invalid, error id linkage.

### Task 7: Tabs and SegmentedControl

**Files:** new `src/components/ui/tabs.tsx` (client), test for pure helpers.
**Do:** `Tabs` with a shared `layoutId` indicator (framer-motion `LazyMotion`/`m`, 200ms `--ease-out`, reduced motion = instant), two modes: link-based (`href`, active from pathname, for DashNav/ChannelNav/leaderboard) and state-based (value/onChange, for demo, upiMode). `SegmentedControl` for 2-3 options. Arrow-key navigation implemented in a pure `nextIndex(current, key, count)` function that is unit-tested. ARIA tab roles for state-based; `aria-current="page"` for link-based.
**Acceptance:** `nextIndex` tests; SSR render asserts roles.

### Task 8: Dialog, ConfirmDialog, Toast, Callout

**Files:** new `src/components/ui/dialog.tsx`, `toast.tsx`, `callout.tsx`; rewrite `src/components/ConfirmButton.tsx` body keeping its prop signature so the 9 call sites work; tests.
**Do:** `Dialog` on native `<dialog>` or a focus-trapped portal: Esc closes, focus returns, `aria-modal`, 220ms enter (`--ease-overlay`, 8px rise + 4px blur), 160ms exit, `transform-origin` at trigger when available, reduced motion = no travel. `ConfirmDialog` + `ConfirmButton` (same props as today: reads current file first) using it. `Toast` (client store with `toast()` helper and `<Toaster/>`; 4s, 400ms ease; `role="status"`). `Callout` (info|good|warn|bad, optional action) replacing the 8 inline alert boxes later.
**Acceptance:** pure toast-queue logic unit-tested; SSR assertions for roles; no `window.confirm` left in `ConfirmButton`.

### Task 9: EmptyState, PageHeader, Disclosure, Skeleton, Chart

**Files:** edit `ui.tsx` (`Empty`→re-export of new `EmptyState`, `PageHeader`), new `src/components/ui/empty.tsx`, `page-header.tsx`, `disclosure.tsx`, `skeleton.tsx`, `chart.tsx`; tests.
**Do:** `EmptyState` (icon slot, primary + secondary action, `inline` variant; keep `Empty` export working). `PageHeader` (`back`, `meta`, `actions`; no eyebrow by default). `Disclosure` (animated height via grid-rows trick, chevron icon, keyboard native). `Skeleton` (matches layout, no spinners). `BarChart` and `Sparkline` in SVG, no dependency: axis ticks, focusable bars with text tooltips, values via `formatINR`, an sr-only table fallback, ink bars with emerald only for a positive-money series.
**Acceptance:** chart scale math in a pure function with tests (ticks, zero data, single value); SSR asserts the sr-only table.

### Task 10: Public shell, mobile nav, footer

**Files:** `src/components/SiteNav.tsx`, `src/app/(site)/layout.tsx`, new `src/components/MobileMenu.tsx` (client).
**Do:** wordmark, 3-5 plain links, one ink action; hamburger menu below `md` (Dialog-style sheet, 500ms `--ease-sheet`, focus managed); skip-to-content link; footer as a designed close (wordmark at full width, legal/links real, "Payments run in test mode"). Keep the logged-in states and the existing `h-14`.
**Acceptance:** SSR test of the menu markup; no nav item hidden with no mobile equivalent.

### Task 11: Console shell

**Files:** `src/app/dashboard/(console)/layout.tsx`, `src/components/DashNav.tsx`.
**Do:** console gets its own top bar (wordmark, creator name, view-storefront link, account) and collapsible sidebar using `Tabs` link mode; mobile drawer; stop rendering the marketing `SiteNav`. Active state, 44px targets, `aria-current`.
**Acceptance:** typecheck/tests green; console routes still render under the new layout.

### Task 12: Route boundaries and AuthShell

**Files:** new `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/dashboard/(console)/loading.tsx`, `src/app/(site)/library/loading.tsx`, new `src/components/AuthShell.tsx`; edit `login/page.tsx`, `signup/page.tsx`, `dashboard/onboarding/page.tsx`.
**Do:** useful 404 (what happened, 2 real links), error boundary with retry, skeleton loaders matching layout; `AuthShell` replaces three copies of the narrow-card layout. Fix the dead ternary in signup. Do not change form logic.
**Acceptance:** tests green; the three auth pages render through `AuthShell`.

### Task 13: Checkout review page

**Files:** `src/app/(site)/checkout/[productId]/page.tsx`.
**Do:** two-pane layout (order summary left as `MetricRow` list, coupon `Field`, then one ink "Continue to payment" action); GST line uses `product.gstRatePct`; icons not glyphs; `Callout` for coupon result.
**Acceptance:** copy honest; no hardcoded 18%.

### Task 14: Pay page and Razorpay launcher

**Files:** `src/app/(site)/checkout/pay/[orderId]/page.tsx`, `src/components/DemoPayPageClient.tsx`, `src/components/RazorpayButton.tsx`.
**Do:** replace amber test strip with `Callout`; `RadioCard` for gateway choice; all amounts through `Money`/`formatINR`; GST from product rate; `RazorpayButton` theme colour `#16130f`; tokenise the 4 tiny-text uses; no off-scale radii.
**Acceptance:** `grep -n "5b3df5\|rounded-\[" ` on these files returns nothing.

### Task 15: Success page and invoice

**Files:** `src/app/(site)/checkout/success/[orderId]/page.tsx`, `src/app/(site)/orders/[orderId]/invoice/page.tsx`.
**Do:** success moment is the rare tier: 320ms reveal with the pop check icon once, no confetti, no exclamation marks. Invoice as a paper-on-canvas document (`Surface tone=paper`), `MetricRow` totals with GST split, print stylesheet kept working (`PrintButton`). No SAC/GSTIN text.
**Acceptance:** invoice number format untouched; print CSS retained.

### Task 16: Storefront

**Files:** `src/app/(site)/c/[handle]/page.tsx`, `src/components/Brand.tsx`.
**Do:** editorial storefront, not a 3-up pill-card grid: featured product as a wide row, remaining products as a ruled list with price right-aligned; creator header with real bio; type shown as plain text not a pill; keep `BrandScope` creator colour but ensure contrast via `readableOn`; hover = border/tone shift only.
**Acceptance:** works with 1, 4 and 0 products (add empty state).

### Task 17: Product detail page

**Files:** `src/app/(site)/c/[handle]/[slug]/page.tsx`.
**Do:** asymmetric two-column layout: description and curriculum list (ruled rows, durations) left, sticky buy panel right with `Price`, one ink action, GST included note; mobile: buy bar sticks to bottom.
**Acceptance:** free and paid and membership variants render.

### Task 18: Library list, course player, quiz player

**Files:** `src/app/(site)/library/page.tsx`, `src/app/(site)/library/[productId]/page.tsx`, `src/components/QuizPlayer.tsx`.
**Do:** library as a list with `Progress` per course; player with lesson rail, current lesson, completion state; replace glyphs with icons, `RadioCard` for answers, `Callout` for results. Preserve error substrings from `lib/learning/quiz.ts` (do not edit that file).
**Acceptance:** tests green; no emoji left in these files (`grep -nP "[\x{1F300}-\x{1FAFF}]"`).

### Task 19: Certificate

**Files:** `src/app/(site)/certificates/[publicId]/page.tsx`.
**Do:** paper certificate document, verification line (public id, issue date via `formatDate`), print styles, no `rounded-3xl`, remove `!important` overrides.
**Acceptance:** public verify route behaviour unchanged.

### Task 20: Console overview

**Files:** `src/app/dashboard/(console)/page.tsx`.
**Do:** `StatStrip` (revenue, net earnings, orders, learners), real `BarChart` of last 14 days (sr-only table), setup checklist when data is thin, recent orders `Table`. Emil lens: no entrance motion.
**Acceptance:** chart shows 14 days with correct IST day boundaries (reuse `istDay`).

### Task 21: Products list, new, editor, lessons

**Files:** `src/app/dashboard/(console)/products/page.tsx`, `products/new/page.tsx`, `products/[id]/page.tsx`, `src/components/ProductForm.tsx`, `src/components/LessonForm.tsx`.
**Do:** `Table` list with status `StatusBadge`; forms on new `Field`/`Input`/`Select`/`Switch`; lesson rows reorder affordance with `drag` icon; `ConfirmDialog` for delete; remove `!` overrides.
**Acceptance:** every entity editable (add + edit + delete all reachable).

### Task 22: Quiz editor and orders

**Files:** `products/[id]/quiz/[itemId]/page.tsx`, `src/components/QuizEditor.tsx`, `orders/page.tsx`.
**Do:** quiz editor on form primitives with `Checkbox`/`RadioCard` for correct answers; orders with `Tabs` filter (link mode), `Table`, `MoneyCell`, `ConfirmDialog` for refund/cancel actions.
**Acceptance:** filters via query string still work.

### Task 23: Learners, payouts, coupons, settings

**Files:** `learners/page.tsx`, `payouts/page.tsx`, `coupons/page.tsx`, `src/components/CouponForm.tsx`, `settings/page.tsx`.
**Do:** shared ledger `MoneyCell` with deductions in true minus; `Avatar` in learners; coupons with `StatusBadge`; settings with `ColorField` and a live storefront colour preview (client component, pure contrast helper reused from `lib/color`).
**Acceptance:** coupon create/edit/deactivate reachable.

### Task 24: Community (learner side)

**Files:** `src/app/(site)/c/[handle]/community/layout.tsx`, `community/[channel]/page.tsx`, `community/[channel]/p/[postId]/page.tsx`, `community/leaderboard/page.tsx`, `src/components/community/ChannelNav.tsx`, `PostCard.tsx`, `PostComposer.tsx`, `CommentForm.tsx`, `EditPostForm.tsx`, `LikeButton.tsx`, `MemberCard.tsx`. (Over 3 files: split into 24a shell+feed, 24b thread, 24c leaderboard if the implementer reports too large; keep one commit each.)
**Do:** `Tabs` link mode for channels/leaderboard period; feed as ruled list; author row without pills; `Avatar`; like button with press state; `Callout` for errors; mobile overflow stays fixed (single column below lg, already fixed on main in 025b6c2).
**Acceptance:** `src/lib/community/**` untouched; community tests green.

### Task 25: Community admin

**Files:** `src/app/dashboard/(console)/community/page.tsx`, `src/components/community/ChannelForm.tsx`.
**Do:** form primitives, `Disclosure` instead of ad-hoc `<details>`, `ConfirmDialog`, `Table` for bans.
**Acceptance:** all channel/ban/moderation actions still reachable.

### Task 26: Landing page

**Files:** `src/app/(site)/page.tsx`.
**Do:** apply Taste v2 on top of pass-1: remove eyebrow above h1 and section eyebrows; h1 at most 2 lines at 390 ("₹2,999 sale. ₹2,639.12 net." or similar, from `money.ts`); the hero is one live thing built from true numbers (price input, GST, platform fee, gateway fee, net, plan select; no-JS fallback = the static ledger) as a small client component; at least 4 real UI fragments on the page (ledger, checkout, invoice, dashboard strip) made from real components; section layouts never repeat neighbours; status as ruled list; fees as table; closing band with wordmark; one ink CTA per band; test-mode line stated plainly under the hero, not as a pill; all constants stay derived from `money.ts`.
**Acceptance:** h1 two lines at 390/768/1440; zero uppercase micro-labels above headings; contrast passes.

### Task 27: Home demo

**Files:** `src/components/HomeInteractiveDemo.tsx` (split), new `src/components/demo/QrTab.tsx`, `HostedTab.tsx`, `FeeCalc.tsx`, `qr.tsx`.
**Do:** split the 659-line file; `Tabs` state mode with animated indicator; tokenise all palette classes; QR drawing keeps its own hexes in `qr.tsx` only; keep plan-fee netting and `PLAN_MONTHLY_PAISE` logic and the money.test.ts guarantees; remove `animate-ping` and the scan laser loop (replace with a one-shot scan on mount); step transitions animate once (enter recipe), copy tick uses pop ease.
**Acceptance:** zero `stone-/emerald-/rose-/amber-` classes; calculator still shows Ultimate as negative at default sales.

### Task 28: Demo playground page

**Files:** `src/app/(site)/demo/page.tsx`.
**Do:** rewrite: drop the buzzword block and hero card; functional gateway playground with `RadioCard`, honest test-mode copy, GST from product rate; no outlined-box rows beyond 2.
**Acceptance:** `REDIRECT:/demo` targets still resolve.

### Task 29: Auth forms

**Files:** `src/components/LoginForm.tsx`, `src/components/SignupForm.tsx`.
**Do:** move onto `Field`/`Input`/`RadioCard`/`Button` (keep the gateway chooser and demo one-click fill; no `!` overrides); inline errors with `role="alert"`; 44px targets; `autocomplete` and `inputmode` set.
**Acceptance:** form actions and field names unchanged.

### Task 30: Gateway replicas with isolated skins

**Files:** `src/components/RazorpayDemoModal.tsx`, `src/app/gateway/easebuzz/[orderId]/EasebuzzHostedPage.tsx`, `src/app/globals.css` (append skin scopes only).
**Do:** keep gateway-brand look on purpose but behind `[data-skin="razorpay"]` and `[data-skin="easebuzz"]` CSS-variable scopes so JSX has no raw palette classes; swap hand-rolled modal for `Dialog`; replace glyphs with icons; tokenise 29 tiny-text uses; 15-minute countdown animates numbers only (tabular-nums); label both "Simulated".
**Acceptance:** grep for palette classes in these two files returns nothing; payment verification untouched.

### Task 31: Housekeeping

**Files:** `src/components/gateway-icons.tsx`, `src/app/layout.tsx`, `public/*.svg`, `src/app/favicon.ico`.
**Do:** remove alias exports no longer imported, split brand marks from generic icons if any generic remain, delete unused default `public/*.svg`, add real metadata (title template, description, openGraph, themeColor), favicon from logo mark, `lang`, skip-link target `id="main"`.
**Acceptance:** `grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src` returns nothing before deletion.

### Task 32: Audit and fix-up (controller-led)

Run, in order: Taste checklist A1-A19/B/C against landing, storefront, product page; Design Motion audit on `src/`; UI UX Pro Max pre-delivery checklist at 375/768/1024/1440 on every route; census greps from `E-inventory.md` section 4 must all return zero except documented skins; `next build` in the worktree; `/design-review`; final whole-branch review on the most capable model. Fixes go to ONE fix subagent with the full findings list.
