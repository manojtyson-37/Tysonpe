# CLAUDE.md — Core Memory & Design Intelligence for Tysonpe

> **CRITICAL DIRECTIVE**: This document is the permanent, immutable core memory for Claude Code and all AI assistants working on Tysonpe. Regardless of task, session, or tool switch, you MUST strictly follow the design systems, anti-slop rules, and motion principles detailed below.

> **START HERE in a new session:** read [docs/HANDOFF.md](docs/HANDOFF.md) first (current state, how to resume, how work is run, open items, next steps). History of the last builds: [docs/superpowers/handoff/ui-rebuild-log.md](docs/superpowers/handoff/ui-rebuild-log.md) (UI rebuild, this branch) and [docs/superpowers/handoff/sub-project-3-log.md](docs/superpowers/handoff/sub-project-3-log.md). Update HANDOFF.md whenever a sub-project finishes or the state changes.

---

## 1. Project Overview & Tech Stack
- **Product**: Tysonpe — Creator commerce & fintech platform for India (storefronts, UPI/card checkout, GST invoices, course LMS, payout ledgers).
- **Core**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma with SQLite / PostgreSQL.
- **Testing**: Vitest (`npm test`). Current suite on `ui/rebuild` has 3237 passing tests in 149 files (1 Postgres-only test is skipped on SQLite). Each vitest run uses its own SQLite file (`prisma/test-<pid>.db`), so concurrent runs are safe.
- **Commands**:
  - Dev server: `npm run dev` (running on port 3100)
  - Test suite: `npm test`
  - Lint: `npm run lint`
  - Typecheck: `npm run typecheck`

---

## 2. Design Intelligence & Anti-Slop Directive (Taste Skill)
Every page, component, and interaction must look like bespoke, human-crafted fintech software (Stripe, Linear, Wise).

### 🚫 The Anti-Slop Ban List (Zero Exceptions)
1. **NO generic purple/indigo radial gradient blurs** or circular blur blobs behind hero headlines.
2. **NO centered 3-column or 5-column feature card grids** with colorful rounded-square icons.
3. **NO emojis** as primary interface icons, feature bullets, or status flags. Use bespoke SVGs from [src/components/gateway-icons.tsx](file:///Users/manojaaa/Tysonpe-%20Sandbox/tysonpe/src/components/gateway-icons.tsx).
4. **NO uniform, cadence-less padding** (e.g. slapping `p-6` on every container). Use asymmetric rhythm, app-screen micro-labels (`.t-label`), and dense editorial structures.
5. **NO generic marketing buzzwords** ("The all-in-one platform for your journey"). Use sharp, concrete fintech figures: ₹ amounts, GST breakdowns, T+1 settlement, VPA verification.
6. **NO flat, non-interactive mockups**. Provide live, functional interactive playgrounds and simulations directly on landing pages.

### ✅ What to Enforce (UI UX Pro Max Standards)
- **High Contrast Editorial Hierarchy**:
  - Display: `Bricolage Grotesque` (`--font-display`) for h1-h3, tracking `-0.025em`. Body: `Plus Jakarta Sans` (`--font-sans`). Figures and ledgers: `JetBrains Mono` (`font-mono`). Scale: ~56px hero, 32px sections, 20px cards.
  - Numbers: `tabular-nums` for all currency amounts and countdown clocks.
  - Micro-labels (app screens only, never above marketing headings): `.t-label` (12px, uppercase, `0.06em`, muted).
- **Palette** (light only, no dark mode): warm paper canvas (`#fbfaf7`), warm ink (`#16130f`, also the primary button `--brand`), hairline borders (`#e4dfd3`), emerald (`#0f7b4d`) reserved for money, success and the logo mark. No indigo/violet anywhere. Landing page is product-first on paper: one real computed sale in the hero, tables not card grids, no video or generated imagery.
- **Copy honesty**: no invented customers, testimonials, uptime or success-rate figures, certifications, or named-competitor numbers. State what is built (Live) and what is not (Planned). Payments are test mode until launch.
- **Surface Elevation**: tone step plus hairline (`bg-surface border border-line` on the paper canvas). No resting shadow on in-page cards; floating layers use `shadow-float`.

---

## 3. UI Component Patterns
Full rules, tokens and component expectations live in `DESIGN.md`; tokens live in `src/app/globals.css`. Split by surface: marketing pages follow Taste v2 strict, app screens follow this file and Taste v1 dashboard hardening.
- **Surfaces**: white cards on the paper canvas separated by a one-step tone change and a hairline. No resting shadow on in-page cards; `--shadow-float` only on floating layers (menus, dialogs, toasts, sticky bars). No glassmorphism beyond one sticky bar.
- **Radii**: `--r-control` 8px (buttons, inputs), `--r-card` 12px, `--r-dialog` 16px, pills full. No `rounded-[Npx]`.
- **Controls**: segmented tabs with a restrained indicator, status pills, one ink-filled primary action per view band, everything else quiet secondary.
- **Cards**: hover is a border and tone shift only (`.card-hover`); no lift, no scale, no perspective tilt.
- **Density**: group app content with `divide-y` and negative space; reach for a card only where elevation communicates hierarchy.

---

## 4. Design Motion Principles (Emil Kowalski / Design Spells)
Tokens are in `src/app/globals.css` (`--dur-*`, `--ease-*`); budget and rules in `DESIGN.md` 3.7 and 3.8.
1. **Speed & Restraint**:
   - Fast interactions (buttons, toggles, chips, hover): `--dur-fast` 150ms with `--ease-standard`.
   - Modals, overlays, drawers: `--dur-overlay` 220ms with `--ease-overlay`; exit 160ms.
   - Never use 400ms to 500ms transitions for simple utility clicks, except the mobile bottom sheet (500ms).
   - Animate only transform, opacity, filter, clip-path. Never `transition: all`.
2. **Tactile Micro-Interactions**:
   - Buttons and interactive chips press to `scale(0.98)` (`0.97` on small controls) with explicit transition properties. No hover-scale.
   - Copy-to-clipboard: icon swaps to an emerald checkmark with a small `--ease-pop` overshoot, once.
   - Live status: a static emerald dot plus a one-shot 600ms ring when the status changes. No pulsing or looping indicators.
3. **Restraint on entrance motion**:
   - No entrance motion on dashboard tables, nav, headings or KPI numbers.
   - At most one stagger group per view (6 items, 40ms step).
4. **Accessibility**:
   - Always respect `prefers-reduced-motion: reduce`; every keyframe needs a fallback in the global block.

---

## 5. Benchmarks & Inspiration Sources
- **Refero.design**: Reference real production flows from Stripe Standard Checkout, Linear, and Wise.
- **Details.so**: Study handpicked layouts and copyable design structures.
- **Design Spells**: Implement delightful micro-interactions (e.g. countdown progress indicators, copy ticks, tactile keybind hints).

---

## 6. Payment & Security Rules
- **Fintech Safety**: All payment verification must occur server-side.
- **Simulation Fidelity**: Support both **Razorpay Standard Checkout** (modal popup with iframe look) and **Easebuzz Hosted Checkout** (full page redirect with 15-minute countdown clock and return flow).
- **Zero Real Card / Netbanking Data**: Only mock tokens and simulated PINs/OTPs are processed.
