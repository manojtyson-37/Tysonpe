# CLAUDE.md — Core Memory & Design Intelligence for Tysonpe

> **CRITICAL DIRECTIVE**: This document is the permanent, immutable core memory for Claude Code and all AI assistants working on Tysonpe. Regardless of task, session, or tool switch, you MUST strictly follow the design systems, anti-slop rules, and motion principles detailed below.

---

## 1. Project Overview & Tech Stack
- **Product**: Tysonpe — Creator commerce & fintech platform for India (storefronts, UPI/card checkout, GST invoices, course LMS, payout ledgers).
- **Core**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma with SQLite / PostgreSQL.
- **Testing**: Vitest (`npm test`). Current suite has 357 passing tests. Each vitest run uses its own SQLite file (`prisma/test-<pid>.db`), so concurrent runs are safe.
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
4. **NO uniform, cadence-less padding** (e.g. slapping `p-6` on every container). Use asymmetric rhythm, micro-typography labels, and dense editorial structures.
5. **NO generic marketing buzzwords** ("The all-in-one platform for your journey"). Use sharp, concrete fintech figures: ₹ amounts, GST breakdowns, T+1 settlement, VPA verification.
6. **NO flat, non-interactive mockups**. Provide live, functional interactive playgrounds and simulations directly on landing pages.

### ✅ What to Enforce (UI UX Pro Max Standards)
- **High Contrast Editorial Hierarchy**:
  - Display: `Bricolage Grotesque` (`--font-display`) for h1-h3, tracking `-0.025em`. Body: `Plus Jakarta Sans` (`--font-sans`). Figures and ledgers: `JetBrains Mono` (`font-mono`). Scale: ~58px hero, 32px sections, 20px cards.
  - Numbers: `tabular-nums` for all currency amounts and countdown clocks.
  - Micro-labels: `text-xs font-semibold uppercase tracking-wider text-muted`.
- **Palette** (light only, no dark mode): warm paper canvas (`#fbfaf7`), warm ink (`#16130f`, also the primary button `--brand`), hairline borders (`#e4dfd3`), emerald (`#0f7b4d`) reserved for money, success and the logo mark. No indigo/violet anywhere. Landing page is product-first on paper: one real computed sale in the hero, tables not card grids, no video or generated imagery.
- **Copy honesty**: no invented customers, testimonials, uptime or success-rate figures, certifications, or named-competitor numbers. State what is built (Live) and what is not (Planned). Payments are test mode until launch.
- **Surface Elevation**: Multi-layer borders (`border border-line/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.02)]`).

---

## 3. UI Component Patterns (Skiper UI, Animaster Lib, Vengeance UI)
- **Skiper UI Pattern**: Clean segmented tabs with animated indicators, interactive card hovers, minimal border shines, subtle status pills.
- **Animaster Lib Pattern**: Layered surface depth, fluid glassmorphism (`backdrop-blur-md bg-surface/85`), organic scroll reveal and staggered entrance.
- **Vengeance UI Pattern**: Perspective cards, subtle border highlights, tactile micro-interactions, dark luxury elevation.

---

## 4. Design Motion Principles (Emil Kowalski / Design Spells)
1. **Speed & Restraint**:
   - Fast interactions (buttons, toggles, chips): `150ms` using `cubic-bezier(0.2, 0, 0, 1)`.
   - Modals, overlays, drawers: `220ms` using `cubic-bezier(0.16, 1, 0.3, 1)`.
   - Never use sluggish 400ms–500ms transitions for simple utility clicks.
2. **Tactile Micro-Interactions**:
   - Every clickable button or interactive chip MUST feature `active:scale-[0.98] transition-all duration-150`.
   - Copy-to-clipboard: Animate icon transition with a spring pop to emerald checkmark.
   - Status indicators: Subtle pulsing emerald dot for live systems (`animate-pulse`).
3. **Accessibility**:
   - Always respect `prefers-reduced-motion: reduce`.

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
