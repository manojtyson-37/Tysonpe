# E. UI Inventory and Rebuild Order

Branch `ui/rebuild`, read-only audit. Source: every file under `src/app` (pages and layouts), `src/components`, and the `src/lib` files that produce user-visible copy. Line counts are from `wc -l`. Counts of hardcoded classes come from grep over `src/app` and `src/components`.

Audience key: **P** public (logged out OK), **L** learner (logged in buyer), **C** creator (owns a `Creator` row), **A** any logged-in user.

## 0. Ground truth that shapes the rebuild

- **Primitives today are three things only:** CSS classes in `src/app/globals.css` (`.btn*`, `.input`, `.label`, `.hint`, `.err`, `.card`, `.card-hover`, `.badge*`, `.table`), the helpers in `src/components/ui.tsx` (54 lines: `Money`, `StatusBadge`, `TYPE_LABEL`, `PageHeader`, `Empty`, `Stat`, `dateFmt`), and the form kit in `src/components/form.tsx` (`ActionForm`, `Field`, `FormError`, `SavedNote`, `SubmitButton`, `useFormValues`). There is no `Button`, `Card`, `Badge`, `Table`, `Tabs`, `Dialog`, `Toast`, `Input` or `Chart` component.
- **Tokens exist and are good** (`--bg --surface --surface-2 --ink --muted --line --brand --good --bad --warn-soft`, three fonts, three easings, durations). The problem is not the palette, it is that ~80 percent of the files bypass it.
- **No component tests exist.** `vitest.config.mts` is `environment: "node"`, there is no `@testing-library`, no jsdom, no `*.test.tsx`, no Playwright. All 33 test files cover `src/lib`, `src/app/actions`, `src/app/api`. Nothing asserts any class name, heading, or JSX text. So the UI can be rebuilt freely; the only copy-coupled tests are the ones in section 4.
- **Missing route-level files:** there is no `not-found.tsx`, `error.tsx`, `loading.tsx` or `global-error.tsx` anywhere. `notFound()` is called in about 15 pages and renders the Next default 404. Every `Suspense` fallback is the blank page.
- **`public/`** holds only the five create-next-app SVGs (`file.svg globe.svg next.svg vercel.svg window.svg`). No OG image, no icon beyond `favicon.ico`.
- **Rule conflicts with the repo's own CLAUDE.md/DESIGN.md:** emoji used as UI (`🎉 🔒 ⚡ 🛡️`), 3-up card grids (storefront, library), pills and tiny text everywhere. DESIGN.md says brand is ink `#16130f`; `RazorpayButton.tsx` passes `theme: { color: "#5b3df5" }` (the old indigo) and `HomeInteractiveDemo` hardcodes `#4f46e5`.

---

## 1. Routes (every `page.tsx`, plus layouts)

### 1.1 Public marketing and auth

| Route / file | Purpose | Who | Primitives used | Visible problems | Test coupling |
|---|---|---|---|---|---|
| `app/layout.tsx` (32) | Root: three `next/font` families, metadata | all | none | Title string "sell courses, memberships & live sessions" is generic; `description` is feature-list copy | none |
| `app/(site)/layout.tsx` (11) | `SiteNav` + `<main>` + `SiteFooter` shell | P, A | `SiteNav`, `SiteFooter` | Also reused by dashboard (DashNav console re-imports `SiteNav` separately, so the shell is not truly shared) | none |
| `app/(site)/page.tsx` `/` (207) | Landing: ledger sample, interactive demo, honest status list, fee table, CTA | P | `btn`, `.table`, `HomeInteractiveDemo`, `lib/money` | Best page in the repo, already ledger-led. Issues: `text-xs uppercase tracking-wider` eyebrow repeated 6 times, `font-mono text-xs` tag chips ("Beta", "Test mode"), fee table is the raw `.table` with `min-w-[560px]` and a mask-image hack for scroll, the sale price `2999` and `18` GST are hardcoded constants instead of coming from `lib`. Headings use mixed weights (`font-semibold` here vs `font-extrabold` elsewhere) | none. Figures come from `feeBreakdown`/`planRates` which have unit tests in `money.test.ts`, but the rendered strings are not asserted |
| `app/(site)/login/page.tsx` (26) | Log in page | P | `card`, `LoginForm` | Centered narrow card (fine). "Welcome back" heading is generic. Demo-account autofill box lives in `LoginForm` | `auth.test.ts` tests the `login` action only |
| `app/(site)/signup/page.tsx` (26) | Sign up (role aware) | P | `card`, `SignupForm` | Dead ternary: `role = sp.role === "creator" ? "creator" : next ? "learner" : "learner"`. Same layout as login, duplicated page chrome | `auth.test.ts` redirects only |
| `app/(site)/demo/page.tsx` (288) | "Gateway Simulation Playground": switch preferred gateway, start a test checkout, reset enrolment | A (needs login) | `ActionForm`, `SubmitButton`, `Money`, `gateway-icons`, `GATEWAYS` | Worst offender of the AI look: all-caps "INTERACTIVE FINTECH SANDBOX" pill with pulsing dot, `rounded-[28px]` and `rounded-[22px]` (off-scale radii), two gateway radio-cards with six check glyphs `✓` in `text-good`, "Under the Hood: Enterprise Financial Ledger Integration" buzzword block, `shadow-brand/20` coloured shadows, `text-[11px]`. Copy contradicts DESIGN.md rule 5 | `auth.test.ts` and `checkout.test.ts` assert `REDIRECT:/demo` from actions only, not the page |
| `app/(site)/c/[handle]/page.tsx` (62) | Creator storefront | P | `BrandScope`, `Avatar`, `Empty`, `Money`, `TYPE_LABEL`, `card`, `badge-brand` | Classic 3-column product card grid with a type pill on every card, `hover:-translate-y-0.5 hover:shadow-lg` (a third hover recipe, not `card-hover`), `p-6` on every card, `text-3xl font-extrabold` hero band on `bg-brand-soft/60`, Avatar is a rounded-2xl letter tile | none |
| `app/(site)/c/[handle]/[slug]/page.tsx` (113) | Product detail + sticky buy box | P (owner sees edit) | `BrandScope`, `Avatar`, `Money`, `TYPE_LABEL`, `card`, `badge` | Reasonable two-column layout. Issues: `kindLabel` map duplicated from `LessonForm`'s `KIND_LABEL` (and one says "Reading", the other "Text"), curriculum list is a numbered `.card` with a muted pill per row, three-bullet reassurance list in `text-muted`, `shadow-sm` mixed with `.card`'s own shadow, `text-5xl font-extrabold` title | none |
| `app/(site)/certificates/[publicId]/page.tsx` (61) | Public verifiable certificate, printable | P | `BrandScope`, `Logo`, `PrintButton` | Genuinely different surface and mostly fine. Issues: `✓` glyph for "Verified", `rounded-3xl border-2` double border, `!text-base` important override on Logo, revoked state is a bare centred block with no `card`, no `not-found` styling | none |

### 1.2 Checkout (learner, money path)

| Route / file | Purpose | Who | Primitives | Problems | Tests |
|---|---|---|---|---|---|
| `app/(site)/checkout/[productId]/page.tsx` (105) | Order review, coupon (GET form), summary | L | `ActionForm`, `SubmitButton`, `FormError`, `Money`, `card` | Coupon form is a raw `<form method="get">` with a raw `<input className="input uppercase">` instead of `Field`. Section labels `text-sm font-semibold uppercase tracking-wide text-muted` repeated. Coupon reason strings (`reasonText`) live in the page. Right summary column is a stack of `dl` rows with ad-hoc `flex justify-between` | `lib/money.test.ts` covers `priceOrder`; copy is not asserted |
| `app/(site)/checkout/pay/[orderId]/page.tsx` (108) | Payment: picks Razorpay live button, Easebuzz phone form, or mock `DemoPayPageClient` | L | `ActionForm`, `Field`, `Money`, `RazorpayButton`, `DemoPayPageClient` | Title Case marketing headings ("Complete Your Purchase", "Secure Payment" pill), `text-[10px] font-bold uppercase tracking-widest`, `rounded-[24px]`, `font-black`, GST hardcoded as "Includes 18% GST" (ignores `product.gstRatePct`, this is a copy bug as well as a design issue), `new Intl.NumberFormat` inlined instead of `formatINR`, inline `<strong>Test mode.</strong>` warn box | `checkout.test.ts` asserts action errors (`/10-digit/`, `/couldn't reach the payment gateway/`) that originate in `actions/checkout.ts` and render through `FormError` |
| `app/(site)/checkout/success/[orderId]/page.tsx` (34) | Order confirmation | L | `Money`, `card` | `✓` glyph in a `bg-good-soft rounded-full text-2xl` circle, "You're in!" exclamation copy, two `btn-lg` buttons side by side | none |
| `app/gateway/easebuzz/[orderId]/page.tsx` (30) and `EasebuzzHostedPage.tsx` (510) | Simulated Easebuzz hosted page with 15 min timer | L (test mode only) | `gateway-icons` | **Intentional replica**, so brand blue/emerald is legitimate, but it is built from 71 raw palette classes (`slate-*`, `emerald-*`, `#0b1c33`, `#061220`, `#071324`), 13 uses of `text-[10px|11px]`, `rounded-[24px]`, `✓ ✕` glyphs on simulate buttons. Must stay out of the shared theme and be isolated as a "replica skin" | `easebuzz/routes.test.ts` tests the return route only |

### 1.3 Learner library

| Route / file | Purpose | Who | Primitives | Problems | Tests |
|---|---|---|---|---|---|
| `app/(site)/library/page.tsx` (41) | Owned products grid | L | `Empty`, `TYPE_LABEL`, `dateFmt`, `card`, `badge-muted` | Same 3-up card grid as storefront, same pill. No progress bar even though progress data exists in `loadCourse`. Does not show last lesson | none |
| `app/(site)/library/[productId]/page.tsx` (198) | Course player: sidebar outline, lesson body, video embed, progress, certificate banner | L | `QuizPlayer`, `card`, `badge-good`, `completeLesson` | Biggest functional page. Issues: emoji `🎉` and `🔒` (twice), raw `bg-black`, `text-white/35` watermark, `text-[11px]` status dot, progress bar hand-rolled (duplicated in `MemberCard`), local `fmt` date function (a 4th date formatter), local `NOTICES` alert box, `lockText` copy in page, `h-2.5` bar vs `h-2` bar elsewhere, `text-xs font-bold uppercase tracking-wide` section label | `lib/learning/service.test.ts` and `drip.test.ts` cover data only |
| `components/QuizPlayer.tsx` (136) | Take a quiz, show result and reveal | L | `card`, `badge`, `btn`, `.err` | Option rows are hand-rolled radio cards (same pattern as SignupForm), result banners are three different `rounded-xl bg-*-soft px-4 py-3` paragraphs, `✓`/`·` text glyphs for correct options, "Continue →" arrow in label | `learning/quiz.test.ts` covers scoring |
| `app/(site)/orders/[orderId]/invoice/page.tsx` (72) | GST tax invoice, printable | L and C | `Money`, `dateFmt`, `PrintButton`, `.table`, `badge-bad` | Passable. Issues: footer "Test-mode payments carry no tax liability" disclaimer in `text-xs`, uses `card` for a paper document (should be a print-first surface), `font-mono` invoice number | `invoice.test.ts` covers number format only |

### 1.4 Community (learner, gated by purchase)

| Route / file | Purpose | Who | Primitives | Problems | Tests |
|---|---|---|---|---|---|
| `c/[handle]/community/layout.tsx` (72) | Shell: channel nav, member card, locked-out panel | L, C | `BrandScope`, `ChannelNav`, `MemberCard`, `card` | Three-column grid `lg:grid-cols-[200px_minmax(0,1fr)_240px]`, the no-access panel is a bare `card` with a heading and a sentence | `community/*.test.ts` cover access/data |
| `c/[handle]/community/page.tsx` (18) | Redirect to first channel | L | none | No UI | none |
| `c/[handle]/community/[channel]/page.tsx` (78) | Channel feed + composer | L, C | `PostCard`, `PostComposer`, `Empty`, `badge-muted` | Two more type pills ("Discussion", "All customers") top right, "Older posts" is a plain secondary button (no infinite scroll or count) | `community/posts.test.ts` data only |
| `c/[handle]/community/[channel]/p/[postId]/page.tsx` (71) | Thread with comments | L, C | `PostCard`, `CommentForm`, `EditPostForm`, `LikeButton`, `ConfirmButton` | Comments are each a full `card` (heavy stacking), `text-[15px]` one-off size, author header pattern duplicated from `PostCard`, `<details className="card">` for edit | none |
| `c/[handle]/community/leaderboard/page.tsx` (68) | Leaderboard, week/all-time | L, C | `Empty`, hand-rolled tab links | Local `tab()` helper is a third Tabs implementation, `Level N` badge on every row, rank column `w-7`, no avatar | `gamification/service.test.ts` asserts no email in output |

### 1.5 Creator console (`app/dashboard`)

| Route / file | Purpose | Who | Primitives | Problems | Tests |
|---|---|---|---|---|---|
| `dashboard/(console)/layout.tsx` (23) | Console shell: `SiteNav` + side nav | C | `SiteNav`, `DashNav` | Public marketing nav (Checkout demo, Fees, Sample storefront) sits above a creator tool. Side nav is a plain link stack, no icons, no grouping, no current-store switcher | none |
| `dashboard/(console)/page.tsx` (106) | Overview: 4 stats, 14-day bar chart, setup checklist, recent orders | C | `Stat`, `PageHeader`, `StatusBadge`, `Money`, `CopyLink`, `card` | Four equal `Stat` cards in a row (the classic AI dashboard), hand-rolled div bar chart with `title=` tooltips only (not keyboard accessible), raw `₹${(v/100).toLocaleString}` string bypassing `Money`, checklist uses `✓` in a circle, no date axis ticks beyond first/last, no period selector | none (insights data tested in `insights.test.ts`) |
| `dashboard/(console)/products/page.tsx` (42) | Product list table | C | `.table`, `StatusBadge`, `Empty` | Plain table, no search, sort or row actions, status badge pill | none |
| `dashboard/(console)/products/new/page.tsx` (15) | New product | C | `PageHeader`, `ProductForm`, `card` | Form capped at `max-w-2xl`, no preview of the storefront card | none |
| `dashboard/(console)/products/[id]/page.tsx` (221) | Edit product, curriculum builder, insights | C | `Stat`, `ActionForm`, `Field`, `LessonForm`, `ProductForm`, `ConfirmButton`, `<details>` | Heaviest creator page. Another 4-up `Stat` row, accordion done with `<details>` per lesson plus inline forms, move up/down as `↑ ↓` text buttons (no drag), `badge` pill per row (drip, optional, kind) up to three on one line, "Danger zone" is plain text with a `btn-danger`, `window.confirm` for delete | `learning/admin.test.ts`, `drip.test.ts` data only |
| `dashboard/(console)/products/[id]/quiz/[itemId]/page.tsx` (64) | Quiz editor + stuck learners | C | `QuizEditor`, `PageHeader`, `card` | Back link as plain text, no breadcrumb | `quiz.test.ts` (validation strings) |
| `dashboard/(console)/orders/page.tsx` (64) | Orders table with status filter and refund | C | `.table`, `StatusBadge`, `ConfirmButton`, `Empty` | Filter tabs are `btn btn-sm btn-primary/secondary` with `role="tab"` (second Tabs implementation, wrong visual weight), `capitalize`, refund via `window.confirm`, disclaimer in `text-xs`, no pagination (`take: 200`) | `orders.test.ts` data |
| `dashboard/(console)/learners/page.tsx` (38) | Learner list | C | `.table`, `Empty` | Three columns, no progress or last-active, no export | none |
| `dashboard/(console)/coupons/page.tsx` (54) | Coupon list + new coupon | C | `CouponForm`, `<details>`, `badge-*` | `status` variable remaps "used up" to `"failed"` then back (confusing), `<code>` chip for code, list of `.card` details rows | `validation.test.ts`, `money.test.ts` data |
| `dashboard/(console)/payouts/page.tsx` (60) | Ledger stats + ledger table | C | `Stat`, `.table`, `Empty`, `Money` | 4-up Stat again, ledger table with `text-right tabular-nums` repeated per cell (should be a `Money` cell), minus sign typed as a literal `−` | `orders.test.ts` covers ledger math |
| `dashboard/(console)/settings/page.tsx` (30) | Store profile and brand colour | C | `Field`, `ActionForm`, `SavedNote` | Raw `<input type="color">` styled inline, no live preview of the storefront with the picked colour, "handles can't be changed yet" in a sentence | none |
| `dashboard/(console)/community/page.tsx` (109) | Channel admin, bans, gamification toggle | C | `ChannelForm`, `<details>`, `ConfirmButton` | `<details>` accordions again, toggles are secondary buttons, no real Switch | `community/channels.test.ts` data |
| `dashboard/onboarding/page.tsx` (30) | First-time store creation | A | `SiteNav`, `Field` | Same narrow-card layout as login, no steps | none |

API routes (`api/easebuzz/return`, `api/webhooks/easebuzz`, `api/webhooks/razorpay`) render no UI. `app/actions/*.ts` return error strings that surface through `FormError`; see section 4.

---

## 2. Components (`src/components`)

| File (lines) | Purpose | Who | Uses | Problems | Test coupling |
|---|---|---|---|---|---|
| `ui.tsx` (54) | `Money`, `StatusBadge`, `TYPE_LABEL`, `PageHeader`, `Empty`, `Stat`, `dateFmt` | all | `formatINR`, CSS classes | Only shared primitive file. `Stat` is `text-2xl sm:text-3xl` big-number card with no delta/sparkline slot. `StatusBadge` prints the raw enum (`created`, `failed`) as the label. `Money` renders text only (no `tabular-nums`, no tone, no paise styling). `dateFmt` is one of 5 date formatters | none |
| `form.tsx` (133) | Form kit: `ActionForm`, `Field`, errors, submit, `useFormValues` | all forms | `.input`, `.label`, `.hint`, `.err` | Solid logic (handles React 19 form reset). No `Select`, `Checkbox`, `Radio`, `Switch`, `Textarea` components, `Field` does all three via `as=`. `prefix` is a text span not an input group | `auth.test.ts` tests actions that feed it |
| `SiteNav.tsx` (57) | Top nav and footer | P, A | `Logo`, `navLink` string, `btn` | Nav shows marketing links to creators, `text-[13px]` links, no mobile menu (links just `hidden sm:inline-flex`, so on phones only login/signup remain), footer is one line | none |
| `DashNav.tsx` (36) | Creator side nav | C | `usePathname` | One-off active style (`bg-brand-soft text-brand`) copied into `ChannelNav` and leaderboard tabs | none |
| `Brand.tsx` (20) | `BrandScope`, `Avatar` | P, L | `readableOn` | Fine. Avatar is a letter tile only, no image support | `color.test.ts` for `readableOn` |
| `Logo.tsx` (12) | SVG wordmark | all | CSS vars | Fine. Callers override size with `!text-base` | none |
| `ConfirmButton.tsx` (18) | `window.confirm` wrapper | C | none | Native browser dialog is the only confirmation UI (used 9 times). Needs a real `Dialog` | none |
| `CopyLink.tsx` (26) | Copy store link | C | `btn` | No icon swap or spring tick (CLAUDE.md asks for one), no toast | none |
| `PrintButton.tsx` (5) | `window.print()` | L, P | `btn` | Fine | none |
| `LoginForm.tsx` (84) | Login + demo autofill | P | `btn`, raw inputs | Does not use `Field` (raw `label`/`input`), three `!important` overrides, `text-[10px]` micro-labels, "1-Click Fill" badge, demo box is a second card inside a card | none |
| `SignupForm.tsx` (113) | Signup, role radio-cards, gateway radio-cards | P | `Field`, `ActionForm` | Emoji `⚡` and `🛡️`, `● Selected / ○ Select` text glyph, `rounded-2xl` vs `rounded-xl` next to each other, `text-[10px]`, "Select Gateway for Checkout Demo" in a signup form is a demo concern leaking into onboarding | `auth.test.ts` posts `preferredGateway` |
| `ProductForm.tsx` (48) | Product create/edit | C | `Field`, `TYPE_LABEL`, `GST_RATES` | Fine structure. Selects have no styling beyond `.input`, price prefix is text | none |
| `CouponForm.tsx` (49) | Coupon create/edit | C | `Field` | Type switch is a `<select>` that swaps a field (should be a segmented control) | none |
| `LessonForm.tsx` (106) | Lesson create/edit | C | `Field`, `KIND_LABEL`, `DRIP_LABEL` | `!border-dashed` override, label maps duplicated from `ui.tsx` and the product page | none |
| `QuizEditor.tsx` (96) | Quiz authoring | C | `card`, `btn`, `.input` | Outside-the-form trick is correct but visually a stack of nested `card`s each with 3 rows of controls; `✕` glyph button | none |
| `QuizPlayer.tsx` (136) | See 1.3 | L | | | |
| `RazorpayButton.tsx` (67) | Real Razorpay checkout launcher | L | `btn` | `theme: { color: "#5b3df5" }` is the old indigo, contradicts brand ink | none |
| `RazorpayDemoModal.tsx` (561) | Razorpay replica modal | L (test mode) | `gateway-icons` | Replica. 79 raw palette classes, 16 `text-[10|11px]`, `✕ ✓` glyphs, 16 `rounded-xl` plus `rounded-[24px]`, hand-written focus trap (Esc handler, `role="dialog"`) that a shared `Dialog` should own | none |
| `DemoPayPageClient.tsx` (195) | Gateway chooser + pay button on `/checkout/pay` for mock mode | L | `gateway-icons`, `GATEWAYS` | Amber sandbox banner (`bg-amber-500/10`), radio-cards with `● Selected / ○ Select`, `shadow-lg shadow-brand/20`, `text-[10|11px]`, `Pay ₹… via Razorpay Modal` button, `formattedAmount` via `toLocaleString` instead of `formatINR`. Third copy of the gateway radio-card | none |
| `HomeInteractiveDemo.tsx` (659) | Landing demo: Razorpay QR, Easebuzz hosted, fee calculator | P | `lib/money`, inline QR SVG | Biggest file in the repo. 38 raw palette classes (`bg-white` x20, `text-white` x11, `bg-stone-900`, `#0f172a` x29 in a hand-drawn QR, `#4f46e5`, `#E65100`, `#12233c`), tab switcher is a fourth Tabs impl, `text-[11px]` x11, `bg-amber-500/20`, `✕` glyph, countdown and calculator state in one component | none |
| `gateway-icons.tsx` (222) | Brand SVGs (UPI, GPay, Visa, banks) plus generic Lock/Shield/Clock/QR/Card/Bank/Wallet | P, L | none | 22 exports including four alias exports (`GooglePayIcon`, `BhimUpiIcon`, `ShieldCheckBadge`, `LockBadge`). The generic icons (Lock, Shield, Clock, Bank, Wallet, QR, Card) are the only icon set in the app, and there are no arrows, check, x, chevron, plus, copy, trash or search icons, which is why the code uses text glyphs | none |
| `community/ChannelForm.tsx` (77) | Channel create/edit | C | `Field` | Product multi-select is a bare checkbox list | none |
| `community/ChannelNav.tsx` (31) | Channel list nav | L, C | `usePathname` | `text-[10px]` News/Gated micro-labels | none |
| `community/CommentForm.tsx` (14) | Add comment | L, C | `Field` | Label "Add a comment" above a textarea, fine | none |
| `community/EditPostForm.tsx` (18) | Edit post | L, C | `Field` | | none |
| `community/LikeButton.tsx` (19) | Like toggle | L, C | `btn` | Heart SVG inline (only inline icon outside `gateway-icons`), `btn-primary` when liked makes every liked post a solid black button | none |
| `community/MemberCard.tsx` (38) | Level, points, streak, badges | L | `BADGES`, `card` | Badge pills with dashed border for unearned, hand-rolled progress bar | `core2.test.ts` asserts badge keys, label and description exist, not their text |
| `community/PostCard.tsx` (56) | Post in feed and thread | L, C | `card`, `LikeButton`, `ConfirmButton` | Pinned = `border-brand/40`, author row has 4 inline badge/pill variants, action row has up to 5 buttons (Like, comments, Pin, Ban author, Delete) | none |
| `community/PostComposer.tsx` (17) | New post | L, C | `Field` | | none |
| `community/format.ts` (3) | `stamp()` date formatter | L, C | `Intl` | 4th date formatter | none |

---

## 3. `src/lib` files that render copy

None of these have tests on their strings except where noted.

| File | Copy it owns | Rendered by | Test coupling |
|---|---|---|---|
| `lib/money.ts` | `formatINR`, `planRates` (percent labels), `feeBreakdown`, coupon rejection codes | `Money`, landing, ledger | **Yes**: `money.test.ts` asserts `₹499`, `₹499.50`, `₹1,23,456` exactly. Do not change `formatINR` output |
| `lib/gamification/badges.ts` | `BADGES` labels and descriptions (5) | `MemberCard` | `core2.test.ts` asserts keys and that label/description are truthy only. Text is free to change |
| `lib/gamification/levels.ts` | level numbers (no names) | `MemberCard`, leaderboard | `core.test.ts` data |
| `lib/payments/gateways.ts` | `GATEWAYS` name and blurb | demo page, `DemoPayPageClient` | `gateways.test.ts` asserts ids and resolver, not blurbs |
| `lib/demo.ts` | demo handle and password | `SiteNav`, `LoginForm` | none |
| `lib/validation.ts` | `PRODUCT_TYPES`, `GST_RATES`, `LESSON_KINDS`, `DRIP_TYPES`, field error strings | forms via `FormError` | `validation.test.ts` asserts shapes; some error text matched |
| `lib/learning/quiz.ts` (`validateQuizDefinition`) | Quiz author errors | `QuizEditor` | **Yes**: `quiz.test.ts` regex matches `/question/i`, `/prompt|question/i`, `/2/`, `/6/`, `/exactly one/i`, `/correct/i`, `/option/i` |
| `lib/learning/admin.ts` (`lessonAddProblem`) | "unpublish first" error | product page `?error=` | **Yes**: `admin.test.ts` matches `/unpublish/i` |
| `lib/learning/service.ts`, `drip.ts` | lock reasons, notices | library page | data-only tests, no string asserts |
| `lib/orders.ts`, `lib/community/*.ts` | `AppError` messages (15 in `orders.ts`, 3 each in `channels.ts` and `posts.ts`) | action error boundaries | `orders.test.ts` asserts `providerOrderId` and invoice regex, not messages |
| `app/actions/checkout.ts` | "Enter a valid 10-digit mobile number.", "We couldn't reach the payment gateway. Please try again." | `FormError` | **Yes**: `checkout.test.ts` matches `/10-digit/` and `/couldn't reach the payment gateway/` |
| `lib/invoice.ts` | invoice number format only | invoice page, success page | `invoice.test.ts`, `orders.test.ts` regex `^TP\/\d{4}-\d{2}\/\d{5}$` |
| `lib/color.ts` | `readableOn` | `BrandScope` | `color.test.ts` |

**Net coupling:** to keep the suite green the rebuild must preserve (1) `formatINR` output, (2) the regex-matched substrings in `quiz.ts`, `admin.ts`, `actions/checkout.ts`, (3) `REDIRECT:/demo` targets in actions. No JSX text, class name or DOM structure is asserted anywhere.

---

## 4. Anti-pattern census (counts from grep)

| Pattern | Count | Where concentrated |
|---|---|---|
| `text-[9|10|11px]` (tiny text) | 63 | `RazorpayDemoModal` 16, `EasebuzzHostedPage` 13, `HomeInteractiveDemo` 11, `DemoPayPageClient` 6, `LoginForm` 4, `checkout/pay` 4 |
| Hardcoded Tailwind palette (`slate/blue/emerald/amber/*-NNN`, `bg-white`, `text-white`, `bg-black`) | 195 | `RazorpayDemoModal` 79, `EasebuzzHostedPage` 71, `HomeInteractiveDemo` 38, `DemoPayPageClient` 4, `library/[productId]` 3, `demo` 1. **Zero in the other 55 files**, so the token system is respected outside the gateway/demo surfaces |
| Raw hex in JSX (outside `globals.css` and `gateway-icons`) | ~45 | QR drawing (`#0f172a` x29), `#4f46e5`, `#E65100`, `#12233c`, `#0b1c33`, `#061220`, `#071324`, `#5b3df5` |
| Off-scale radii (`rounded-[22|24|28px]`) | 5 | `demo`, `checkout/pay`, both gateway replicas |
| Radius mix on one screen | `rounded` / `-md` / `-lg` / `-xl` / `-2xl` / `-3xl` / `-full` all used | `.card` is `rounded-xl`, `.btn` is `rounded-xl`, `.btn-sm` is `rounded-lg`, `.input` is `rounded-xl`, Avatar `rounded-2xl`, certificate `rounded-3xl`, badge `rounded-full`, code chips `rounded-md` |
| Emoji / text glyph as icon (`🎉 🔒 ⚡ 🛡️ ✓ ✕ ● ○ → ← ↑ ↓ ↗`) | ~60 | `library/[productId]`, `SignupForm`, `demo`, both gateway replicas, `HomeInteractiveDemo`, `QuizPlayer`, `QuizEditor`, product page |
| 3-up (or 4-up) equal card grids | 7 | storefront, library, dashboard Stat rows (x3 pages), gateway radio-cards, `demo` |
| Type/status "pill" next to every title | 9 pages | storefront, library, product, channel header, leaderboard rows, curriculum rows, order rows, coupon rows, `PostCard` author row |
| `!important` Tailwind overrides to fight `.btn` or `.input` | 8 | `LoginForm` 3, `SiteNav`, `certificates`, `LessonForm`, `QuizEditor`, `products/[id]` |
| `window.confirm` as the only confirmation UI | 9 call sites via `ConfirmButton` | products, orders, coupons, community admin, `PostCard`, thread page |
| Hover recipes | 3 | `.card-hover` (unused in pages), `hover:-translate-y-0.5 hover:shadow-lg` (storefront, library), `hover:bg-surface-2` |
| Date formatters | 5 | `ui.dateFmt`, `library` `fmt`, `certificates` `longDate`, `dashboard` `istDay`/`istDate`, `community/format.stamp` |
| INR formatters outside `Money`/`formatINR` | 5 | `checkout/pay` (`Intl` inline), `DemoPayPageClient`, `dashboard/page` chart title, `landing` `toLocaleString`, `HomeInteractiveDemo` |
| Hardcoded GST "18%" ignoring product rate | 3 | `checkout/pay`, `demo` (visible copy bug, not only design) |

---

## 5. Cross-cutting primitives: missing or duplicated

| Primitive | Status today | Duplicates / evidence | Recommendation |
|---|---|---|---|
| **Button** | CSS only (`.btn .btn-primary .btn-secondary .btn-ghost .btn-danger .btn-sm .btn-lg`) | `SubmitButton` hardcodes `"btn btn-primary"`; 8 `!` overrides; `LikeButton` flips to `btn-primary`; `ConfirmButton` takes a `className`; filter tabs misuse buttons; no icon slot, no loading spinner, no `asChild`/`Link` variant | `Button` + `ButtonLink` with `variant`, `size`, `loading`, `icon`; keep `.btn` as the style source |
| **Card / Surface** | CSS only (`.card`, `.card-hover`) | `p-5`, `p-6`, `p-8`, `p-8 sm:p-10`, `px-5 pb-5 pt-4`, `px-5 py-3` all hand-chosen per use; storefront and library each re-implement hover; invoice/certificate use `.card` for paper | `Surface` with `tone` (default, inset, paper, interactive) and `Section`/`Panel` with header slot. Rhythm via three named paddings, not per-page |
| **Badge / Pill** | CSS only (`.badge-*`) plus `StatusBadge` | `badge-brand` type pills, `font-mono text-xs text-good` tag on landing, `rounded-full text-[10px] uppercase` gateway tags (x3), mapping dicts (`statusStyle`, coupon `status` remap) | `Badge` (neutral/good/bad/warn/brand + dot) and `StatusBadge` with human labels ("Pending", not `created`). Remove most pills from titles |
| **Table** | CSS only (`.table`) | 7 tables, each hand-wraps `card overflow-x-auto`, repeats `text-right tabular-nums`, no sticky header, no empty or loading state, no mobile card fallback | `DataTable` primitives (`Table`, `Th`, `Td`, `MoneyCell`, `DateCell`, `RowActions`) |
| **Input / Field** | `.input` + `Field` | `LoginForm` bypasses `Field`; checkout coupon is raw `<input>`; `QuizEditor` raw textareas; `settings` raw colour input; `select` inherits `.input` (native arrow); prefix is a text span | `Input`, `Textarea`, `Select`, `Checkbox`, `RadioCard` (one component replaces 5 hand-built radio-cards), `Switch`, `ColorField`, `InputGroup` (prefix/suffix) |
| **Tabs / SegmentedControl** | none | 5 implementations: `DashNav` link style, `ChannelNav`, leaderboard `tab()`, orders filter `btn`, `HomeInteractiveDemo` switcher, plus `upiMode` tabs in both replicas | `Tabs` (link-based and state-based) with the animated indicator CLAUDE.md asks for; `SegmentedControl` for 2-3 options |
| **Dialog / Confirm** | none (native `window.confirm`; Razorpay replica has own modal) | `ConfirmButton` x9, `RazorpayDemoModal` hand-rolled Esc and `aria-modal` | `Dialog` (focus trap, 220ms expo-out, reduced motion) + `ConfirmDialog` replacing `ConfirmButton` |
| **Toast / Notice** | none | 8 inline `rounded-xl bg-bad-soft px-4 py-3` alerts (`?error=` params, `NOTICES`, `FormError`), `SavedNote`, `couponNote`, amber test-mode strips (x3), `warn-soft` draft strip | `Callout` (inline, 4 tones, optional action) and `Toast` for "Saved", "Copied" (replaces `SavedNote`/`CopyLink` state) |
| **Stat / Metric** | `ui.Stat` | 4-up rows on 3 pages; no delta, no sparkline, no unit, no loading; big `text-3xl` in a bordered card | `Stat` (inline, no card) + `StatStrip` (hairline-separated row) with optional delta and sparkline; `MetricRow` for dl lists (checkout summary, invoice totals, landing ledger all hand-roll `flex justify-between`) |
| **Chart** | none | One hand-rolled div bar chart on overview; progress bars x2; fee calculator in demo | `BarChart`/`Sparkline` SVG (no dependency) with axis ticks, focus tooltips, `Money` formatting; `Progress` (bar) used by library, `MemberCard`, course completion |
| **EmptyState** | `ui.Empty` | Used 8 times, plus 3 ad-hoc empty paragraphs (coupons, community, "Nobody is banned"); no illustration or secondary action; always inside a `card` | `EmptyState` with icon slot, primary + secondary action, and `inline` variant |
| **PageHeader** | `ui.PageHeader` | Landing, storefront, product, library player, certificate, checkout, login/signup/onboarding each re-implement eyebrow + h1 + sub; no breadcrumb/back slot (back links are hand-written `← ...` in 4 pages) | `PageHeader` with `eyebrow`, `back`, `meta`, `actions`; plus `AuthShell` for the 3 narrow-card pages |
| **Money** | `ui.Money` (text only) | Bypassed in 5 places; no `tabular-nums` baked in; no negative/deduction style (`−` typed literally x6); no "free" handling (`p.pricePaise === 0 ? "Free" : <Money/>` x6) | `Money` with `tone`, `sign`, `free`, `size`, `as="plain|mono"`; one `Price` wrapper handling Free + "/ month" + GST note |
| **Icon set** | `gateway-icons.tsx` partial | Text glyphs stand in for icons (see census) | Add `icons.tsx` (check, x, arrow, chevron, plus, copy, lock, trash, search, external, drag, menu) in the same stroke style; delete the 4 alias exports |
| **Date/Time** | 5 formatters | see census | One `lib/format.ts` (`formatDate`, `formatDateTime`, `istDay`) and a `<Time>` component |
| **Avatar** | `Brand.Avatar` | Letter tile only; used in 3 places | Add image + size scale + status ring; use in leaderboard, comments, learners table |
| **Disclosure / Accordion** | none | `<details>` with ad-hoc summaries in 4 files (products, coupons, community admin, thread edit) | `Disclosure` with chevron and animated height, keyboard OK |
| **Layout shells** | partial | `AuthShell` pattern copied 3x; creator console re-renders marketing `SiteNav`; mobile nav missing | `AuthShell`, `ConsoleShell` (own top bar, collapsible sidebar, mobile drawer), `PublicShell` (mobile menu) |
| **Route boundaries** | none | No `not-found`, `error`, `loading` | Add `not-found.tsx`, `error.tsx`, `loading.tsx` (skeleton) at root and under `dashboard` and `library` |
| **Skeleton** | none | | `Skeleton` for table rows, stat strip, card |

---

## 6. Proposed rebuild order

Each chunk is 1-3 files, independently shippable, leaves `npm test`, `typecheck`, `lint` and `build` green, and does not change any string matched by a test (see section 3). Order is by dependency, then by traffic and money risk. Chunks within a wave have no dependency on each other and can run in parallel.

### Wave 0: foundations (blocks everything)

| # | Chunk | Files | Notes |
|---|---|---|---|
| 0.1 | Tokens and base layer | `src/app/globals.css` | Add a spacing/radius scale (`--r-sm/md/lg`, one card radius), type scale utilities (`.t-display`, `.t-eyebrow`, `.t-num`), focus ring token, `Skeleton` keyframes, remove the unused `.card-hover` or make it the single hover recipe. Keep all existing class names alive so nothing else breaks |
| 0.2 | Icon set and formatters | new `src/components/icons.tsx`, new `src/lib/format.ts` | 12-16 stroke icons; unify five date formatters and the INR inlines. Add `format.test.ts` |
| 0.3 | Core primitives | new `src/components/ui/button.tsx`, `badge.tsx`, `surface.tsx` (or one `primitives.tsx`) | `Button`, `ButtonLink`, `Badge`, `StatusBadge`, `Surface`. Re-export from `ui.tsx` so existing imports keep working |

### Wave 1: data and layout primitives (each independent)

| # | Chunk | Files |
|---|---|---|
| 1.1 | Money, Stat, Metric rows, Progress | `src/components/ui.tsx` (extend), new `src/components/ui/stat.tsx` |
| 1.2 | Table kit | new `src/components/ui/table.tsx` |
| 1.3 | Form controls | `src/components/form.tsx` (add `Select`, `Checkbox`, `RadioCard`, `Switch`, `InputGroup`, `Textarea`) |
| 1.4 | Tabs and SegmentedControl | new `src/components/ui/tabs.tsx` |
| 1.5 | Dialog, ConfirmDialog, Toast, Callout | new `src/components/ui/dialog.tsx`, `toast.tsx`; replace `ConfirmButton.tsx` body (same prop signature so the 9 call sites keep working) |
| 1.6 | Empty, PageHeader, Disclosure, Skeleton, Chart | `src/components/ui.tsx` (replace `Empty`, `PageHeader`), new `src/components/ui/chart.tsx` |

### Wave 2: shells and route boundaries

| # | Chunk | Files |
|---|---|---|
| 2.1 | Public shell + mobile nav + footer | `src/components/SiteNav.tsx`, `src/app/(site)/layout.tsx` |
| 2.2 | Console shell | `src/app/dashboard/(console)/layout.tsx`, `src/components/DashNav.tsx` (drop marketing nav, add own top bar, mobile drawer) |
| 2.3 | Route boundaries | new `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/dashboard/(console)/loading.tsx` |
| 2.4 | Auth shell | `src/app/(site)/login/page.tsx`, `signup/page.tsx`, `dashboard/onboarding/page.tsx` plus shared `AuthShell` |

### Wave 3: money path first (highest value, highest risk)

| # | Chunk | Files |
|---|---|---|
| 3.1 | Checkout review | `src/app/(site)/checkout/[productId]/page.tsx` (coupon `Field`, `MetricRow` summary) |
| 3.2 | Pay page chrome | `src/app/(site)/checkout/pay/[orderId]/page.tsx`, `src/components/DemoPayPageClient.tsx` (kill amber strip and glyph radio, use `RadioCard`; fix hardcoded 18% GST; use `formatINR`) |
| 3.3 | Success + invoice | `src/app/(site)/checkout/success/[orderId]/page.tsx`, `src/app/(site)/orders/[orderId]/invoice/page.tsx` |
| 3.4 | Razorpay launcher | `src/components/RazorpayButton.tsx` (theme color to `#16130f`) |

### Wave 4: public storefront and learner

| # | Chunk | Files |
|---|---|---|
| 4.1 | Storefront | `src/app/(site)/c/[handle]/page.tsx`, `src/components/Brand.tsx` (editorial list or 2-column feature instead of 3-up pill cards; avatar images) |
| 4.2 | Product detail | `src/app/(site)/c/[handle]/[slug]/page.tsx` |
| 4.3 | Library list | `src/app/(site)/library/page.tsx` (add progress) |
| 4.4 | Course player | `src/app/(site)/library/[productId]/page.tsx`, `src/components/QuizPlayer.tsx` (icons, `Progress`, `Callout`, `RadioCard`) |
| 4.5 | Certificate | `src/app/(site)/certificates/[publicId]/page.tsx` |

### Wave 5: creator console (can run in parallel once 1.1, 1.2, 1.4, 1.5 land)

| # | Chunk | Files |
|---|---|---|
| 5.1 | Overview | `src/app/dashboard/(console)/page.tsx` (stat strip, real chart, checklist) |
| 5.2 | Products list + new | `products/page.tsx`, `products/new/page.tsx`, `src/components/ProductForm.tsx` |
| 5.3 | Product editor | `products/[id]/page.tsx`, `src/components/LessonForm.tsx` |
| 5.4 | Quiz editor | `products/[id]/quiz/[itemId]/page.tsx`, `src/components/QuizEditor.tsx` |
| 5.5 | Orders | `orders/page.tsx` (Tabs, Table, ConfirmDialog) |
| 5.6 | Learners + payouts | `learners/page.tsx`, `payouts/page.tsx` (shared ledger `MoneyCell`) |
| 5.7 | Coupons | `coupons/page.tsx`, `src/components/CouponForm.tsx` |
| 5.8 | Settings with live brand preview | `settings/page.tsx` |

### Wave 6: community

| # | Chunk | Files |
|---|---|---|
| 6.1 | Shell and nav | `community/layout.tsx`, `src/components/community/ChannelNav.tsx` |
| 6.2 | Feed | `community/[channel]/page.tsx`, `src/components/community/PostCard.tsx`, `PostComposer.tsx` |
| 6.3 | Thread | `community/[channel]/p/[postId]/page.tsx`, `CommentForm.tsx`, `EditPostForm.tsx`, `LikeButton.tsx` (2 files over; split if needed) |
| 6.4 | Leaderboard and member card | `community/leaderboard/page.tsx`, `src/components/community/MemberCard.tsx` |
| 6.5 | Community admin | `dashboard/(console)/community/page.tsx`, `src/components/community/ChannelForm.tsx` |

### Wave 7: marketing and demo (last, because these are the most bespoke)

| # | Chunk | Files |
|---|---|---|
| 7.1 | Landing page | `src/app/(site)/page.tsx` (tokenise eyebrows, move constants to `lib`, new Table) |
| 7.2 | Home demo | `src/components/HomeInteractiveDemo.tsx` (extract QR to its own file, tokenise, use `Tabs`; this one file is 659 lines and should split into `demo/QrTab`, `demo/HostedTab`, `demo/FeeCalc` within the chunk) |
| 7.3 | Demo playground page | `src/app/(site)/demo/page.tsx` (rewrite, drop buzzword block) |
| 7.4 | Auth forms | `src/components/LoginForm.tsx`, `SignupForm.tsx` (move onto `Field`/`RadioCard`, drop gateway chooser from signup) |
| 7.5 | Gateway replicas, isolated skin | `src/components/RazorpayDemoModal.tsx`, `src/app/gateway/easebuzz/[orderId]/EasebuzzHostedPage.tsx` (keep brand blue/emerald on purpose, but put it behind a `data-skin="razorpay"` / `"easebuzz"` scope with CSS variables so there are no raw palette classes, swap hand-rolled modal for `Dialog`, replace glyphs with icons) |
| 7.6 | Housekeeping | `src/components/gateway-icons.tsx` (remove aliases, split brand logos from generic icons), `src/app/layout.tsx` (metadata), delete unused `public/*.svg` |

### Suggested gating per chunk

1. `npm test && npm run typecheck && npm run lint`.
2. Screenshot at 390, 768, 1280 px in light mode (project is light-only per DESIGN.md).
3. Dispatch `code-reviewer` before merge, per the CSO loop.
4. Do not rename `formatINR` output or the regex-matched error substrings listed in section 3.

### Open questions worth deciding before Wave 0

- Dark mode: settled as light only. `ui-rebuild/CLAUDE.md` says "light only, no dark mode" (the sibling `tysonpe/CLAUDE.md` lists dark values, which do not apply to this branch). Keep tokens semantic so dark could be added later, but do not build it.
- Whether to add `jsdom` + `@testing-library/react` (or Playwright) so the new primitives get tests. Today there is no UI test harness at all, which also means no regression net for this rebuild beyond manual screenshots.
- Is the gateway chooser meant to live in signup (`preferredGateway`) at all? It is a demo concern that makes real signup heavier. Section 7.4 assumes it moves to `/demo` only; confirm before touching `actions/auth.ts`.
