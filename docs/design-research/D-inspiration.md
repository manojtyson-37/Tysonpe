# D — Inspiration Research (Details.so, Refero, Design Spells)

Scope: reference mining for the Tysonpe UI rebuild. Nothing here copies third-party assets; every entry describes a *pattern* to re-implement from scratch with the ui-rebuild tokens (light only, no dark mode: warm paper `#fbfaf7`, ink `#16130f` also the primary button, hairline `#e4dfd3`, emerald `#0f7b4d` for money/success only; NO indigo/violet; Bricolage Grotesque display, Plus Jakarta Sans body, JetBrains Mono for figures/ledgers). Copy-honesty rule applies: every figure in this doc marked 'example' is a layout placeholder, never to ship as a claim.

## 0. Source reachability (honest status)

| Source | What was reachable | What was NOT |
|---|---|---|
| details.so | Homepage only. Confirms: component-level (not full-page) gallery of production sites; tags for Hero, Pricing-adjacent "Features/CTAs/Cards/Modals", Pinned scroll, Scroll animations, SaaS, Editorial, Minimal; "Get Code" copy-ready components; Pro/Vault tiers; MCP integration for AI tools; natural-language search. | `/collections` (404). Individual layout pages and the copyable prompts sit behind the paid tier, so no prompt text could be read or reproduced. |
| refero.design | Homepage returned only the tagline ("UI/UX Design Inspiration"). It is a JS-rendered, login/paywalled screen library. | `/pricing`, `/s/search?q=checkout` (empty/404). No actual screens or flows could be read via fetch. |
| designspells.com | Homepage: latest spells #335-#342 (Spotify SongDNA contributors carousel, ElevenLabs orb picker, ChatGPT snake minigame while image generates, skeuomorphic tear-off calendar, Sudoku a Day sheet transitions, Deel Pretzel Pong easter egg, Preview magnifier, Horizon onboarding gradient animation). Tag list: Button, Confetti, Animation, Motion, Transition, Easter Egg, Dynamic Island, etc. | `/spells`, `/spells?tag=button`, `/tags/button` (404). No per-spell detail pages readable. |

Consequence: section (a) references are **named real products whose screens are public** and that are the same ones Refero/Details typically catalog; they come from product knowledge plus Stripe docs, **not** from verified Refero pages. Anyone with a Refero login should spot-check the "Refero query" strings below. Section (b) timings are engineering recommendations validated against Tysonpe's CLAUDE.md motion rules (150ms fast / 220ms overlay), not measurements scraped from Design Spells.

Web search side-finding: Linear's motion is described as very quiet, mostly ~80-120ms transitions with no decorative animation, which matches the "speed and restraint" directive.

---

## (a) References: what to borrow (16)

Format: **Product — screen** · what to borrow · where in Tysonpe · Refero query to verify.

### Fintech checkout
1. **Stripe Checkout (hosted) — two-pane checkout.** Left pane is a quiet order summary (line items, quantity, tax line, total large and tabular); right pane is the form. Express wallet buttons sit on top, then a "Or pay with card" divider. Borrow: the summary/pay split, divider-label pattern, tax as its own line (maps to GST breakdown), a single dominant "Pay ₹X" button whose label carries the amount. Tysonpe: `/checkout`. Query: "Stripe checkout".
2. **Razorpay Standard Checkout — modal with method rail.** Modal over dimmed page; left rail of methods (UPI, Card, Netbanking, Wallet), right panel for the selected method, merchant name and amount pinned in a header. Borrow: left method rail with a sliding selected state, pinned amount header, UPI "intent / enter VPA / QR" sub-choices. Tysonpe: Razorpay simulation modal. Query: "Razorpay checkout" (India payment UX).
3. **Easebuzz / PayU style hosted redirect — session countdown page.** Full-page redirect with a "complete in 14:59" timer and a "do not press back" notice. Borrow: countdown ring plus textual clock, explicit return-to-merchant states (success, failed, cancelled). Tysonpe: Easebuzz simulation, 15-minute clock.
4. **Cash App / PhonePe / GPay — payment success screen.** Large amount, short confirmation, reference ID (UTR) with copy affordance, timestamp, "Share receipt" and "Done". Borrow: the amount-first success hierarchy, UTR copy chip, a restrained single celebratory motion. Query: "payment success".

### Creator storefront
5. **Gumroad profile/product page.** Dense editorial layout: product cover left, sticky purchase card right with price, "pay what you want", rating row, and file/format facts; creator bio as a compact strip. Borrow: sticky purchase card pattern and facts list, not the neo-brutal styling. Tysonpe: product page.
6. **Stan Store / Beacons link-in-bio storefront.** Single narrow column of large tappable offer rows with price chips, optimized for Instagram traffic. Borrow: row-based offer list on mobile (price chip right-aligned, tabular) rather than a card grid. Tysonpe: creator storefront mobile.
7. **Substack publication home.** Text-led, no hero illustration; masthead, latest posts as list rows, a persistent subscribe module. Borrow: typographic masthead for creator identity, list rows with metadata micro-labels.

### Course player
8. **Maven / Skool / YouTube course layout.** Video left (16:9), lesson list right with section accordions, per-lesson duration and completion tick, "Up next" autoplay bar; tabs under video (Notes, Resources, Discussion). Borrow: right-rail syllabus with progress ring in header, keyboard shortcuts hint (J/K or arrows), resume-where-you-left-off chip. Tysonpe: LMS player.

### Dashboard / analytics
9. **Stripe Dashboard — Home/Payments.** KPI row with a delta pill and sparkline, then a primary time-series chart with a period selector and a "compared to previous period" ghost line, then a recent-payments table with status pills. Borrow: ghost comparison line, hover crosshair tooltip showing both periods, status pills with colored dot. Tysonpe: creator dashboard revenue chart. Query: "Stripe dashboard".
10. **Linear Insights / Plain.com.** Dense, mono-numeric, keyboard-first tables with thin dividers and no card shadows. Borrow: table density, sticky headers, inline filter chips, `tabular-nums`. Tysonpe: payouts ledger, orders table.
11. **Wise — balance and transfer-fee breakdown.** Fee shown as an itemised equation (amount − fee = converted) with the "you save" comparison. Borrow: the itemised breakdown as visual equation for payout deductions (gross, platform fee, GST, TDS, net). Tysonpe: payout detail.

### Empty states
12. **Linear / Notion empty states.** One-line explanation, one primary action, a keyboard hint, and a faint ghosted preview of what a populated state looks like instead of a cartoon. Borrow: ghost-row placeholders (skeleton rows at 40% opacity with a caption overlay) for "no orders yet", with the exact first step ("Share your store link").

### Onboarding
13. **Stripe Atlas / Mercury onboarding.** Stepper in the left rail with step status, one question group per screen, inline validation, "Save and continue later". Borrow: left stepper with completed ticks, resumable progress. For India: PAN/GSTIN/bank/UPI verification as discrete steps with a verified badge each. Tysonpe: creator onboarding.
14. **Horizon (Design Spells #335) — onboarding gradient animation.** Referenced on Design Spells' homepage; a slow animated gradient as the onboarding backdrop. Borrow only the idea of one living, low-amplitude background element during onboarding, but do it in warm paper tones, never as a colour blur blob (anti-slop rule 1).

### Pricing table
15. **Linear / Vercel pricing.** Tier comparison as a dense table with sticky tier header and a monthly/annual toggle that animates the price digits. Borrow: comparison *table* with group headings instead of three equal cards, highlighted plan marked by an inked border and a "Most chosen" micro-label (not a glow). Tysonpe: creator plans (fee % per tier, T+1 vs T+0 settlement).

### Invoice / receipt
16. **Stripe hosted invoice page / Razorpay payment receipt.** Paper-like document on a muted canvas: header with invoice no., issue and due dates, bill-from/bill-to in two columns, line-item table, tax breakdown, total with amount-due emphasis, "Download PDF" and "Pay" actions pinned. Borrow: document-on-canvas framing (feels like paper, suits our warm palette), CGST/SGST/IGST split block, SAC code column, QR for UPI at the foot.

---

## (b) Micro-interactions for a payments product (14)

Global rules: fast controls 150ms `cubic-bezier(0.2,0,0,1)`; overlays 220ms `cubic-bezier(0.16,1,0.3,1)`; all motion gated by `@media (prefers-reduced-motion: reduce)` (framer-motion: `useReducedMotion()`); animate only `transform`/`opacity`.

| # | Interaction | Build | Duration / easing |
|---|---|---|---|
| 1 | **Copy-confirm tick** (UTR, VPA, invoice no., API key) | Two stacked SVG icons (copy, check) in one relative box. On click: copy via `navigator.clipboard.writeText`, then swap. Copy icon `scale 1 → 0.6, opacity → 0`; check icon enters `scale 0.5 → 1` with a spring (framer-motion `{type:'spring', stiffness:500, damping:18}`) and strokes in via `pathLength 0 → 1`. Colour flips to emerald `#0f7b4d`. `aria-live="polite"` announces "Copied". Revert after 1600ms. | swap 150ms; tick spring ~250ms; hold 1.6s |
| 2 | **Number count-up** (revenue, payout, cart total) | `useMotionValue` + `animate(mv, target, {duration:0.6, ease:[0.16,1,0.3,1]})`, render via `useTransform(mv, v => Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(v))`. Apply `tabular-nums` so width does not jitter. Trigger once on first viewport entry (`useInView`), and on change use a shorter 350ms. Note Motion's `AnimateNumber` needs a Motion+ licence; the hook approach above is free. | 600ms in, 350ms updates, expo-out |
| 3 | **Odometer digit roll** (price toggles monthly/annual, GST recalculation) | Per-digit column `overflow:hidden; height:1em`, inner stack 0-9 translated with `y: -digit * 1em` (`transition: transform 220ms cubic-bezier(0.16,1,0.3,1)`); stagger by 15ms per digit from the right. Pure CSS with a CSS variable `--d` works with no JS lib. | 220ms + 15ms stagger |
| 4 | **Countdown ring** (Easebuzz 15:00 session) | SVG `<circle>` with `stroke-dasharray = 2πr`, `stroke-dashoffset` driven by remaining/total (compute from `Date.now()` against a server expiry, never a naive decrementing interval). `transition: stroke-dashoffset 1s linear` per tick. Colour shifts ink → amber under 2:00 → red under 0:30. Digits `tabular-nums`; `role="timer"`, announce only at 5:00, 1:00, 0:10. | 1s linear step |
| 5 | **Button press** | `active:scale-[0.98] transition-all duration-150` plus 1px translateY; primary button loading state keeps width fixed, swaps label for a 14px spinner (`animate-spin`) and sets `aria-busy`. Disable double-submit. On success the label cross-fades to "Paid ₹X" with the emerald tick. | 150ms `(0.2,0,0,1)` |
| 6 | **Tab indicator** (Skiper-style segmented tabs, payment method rail) | framer-motion `layoutId="tab-pill"` on a `motion.span` rendered only inside the active tab so it glides between them (shared layout). CSS alternative: one absolutely positioned bar moved with `transform: translateX(var(--x)); width: var(--w)` measured from the active tab's `offsetLeft/offsetWidth`. | spring `{stiffness:600, damping:40}` ≈ 200ms, or 200ms `(0.2,0,0,1)` |
| 7 | **Skeleton shimmer** | Block with `background: linear-gradient(90deg, transparent, rgb(255 255 255 / .5), transparent)` on a `--line` base, `background-size:200% 100%`, `animation: shimmer 1.4s linear infinite` (translate `background-position`). Skeleton must match the final layout's exact heights to avoid shift. Reduced-motion: static tone, no sweep. Show only if load exceeds ~300ms to avoid flashes. | 1.4s linear loop |
| 8 | **Toast** | Stack bottom-right (bottom-center on mobile) using `AnimatePresence`; enter `y:12, opacity:0, scale:.98 → 0`, exit `opacity 0, y:-6`; auto-dismiss 4s, pause on hover/focus; progress hairline along the bottom shrinking with `scaleX 1 → 0`. Neighbours reflow with `layout` prop. Use `role="status"` (errors `role="alert"`). | 220ms `(0.16,1,0.3,1)` in; 150ms out |
| 9 | **Live emerald pulse dot** (webhook live, settlement live) | 8px dot + `::after` ring `animate-ping` (scale 1 → 2, opacity .6 → 0) at 2s. Keep to one pulse per screen. | 2s `cubic-bezier(0,0,.2,1)` loop |
| 10 | **Success moment** (payment confirmed) | Circle draws via `stroke-dashoffset` (350ms), tick path draws (250ms, 150ms delay), then amount counts up. A restrained confetti: 18-24 small paper-coloured rectangles (canvas, `requestAnimationFrame`, ~900ms), fired once, skipped under reduced motion. Design Spells' Confetti tag is the idea source; do not copy any specific brand's burst. | 600ms draw, 900ms confetti |
| 11 | **Error shake + inline reason** (declined card, wrong OTP) | On failure: container `x: [0,-6,6,-4,4,0]` over 300ms, field border to `--danger`, message slides down with `height: auto` via `AnimatePresence`. Keep focus on the first invalid field; do not clear the OTP boxes unless required. | 300ms, ease-out |
| 12 | **OTP input** | Six single-char boxes with auto-advance, paste-splitting, backspace-back; active box has a 2px ink ring and a blinking caret (`step-end` 1s). Verified state: boxes flip to emerald border sequentially with 40ms stagger. Use `autocomplete="one-time-code"` and `inputmode="numeric"`. | 150ms per box state |
| 13 | **Sheet / drawer transitions** (inspired by Design Spells #338 "smooth sheet transitions") | Bottom sheet on mobile, right drawer on desktop: `y: 100% → 0` / `x: 100% → 0` with `[0.16,1,0.3,1]`, backdrop `opacity 0 → .4`; drag-to-dismiss with framer-motion `drag="y"` and `dragConstraints`, dismiss at >120px or velocity >500. Trap focus; restore on close. | 220ms |
| 14 | **Chart hover crosshair and draw-in** | Revenue line draws in with `pathLength 0 → 1` (700ms, expo-out) once; hover shows a vertical hairline, an enlarged point, and a tooltip that follows with `transform` only (spring, no layout thrash) showing amount, delta vs previous period, and date. Bar/line values snap to nearest data point. | 700ms draw; tooltip spring stiffness 500 |
| 15 | **Staggered scroll reveal** (Animaster-style) | `whileInView={{opacity:1,y:0}}` from `{opacity:0,y:12}`, `viewport={{once:true, margin:'-10%'}}`, children stagger 40ms capped at 6 items. Only on marketing/landing; never on dashboard data. | 220ms, 40ms stagger |
| 16 | **Course progress ring on lesson complete** | Header ring `strokeDashoffset` tweens to new % (350ms); the lesson row's checkbox fills with a scale-pop (spring) and the row text gains a line-through-free dimming (opacity .6). "Up next" bar slides in. | 350ms ease-out |

Implementation note: centralise tokens as CSS variables (`--ease-ui: cubic-bezier(.2,0,0,1)`, `--ease-overlay: cubic-bezier(.16,1,.3,1)`, `--dur-fast:150ms`, `--dur-overlay:220ms`) and export matching constants for framer-motion so CSS and JS never drift.

---

## (c) Layout structures that avoid the generic AI look

The tell of "AI slop" is: centered hero, gradient blob, three equal feature cards with icon squares, centered testimonial row, centered CTA band. Replace with structures that carry information.

1. **Ledger hero.** Left 7 columns: a 56px Bricolage headline with one concrete claim ("Settled to your bank next working day, GST invoice attached"). Right 5 columns: a live, working checkout/payout simulator on a paper card with hairline border. No illustration, no blob. Below, a thin full-width strip of real figures (T+1 settlement, fee percentage and ₹ example taken from the real computed sale, not invented) separated by hairline verticals.
2. **Asymmetric 12-col rhythm.** Alternate section grids: 4/8, 7/5, 3/9, full-bleed. Micro-label (`text-xs uppercase tracking-wider text-muted`) in the narrow column acts as a margin note; content fills the wide column. Vary vertical padding per section (e.g. 72, 112, 88, 136) instead of uniform `py-24`.
3. **Receipt-as-feature-list.** Replace the 3-card feature grid with one tall "receipt" document showing GST split, platform fee, payout; feature explanations hang off its line items via numbered markers. Features are explained by the artifact, not by icons.
4. **Sticky-left narrative, scrolling-right proof** (Details.so "Pinned scroll" pattern). Left column sticky with step list (Create product / Share link / Get paid / File GST), right column scrolls through the real UI state for each step; active step highlighted by an indicator bar.
5. **Comparison table over pricing cards.** Dense table with sticky tier header, group rows (Fees, Settlement, Courses, Community), inline tick/dash glyphs from `gateway-icons.tsx`, the preferred tier flagged by an ink border and "Most chosen" label.
6. **Editorial creator storefront.** Masthead with creator name set big, a one-line bio, a stats line only from real data (offer count, joined date); no invented students/ratings, then an offer list as rows (cover thumb, title, 1-line promise, price chip, buy arrow) separated by hairlines; a featured offer breaks the grid at 2/3 width with the sticky purchase card.
7. **Document-on-canvas for receipts/invoices.** Muted canvas, centered paper sheet with a faint inner border and a perforated edge detail; action rail floats to the right on desktop, bottom bar on mobile.
8. **Dashboard with one hero chart and a ledger.** Top: a single KPI line (not 4 identical cards) as inline stats on a baseline: `Net revenue ₹X  ·  Orders N  ·  Refunds R%` (placeholder values from seed data only). Then chart at 2/3 with a right rail "Next payout" panel (amount, date, bank last4, countdown) and a table. Varied card sizes, no uniform `p-6`.
9. **Checkout as a calm two-pane.** Summary left (muted tone), pay pane right (white paper), method rail, GST line item, test-mode strip ("Test mode: no real card data"); no PCI/certification claims. Mobile collapses the summary into a top disclosure showing total.
10. **Empty states with ghost data.** Show the populated layout at 40% opacity with a caption and one primary action; includes a keyboard hint (`N` to create).
11. **Type-led section dividers.** Use oversized numerals or section indices ("03 / Payouts") in Bricolage, tabular, with hairline rules, instead of icon badges.
12. **Mono-accented data.** Set amounts and ledger figures in JetBrains Mono with tabular numerals and small-caps labels; the ink primary button is the single dominant action per viewport; emerald only for money-in/success.

### Anti-checklist for reviewers
- No blur blobs or centered 3-card grids; no emoji icons.
- Each section must use a different grid ratio than the previous.
- Every number is `tabular-nums`; every currency is `en-IN` formatted.
- Every interactive element has hover, active (`scale .98`), focus-visible, disabled, loading states.
- Every animation has a reduced-motion fallback.

---

## Suggested next steps
- With a Refero login, search: "checkout", "payment success", "invoice", "onboarding stepper", "pricing comparison", "empty state", and capture reference links (not images) into this file under each item.
- With a Details.so Pro account, pull the "Pinned scroll" and "SaaS" + "Editorial" layouts; its copyable prompts were not readable here.
- On Design Spells, filter tags Button, Confetti, Transition, Dynamic Island for additional micro-interaction ideas.
