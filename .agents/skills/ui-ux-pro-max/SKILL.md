---
name: ui-ux-pro-max
description: "UI/UX Pro Max design intelligence skill. Provides curated color palettes, font pairings, spacing cadence, micro-typography, and component architecture for fintech and creator applications."
---

# UI UX Pro Max — Design Intelligence

Provides systematic design intelligence so agents never guess what looks good.

## Core Rules

### 1. Typography Hierarchy
- **Display Font**: `Bricolage Grotesque` (`--font-display`).
  - Tracking: `-0.025em` for headings.
  - Line height: tight (`leading-[1.05]` on hero, `leading-[1.15]` on section headings).
- **Body & Numeric Font**: `Plus Jakarta Sans` (`--font-sans`).
  - Readability optimized for Indian names, INR figures, and dense tables.
  - Enforce `tabular-nums` for all monetary amounts, countdown timers, and calculations.
- **Micro-Typography**:
  - Overline labels: `text-xs font-semibold uppercase tracking-wider text-muted`.
  - Badges: `text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5`.

### 2. Spacing & Rhythm
- Spacing is based on a strict 4px grid (`4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px`).
- Do not let adjacent sections have the same vertical padding without varying surface elevation or background tone.
- Alternate between warm paper (`--bg: #fbfaf7`), oat surface (`--surface-2: #f4f1ea`), and high-contrast dark sections (`--ink: #16130f`).

### 3. Surface & Elevation Layers
```css
/* Card Elevation */
.card-elevated {
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
}

/* Card Hover Elevation */
.card-elevated:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06), 0 12px 24px rgba(0, 0, 0, 0.04);
}
```

### 4. Color Contrast Ratios
- Primary text (`--ink`) to background (`--bg` / `--surface`): minimum 11:1 contrast ratio.
- Secondary labels (`--muted`): minimum 4.8:1 contrast ratio.
- Status badges: Always pair soft tint backgrounds (`--good-soft`, `--bad-soft`) with high-contrast text (`--good`, `--bad`).
