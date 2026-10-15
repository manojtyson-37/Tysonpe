# C. Component libraries: Animaster, Skiper UI, Vengeance UI

Researched 2026-10-15. Method: web search, page fetches, GitHub API and raw file reads (public repo only). No paid code was fetched or copied. Anything in "Not verified" is genuinely unverified.

## TL;DR for Tysonpe

| Library | Real name / URL | Licence | Cost | Fit for Tysonpe |
|---|---|---|---|---|
| Animaster | "Animmaster Lib" (double m), animmasterlib.dev | Proprietary (per third-party comparison; no licence text read) | Paid only: $3 / $4.99 / $8 | Poor. Marketing-site effects, 60% plain HTML/CSS/JS, GSAP/WebGL. Not a storefront/checkout/dashboard kit. |
| Skiper UI | skiper-ui.com (author "Gxuri") | Mixed. Free subset + paid Premium. No licence text found. No public source repo found. | Free subset; Premium $129 one-time; Exclusive $549 (listed "coming soon") | Medium. Good motion polish, but the useful bits are mostly paid. Use as inspiration only. |
| Vengeance UI | vengenceui.com (note spelling; the site and repo use "Vengence"/"Vengeance" inconsistently). Repo: github.com/Ashutoshx7/VengeanceUI | MIT (confirmed from LICENSE file, (c) 2025-2026 Ashutoshx7) | Free | Best of the three. Safe to copy with attribution. Still quality-variable; audit before use. |

"Vengeance AI" in the source is almost certainly Vengeance UI. Confirmed no separate "Vengeance AI" library surfaced.

## 1. Animaster (actually "Animmaster Lib")

- Official site: https://animmasterlib.dev/ . Covered by Abduzeedo: https://www.abduzeedo.com/animmaster-studio-releases-high-performance-ui-animation-library . A third-party comparison states it launched July 2026 (not independently confirmed).
- Categories (300 components, 14 categories, per the site): Scroll Animations 71, Sliders 25, Hero Animations 24, 3D Animations 23, Navigation Menus 21, Hover Effects 21, Mouse Effects 21, WebGL Shaders 19, Text Animations 18, Page Transitions 14, SVG Animations 11, Background Animations 10, Grid Animations 10, Physics Effects 10.
- Tech: site says 60% HTML/CSS/JS, 30% React, 10% Next.js. Marketing copy cites WebGL, GSAP, particle shaders. Not Tailwind-first, not framer-motion.
- Pricing (site): Junior $3 (learning/mockups/courses), PRO $4.99 (was $10, all 300, lifetime), Premium $8 (was $20, PRO + updates, templates, community). No free tier. Delivered via Google Drive after purchase.
- Licence: one comparison article calls it "Proprietary". I could not read an actual licence document. Treat as "personal/commercial terms unknown; do not redistribute".
- Useful for Tysonpe? Almost nothing. No stat tiles, tabs, toasts, dialogs, empty states, charts, checkout. Categories are scroll/hero/WebGL showpieces. Worth at most a landing-page hero or marquee idea, and we would need to rebuild it from scratch (we must not copy its paid code).
- Candidate patterns (8 named by category only, from the category list, not from code): scroll-linked reveal sections, hover effects on cards, navigation menu with hover bubble, text reveal animations, grid stagger animations, page transitions, background animations, slider. None were inspected in code.
- Not verified: licence text, whether any free sample exists, individual component names, maintainer identity, React/Tailwind dependencies of the React subset.

## 2. Skiper UI

- Official site: https://skiper-ui.com (pricing: https://www.skiper-ui.com/pricing). Author shown as Gxuri; says inspired by Rauno's "Devouring Details".
- Claims: "106+" components (older sources say 70-103), one file per component, no extra packages, installable via shadcn CLI (`npx shadcn add @skiper-ui/skiperNN`). Built on Tailwind, Next.js, motion.dev (framer-motion successor).
- Categories (from what the site shows; no complete index obtained): image reveal, hover members, drag and scroll interactions, sign-in designs, Vercel-style tooltip, token swap interface, image cursor trail, dynamic island (the one named as free). Third-party blurbs also mention hero sections, pricing tables, cards, dashboards (unverified).
- Pricing: Premium $129 one-time (all premium components with source, early access, requests, lifetime updates). Exclusive $549 one-time, marked "Coming soon" (adds Figma files and website templates). A free tier exists for non-logged-in users, but which components are free is only partly shown (Dynamic Island named).
- Licence: no licence page found (the /docs/license and /license URLs gave 404). Pricing page says commercial use "appears permitted" and points to Terms of Service / hello@skiper-ui.com. A third-party comparison says "open source", which conflicts with the paid model and with my finding that the only GitHub repos named skiper-ui are unofficial clones/legacy repos (nischayhq/skiper-ui, harshitxarc/skiper-ui, gaurav-soni34/skiper-ui "clone", cpiprint/legacy-skiper-ui MIT). Do not treat any of those as the official source. Treat Skiper UI as proprietary-with-free-samples until confirmed.
- Useful ideas for Tysonpe (recreate, do not copy): dynamic-island style status pill (payment states), tooltip with shared hover surface, token-swap style two-field converter (maps to amount/GST breakdown), drag/scroll cards, image reveal for product thumbnails. All described only at concept level since I did not read any code.
- Not verified: full component index, which are free, the exact licence terms, ToS, whether paid code can be used in client/commercial products without per-project licences, repo existence.

## 3. Vengeance UI (the one we can actually learn from)

- Official site: https://www.vengenceui.com/ (also www.vengeanceui.com served similar content); repo https://github.com/Ashutoshx7/VengeanceUI (renamed from VengenceUI). About page: https://www.vengenceui.com/about. ~1,221 stars, last push 2026-10-12.
- Licence: MIT, confirmed by reading LICENSE (copyright 2025-2026 Ashutoshx7). Free copy-paste. Keep the copyright notice if we copy substantial code. No paid tier found.
- Install: shadcn registry (`npx shadcn@latest add @vengeanceui/<component>`) or a vengeance-ui CLI per a third-party summary (npm package lookup returned nothing, so the CLI claim is unverified).
- Dependencies (repo package.json, which is the docs-site's, not per-component): framer-motion, gsap + @gsap/react, three + @react-three/fiber/drei, @paper-design/shaders-react, Radix primitives, sonner, recharts, vaul, cmdk, embla, lenis, lucide, class-variance-authority, clsx, tailwind-merge. Per-component pulls are much smaller (most use framer-motion + cn() util). Next 16 and React 19 are already used by the repo, matching our stack. Note repo README also mentions Vite, which is stale; the repo is a Next app.
- Component categories (143 files in src/components/ui, mix of shadcn primitives and showpieces). Vendor claims differ: "26+", "46", "74" components. Treat the real number as about 60-70 custom components plus ~40 shadcn primitives.
  - Primitives (shadcn-style): accordion, alert, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input, input-otp, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner (toasts), spinner, switch, table, tabs, textarea, toggle(-group), tooltip.
  - Buttons: animated-button, candy-button, corner-button, creepy-button, generate-button, interactive-hover-button, pop-button, radial-glow-button, social-flip-button, github-button, copy-button.
  - Text: flip-text, flip-fade-text, morph-text, gooey-text-reveal, liquid-text, staggerText, cyber-glitch-text.
  - Cards/layout: glow-border-card, cursor-card, expandable-bento-grid, research-bento-grid, why-us-bento, staggered-grid, perspective-grid, highlight-grid, team-reveal-grid, testimonials-card, share-sheet, morphing-disclosure, folder-preview.
  - Nav: glass-dock, spotlight-navbar, notch-navbar, mega-menu-navbar, awwwards-nav, search-modal.
  - Numbers/data: animated-number, stats-counter, chart, progress.
  - Backgrounds/3D (skip for us): aurora-hero, liquid-*, wave-grid-background, solar-system, model-viewer, interactive-particles, twisting-ribbon.

### Top 10 for creator storefront / checkout / dashboard

| # | Component | Why useful | Re-implementation sketch (our own words) |
|---|---|---|---|
| 1 | stats-counter | Dashboard stat tiles, revenue counters | useMotionValue + useSpring (bounce 0, ~1.5s) drives a number. Start the animation only when useInView fires once. Render with tabular-nums and an Intl formatter (en-IN, ₹ prefix, decimals prop) instead of toFixed. |
| 2 | animated-number | Live balances, order totals changing | Split the string into characters. Each digit sits in a fixed-height overflow-hidden box holding a vertical 0-9 strip. When the digit changes, animate y from the old offset to 0 with a short ease; direction depends on whether the new digit is larger or smaller. Non-digits (₹ , .) render statically. Measure line height once via ref. |
| 3 | tabs | Dashboard/storefront tab bars | Their version has NO animated indicator (plain active background swap), so don't copy it. Our version: shared `layoutId` motion.div pill behind the active trigger (spring ~stiffness 500, damping 40, ~150-220ms feel) inside a context-driven Tabs/List/Trigger/Content set; keep roving-tabindex keyboard nav. |
| 4 | sonner (toasts) | Payment success/failure, copy confirmations | Thin themed wrapper around the sonner library (MIT). Just configure position, classNames to our tokens, and expose a `toast.promise` pattern for payment verification. No need to rebuild sonner. |
| 5 | dialog / drawer / sheet | Checkout modal (Razorpay-style) and mobile checkout sheet | Radix Dialog (or vaul for drawer) with enter/exit using AnimatePresence-free CSS data-state animations, 220ms with cubic-bezier(0.16,1,0.3,1). Mobile: bottom sheet via vaul. |
| 6 | empty | Empty states (no orders, no courses) | A composition: icon slot, title, description, action button, using our own SVG set and editorial micro-label. A static layout, trivial to write. |
| 7 | copy-button | Copy UPI ID, invoice number, API keys | Local `hasCopied` state with 2s timeout swaps Copy icon for a Check. Improve to the project spec: AnimatePresence icon swap with a spring scale pop, emerald check, aria-live "Copied". |
| 8 | glow-border-card | Pro-plan / featured product highlight | Card with a conic or multi-stop gradient layer behind a blurred inset border, rotated by a CSS keyframe on a ~4s loop; content sits on an opaque inner surface. Keep restraint (anti-slop list): use only for one featured plan, respect reduced motion. |
| 9 | morphing-disclosure | FAQ, GST breakdown expanders on checkout | motion.div with `layout` and a spring (stiffness 500, damping 40); chevron/plus rotates 180 degrees; content mounted inside AnimatePresence with height auto. We would use Radix Collapsible for a11y. Their code has an unused `zod/v4` import and hard-coded ids, so rebuild rather than copy. |
| 10 | table / chart / sidebar / skeleton / progress | Dashboard shell | These are shadcn primitives (recharts for chart, Radix for progress). Just use shadcn directly; Vengeance adds nothing special. |

Honourable mentions: interactive-hover-button (CTA hover fill), shared-tooltip-avatars (creator/student avatars), search-modal (cmd+K), logo-slider (payment method logos), animated-tooltip.

### Quality and risk notes (from the code I read)
- Inconsistent quality: files mix tabs/spaces, some have stray imports (unused zod import in morphing-disclosure), hard-coded Tailwind greys (zinc/neutral) instead of tokens, and cursor-based hover colours that look wrong in light mode (copy-button).
- Several 3D and shader components pull in three.js / @paper-design/shaders-react. Do not import these into the storefront bundle.
- Their copy-button, tabs and animated-number lack reduced-motion handling, aria-live, and keyboard semantics. We must add them.
- Because MIT, copying is legal, but the pattern descriptions above are enough to rewrite cleanly against our ui-rebuild tokens (paper #fbfaf7, ink #16130f as brand/primary, emerald #0f7b4d for money/success only, hairline #e4dfd3; light only, no indigo, no dark mode, so ignore their dark-mode and glow/gradient styling) and motion rules (150ms buttons, 220ms overlays, active:scale-[0.98]).

## Recommendation
1. Use Vengeance UI as a pattern reference, copying only MIT code where it saves time (and keep the MIT notice in a THIRD_PARTY file). Prefer rewriting 1-3, 7, 9 against our tokens.
2. Do not buy or use Animmaster or Skiper Premium: the payoffs (landing hero effects) do not map to checkout/dashboard, and licences are unclear/proprietary.
3. For an animated-indicator Tabs, number ticker (stats + digit roll), toast wrapper, and copy-tick we need nothing beyond framer-motion + sonner + Radix.

## Not found / not verified
- Animmaster Lib licence text; individual component names; Tailwind/React dependencies of its React subset; whether anything is free.
- Skiper UI licence/ToS text, full component index, which components are free, official repo (none found), true count (70/103/106+ all quoted).
- Vengeance UI: exact count of components (26/46/74 claimed), the vengeance-ui npm CLI (registry lookup returned nothing), per-component dependency lists, whether site and repo content differs. Did not read any component beyond animated-number, stats-counter, tabs, copy-button, glow-border-card, morphing-disclosure.
- Could not confirm "Vengeance AI" is anything other than Vengeance UI.

## Sources
- https://animmasterlib.dev/
- https://www.abduzeedo.com/animmaster-studio-releases-high-performance-ui-animation-library
- https://skiper-ui.com and https://www.skiper-ui.com/pricing
- https://tailkits.com/components/skiper-ui/ , https://shadcn.io/awesome/item/skiper-ui
- https://www.vengenceui.com/ , https://www.vengenceui.com/about , https://next.jqueryscript.net/next-js/vengeance-ui/
- https://github.com/Ashutoshx7/VengeanceUI (LICENSE, package.json, src/components/ui)
- https://soymarketingultra.com/en/animated-ui-component-libraries/ (third-party comparison; its Skiper "open source" and Vengeance counts conflict with first-party pages, so used with caution)
