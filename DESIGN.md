# Tysonpe Design System (DESIGN.md)
*Synthesized using UI UX Pro Max, Taste Skill, Awesome Claude Design, and design-md-chrome standards.*

---

## 1. Aesthetic Identity & Art Direction

Tysonpe is a premier creator commerce and fintech platform for India.
The aesthetic direction is **Fintech Craft & Editorial Density** — drawing inspiration from Stripe, Linear, and Wise (benchmarked on Refero.design), styled with the minimalist elegance of **Skiper UI**, the depth of **Animaster Lib**, and the micro-precision of **Vengeance UI**.

### Anti-Slop Directive (Taste Skill Manifest)
Every AI agent working on this codebase must adhere strictly to these anti-slop rules:
- 🚫 **BANNED**: Purple/indigo radial gradient blur blobs behind hero text.
- 🚫 **BANNED**: Generic centered 3-card or 5-card feature grids with colorful rounded-square icons.
- 🚫 **BANNED**: Emojis used as primary interface icons, feature bullets, or status flags (use bespoke SVGs from `src/components/gateway-icons.tsx`).
- 🚫 **BANNED**: Monotonous, flat padding (`p-6` across every single container with no rhythmic variation).
- 🚫 **BANNED**: Vague marketing fluff ("The all-in-one platform for your journey"). Use sharp, concrete fintech copy with real currency (₹), GST rates, and settlement times.
- ✅ **ENFORCED**: Asymmetric layouts, editorial typographic hierarchy, high-density data tables, and interactive live previews directly on landing pages.

---

## 2. Color Palette & Semantic Tokens

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--bg` | `#fbfaf7` (Warm Paper) | `#100e0b` (Deep Obsidian) | Canvas background |
| `--surface` | `#ffffff` (Pure White) | `#19160f` (Card Charcoal) | Base card & modal surface |
| `--surface-2` | `#f4f1ea` (Soft Oat) | `#221e16` (Elevated Charcoal) | Hover fills, secondary cards |
| `--ink` | `#16130f` (Dense Charcoal) | `#f5f1e8` (Cream Ink) | Primary high-contrast text |
| `--muted` | `#6a645b` (Warm Stone) | `#a39b8d` (Muted Warm Sand) | Secondary labels, descriptions |
| `--line` | `#e7e2d8` (Hairline Border) | `#2f2a20` (Subtle Dark Border) | Crisp 1px structural dividers |
| `--brand` | `#5b3df5` (Electric Indigo) | `#8b76ff` (Vibrant Indigo) | Key CTAs, brand highlights |
| `--brand-soft` | `#eeeaff` (Pale Lavender) | `#25205a` (Deep Indigo Glow) | Active badges, soft pills |
| `--accent` | `#ffb020` (Warm Amber) | `#ffb020` (Warm Amber) | Highlights, notices, stars |
| `--good` | `#0f7b4d` (Fintech Emerald) | `#4cd694` (Bright Mint) | Paid status, positive ledger |
| `--good-soft` | `#e1f5ea` (Pale Mint) | `#0f2f22` (Deep Forest) | Success chips, paid badges |
| `--bad` | `#b42318` (Crimson) | `#ff8a80` (Coral Red) | Errors, failed payments |
| `--bad-soft` | `#fde8e6` (Pale Crimson) | `#3a1512` (Deep Rust) | Error badges, alert panels |

---

## 3. Typography Hierarchy (UI UX Pro Max Standard)

- **Display Headings**: `Bricolage Grotesque` (`--font-display`)
  - Tracking: `-0.025em` to `-0.035em`
  - Weight: SemiBold (600) to ExtraBold (800)
  - Scale:
    - Hero: `text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]`
    - Section Heading: `text-2xl sm:text-3xl font-bold tracking-tight`
    - Card Title: `text-base sm:text-lg font-semibold tracking-normal`
- **Body & Numerical UI**: `Plus Jakarta Sans` (`--font-sans`)
  - Optimized for small text legibility and Indian Rupee figures.
  - Tabular numbers: `tabular-nums` for all amounts, countdown timers, and fees.
  - Micro-labels: `text-xs font-semibold uppercase tracking-wider text-muted`.

---

## 4. Motion & Micro-Interactions (Design Motion Principles)

Adhering to the Emil Kowalski / Jakub Krehel / Design Spells frameworks:

### Timing & Easings
```css
--ease-snappy: cubic-bezier(0.2, 0, 0, 1);       /* Quick buttons, hover states, toggles */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* Modals, drawers, reveal transitions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bounces, badges, copy-confirm pop */

--dur-fast: 150ms;
--dur-normal: 220ms;
--dur-spring: 320ms;
```

### Micro-Interactions (Design Spells Standard)
1. **Tactile Depress**: All clickable buttons and interactive chips must have `active:scale-[0.98] transition-transform duration-150 ease-out`.
2. **Spring Reveal**: Overlays and modals enter with scale `0.97 -> 1.0` and opacity `0 -> 1` using `--ease-out-expo`.
3. **Copy Ticker**: When copying an order ID or UPI handle, transition icon to a spring green checkmark for `1800ms`.
4. **Live Ticking Counters**: For timers (e.g. Easebuzz 15:00 countdown clock) and amounts, enforce monospaced tabular numerals (`font-mono tabular-nums`) so numbers do not cause layout jitter.

---

## 5. Component Patterns (Skiper UI & Vengeance UI)

### Tactile Buttons
```tsx
// Primary Brand Button
<button className="btn btn-primary active:scale-[0.98] transition-all duration-150">
  Start Selling Free
</button>

// Precision Secondary Button
<button className="btn btn-secondary active:scale-[0.98] transition-all duration-150 shadow-xs hover:border-brand/40">
  See Live Storefront
</button>
```

### Elevated Interactive Cards (Vengeance & Skiper)
- Multi-layer borders: `border border-line/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.02)]`.
- Hover micro-lift: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`.

### Bespoke Brand Icons
Never use unbranded placeholder boxes or emoji flags. Always use [src/components/gateway-icons.tsx](file:///Users/manojaaa/Tysonpe-%20Sandbox/tysonpe/src/components/gateway-icons.tsx) for:
- Google Pay, PhonePe, Paytm, BHIM UPI
- Visa, Mastercard, RuPay
- HDFC Bank, SBI, ICICI Bank, Axis Bank
- 256-bit SSL, PCI-DSS, ISO-27001 badges

---

## 6. Real-World Inspiration Benchmarks
- **Refero.design**: Inspect Stripe Standard Checkout and Wise payment flow for exact form density, method sidebars, and trust footer placement.
- **Details.so**: Clean typography layouts with asymmetrical product cards.
- **Design Spells**: Delightful micro-states (countdown rings, progress pulses, copy confirmations).
