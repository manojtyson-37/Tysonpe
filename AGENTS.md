<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Core Memory & Design Intelligence for Codex, Cursor & Antigravity

> **CRITICAL DIRECTIVE**: This document is the permanent, cross-AI core memory for all agents (Codex, Cursor, Antigravity, Claude, and Gemini). You MUST read and follow these design systems, anti-slop rules, and motion principles for every change in this repository.

---

## 1. Project Overview & Architecture
- **Application**: Tysonpe — Creator commerce & fintech infrastructure for India.
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma.
- **Test Command**: `npm test` (Vitest, 357 tests passing).
- **Design Spec**: [DESIGN.md](file:///Users/manojaaa/Tysonpe-%20Sandbox/tysonpe/DESIGN.md)
- **Claude Memory**: [CLAUDE.md](file:///Users/manojaaa/Tysonpe-%20Sandbox/tysonpe/CLAUDE.md)

---

## 2. Taste Skill Anti-Slop Directive (MANDATORY)
Every UI element produced must adhere to high-craft human fintech standards (Stripe, Linear, Wise).

### 🚫 The Anti-Slop Ban List
- ❌ **NO generic purple radial gradient blur blobs** behind hero headlines.
- ❌ **NO centered 3-column or 5-column feature card grids** with colorful rounded-square icons.
- ❌ **NO emojis** as primary interface icons, feature bullets, or status indicators. Use bespoke vector SVGs from [src/components/gateway-icons.tsx](file:///Users/manojaaa/Tysonpe-%20Sandbox/tysonpe/src/components/gateway-icons.tsx).
- ❌ **NO monotonous padding** (`p-6` everywhere without hierarchy). Use rhythmic asymmetric spacing and micro-labels.
- ❌ **NO generic marketing fluff** ("All-in-one platform for creators"). Ground every section in real fintech numbers: ₹ amounts, GST breakdowns, T+1 payouts, UPI handles.
- ❌ **NO static fake mockups**. Provide live, functional interactive playgrounds and simulations directly on landing pages.

### ✅ Design Standards (UI UX Pro Max & Awesome Claude Design)
- **Typography**:
  - Headings: `Bricolage Grotesque` (`--font-display`), tight letter-spacing (`-0.025em`), commanding hierarchy (56px hero, 32px section, 20px card).
  - Body & Numbers: `Plus Jakarta Sans` (`--font-sans`), `tabular-nums` on all currency, timers, and fees.
  - Micro-labels: `text-xs font-semibold uppercase tracking-wider text-muted`.
- **Color Tokens**: Warm paper canvas (`--bg: #fbfaf7` / dark `#100e0b`), ink typography (`--ink: #16130f` / `#f5f1e8`), electric indigo brand (`--brand: #5b3df5`), hairline crisp borders (`--line: #e7e2d8` / `#2f2a20`), emerald status (`--good: #0f7b4d`).

---

## 3. UI Libraries & Component Patterns
- **Skiper UI**: Clean segmented tab controls with active sliders, interactive card hovers, minimal border shines.
- **Animaster Lib**: Layered surface depth, fluid glassmorphism (`backdrop-blur-md bg-surface/85`), staggered entrance reveals.
- **Vengeance UI**: Perspective cards, subtle border highlights, tactile micro-interactions, dark luxury elevation.

---

## 4. Motion & Micro-Interactions (Design Motion Principles)
- **Durations & Easing**:
  - Utility clicks & buttons: `150ms` using `cubic-bezier(0.2, 0, 0, 1)`.
  - Overlays, popovers & modals: `220ms` using `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Physics springs: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - Never use sluggish 400ms–500ms transitions for everyday buttons.
- **Design Spells Micro-Interactions**:
  - Tactile depress: `active:scale-[0.98] transition-all duration-150`.
  - Copy-to-clipboard: Spring pop icon transition to emerald checkmark for 1800ms.
  - Live ticking countdowns: Monospaced numbers without layout shifting.

---

## 5. Benchmarks & Inspiration Sources
- **Refero.design**: Study real production screens from Stripe, Linear, and Wise.
- **Details.so**: Curated layout inspiration with copyable prompt patterns.
- **Design Spells**: Micro-interactions that give software tactile polish and joy.
