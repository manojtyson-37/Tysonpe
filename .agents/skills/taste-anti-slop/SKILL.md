---
name: taste-anti-slop
description: "Anti-AI-slop design enforcement skill. Use whenever designing, reviewing, or generating UI/UX components to eliminate generic AI aesthetic tropes, purple gradient washes, centered 3-card grids, emoji icons, and flat uniform padding."
---

# Taste Skill — Anti-AI-Slop Directive

A specialized skill designed to kill AI slop and enforce human-grade art direction.

## When to Use
- Whenever crafting new landing pages, dashboard views, marketing sections, or modal components.
- During code review or refactoring passes to remove AI clichés.

## The Anti-Slop Ban List (Zero Tolerance)
1. **No Purple Gradient Washes / Blur Blobs**: Never place radial gradient blur circles (`blur-3xl bg-brand/10`) behind hero headings. It is the single most recognizable AI design tell.
2. **No Cookie-Cutter Feature Grids**: Do not generate centered 3-card or 5-card grids where every card has the same padding, a colored square icon, and 2 lines of generic text.
3. **No Raw Emojis as UI Icons**: Never use 🚀, 💡, ⚡, or 💳 as primary interface icons. Always import bespoke vector SVGs from `@/components/gateway-icons`.
4. **No Flat, Monotonous Padding**: Do not use `p-6` uniformly across every single card. Use intentional asymmetric pacing, micro-labels, dense status rows, and varied visual weights.
5. **No Generic Marketing Fluff**: Banish phrases like "Supercharge your growth", "All-in-one suite", and "Turn passion into profit". Write concrete fintech product copy with real amounts (₹), GST rates, and settlement mechanics.
6. **No Non-Interactive Mockups**: Replace static mockup graphics with functional, interactive preview widgets that users can click, toggle, and test immediately.

## What to Enforce Instead
- **Asymmetric Editorial Layout**: Strong visual focal point, contrasting column widths (e.g. 7-column hero with 5-column live preview card).
- **Scale Contrast**: Big bold display typography (`Plus Jakarta Sans`) set against ultra-crisp micro-labels (`11px font-mono tracking-wider`).
- **Tactile Feedback**: Every clickable element reacts with micro-motion (`active:scale-[0.98] transition-all duration-150`).
- **Layered Surfaces**: Subtle hairline borders (`border border-line/80`), gentle elevation shadows, and backdrop blurs.
