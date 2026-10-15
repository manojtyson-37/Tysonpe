# Tysonpe DESIGN.md

Structure: TypeUI 11-section skeleton. Decision record: `docs/superpowers/specs/2026-10-15-tysonpe-ui-rebuild-design.md`. Evidence: `docs/design-research/A..E`. Tokens live in `src/app/globals.css`; this file is the rulebook for using them. If this file and a component disagree, the component is wrong.

## 1. Mission

Every Tysonpe screen should read as hand-built fintech software in the line of Stripe, Linear and Wise, not as generated output. A creator sees what they earned, what GST was taken and when it pays out. A buyer sees what they pay and what they get. Nothing on screen is there to decorate.

Success test: a viewer cannot guess the page was machine-generated, and a screen reader user completes the same task as a sighted one.

## 2. Brand

- Product: Tysonpe, creator commerce and fintech for India (storefronts, UPI and card checkout, GST invoices, course LMS, payout ledgers).
- Audience: Indian creators and coaches selling courses, memberships and live sessions; their learners and buyers on mid-range Android phones as much as desktops.
- Interface scope: marketing pages (landing, storefront, product page, catalogue, public community) and app screens (dashboard, console, checkout, library, community inside). Light theme only; tokens stay semantic so a theme could be added later, but none is planned.
- Voice anchors: rupee amounts, GST rates and the settlement rule the code actually implements. Payments are test mode until launch, and pages say so.

### 2.1 Marketing and app are two surfaces

| | Marketing | App |
|---|---|---|
| Governing rules | Taste v2 strict | This file, CLAUDE.md, Taste v1 dashboard hardening |
| Body text | 15px minimum, 16px default | 14px minimum, 14 to 15px typical |
| Meta text | 12px minimum, at most 3 blocks under 13px | 12px minimum |
| Uppercase micro-labels | None above headings, at most 2 per page | Allowed for table heads and stat labels (`.t-label`) |
| Outlined boxes | At most 2 per page | Hairlines fine; group with `divide-y` and negative space first |
| Section gap | 80 to 128px (`--section-marketing`) | 32 to 48px (`--section-app`) |
| Hero heading | Up to 2 lines at 390px (about 32 characters) | Not applicable |
| Density | Low; one idea per band | High; tables, lists, numbers |
| CTA | One ink-filled button per band | One ink-filled button per view |

## 3. Style Foundations

### 3.1 Colour (light only)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fbfaf7` | Paper canvas |
| `--surface` | `#ffffff` | Cards, inputs, dialogs |
| `--surface-2` | `#f3f0e9` | Secondary bands, hover fill, skeleton |
| `--ink` | `#16130f` | Text, and the primary button (`--brand`) |
| `--muted` | `#6b665c` | Secondary text (5.47:1 on paper) |
| `--line` | `#e4dfd3` | Hairlines, dividers |
| `--line-strong` | `#c9c2b2` | Input borders, hovered card borders |
| `--good` / `--good-soft` | `#0f7b4d` / `#e3f1ea` | Money, paid, success, logo mark only. Never a CTA |
| `--bad` / `--bad-soft` | `#b42318` / `#fbeae8` | Errors, failed payments |
| `--warn-soft` | `#fdf3dc` | Notices |
| `--brand-soft` | `#ece8dd` | Active nav, soft fills |
| `--accent` | `#f59e0b` | Logo dot only |

One ground, one ink, one accent. No indigo or violet, no gradients, no glows, no blur blobs, no pure `#000`. Stay in one warm grey family.

### 3.2 Typography

| Role | Face | Utility | Notes |
|---|---|---|---|
| Display and headings | Bricolage Grotesque 600 (`--font-display`) | `.t-display`, `.t-heading` | Hero up to ~56px, sections up to 32px; tracking `-0.025em`, leading 1.0 to 1.15, sentence case, `text-wrap: balance` |
| Body and UI | Plus Jakarta Sans (`--font-sans`) | `.t-body`, `.t-meta` | Body 16px/1.5; measure 45 to 75ch |
| Ledger figures | JetBrains Mono (`--font-mono`) | `.t-ledger` | Ledgers, tables and rupee columns only |
| Numbers elsewhere | Plus Jakarta Sans | `.t-num` | `tabular-nums` always |
| App micro-label | Plus Jakarta Sans 600 | `.t-label` | 12px uppercase, `0.06em`; app screens only |

At most 5 sizes per page. Negatives use a true minus. Rupee amounts go through `formatINR` via the `Money` component; its output is test-pinned (`₹499`, `₹499.50`, `₹1,23,456`).

Typeface defence. Three faces is the WARN level of the Taste check, so each earns its place. Bricolage carries the brand voice at display sizes and is never used under 20px. Plus Jakarta is chosen for small-size legibility and clear digits on low-density Android screens. JetBrains Mono appears only where columns of rupee figures must align, which is the documented exception to the Taste ban on monospace outside code and tables. Nowhere else may a third face, a fourth face or a mono label be introduced.

### 3.3 Radius

| Token | Value | Use |
|---|---|---|
| `--r-control` | 8px | Buttons, inputs, menus, tabs |
| `--r-card` | 12px | Cards, panels |
| `--r-dialog` | 16px | Dialogs, sheets |
| `--r-pill` | full | Badges, chips, status dots |

Utilities: `rounded-control`, `rounded-card`, `rounded-dialog`, `rounded-full`. No other radii, no `rounded-[Npx]`.

### 3.4 Spacing

4px core on an 8px rhythm: 4, 8, 12, 16, 24, 32, 48, 64 (`--space-*`). Vary padding by role (a dense table cell, a roomy hero band, a tight chip); never one `p-6` everywhere. Section rhythm: `section-marketing` and `section-app`.

### 3.5 Elevation

- In-page cards have no resting shadow. Hierarchy is a one-step tone change: white `--surface` on `--bg` paper, `--surface-2` bands, `--line` hairline.
- Only floating layers (menus, popovers, dialogs, toasts, sticky bars) take `--shadow-float`, a warm-tinted `rgba(22,19,15,.12)` long soft shadow (`shadow-float`).
- At most one blurred sticky bar per page; no glassmorphism elsewhere.

### 3.6 Focus

2px solid ink ring with 2px offset (`--focus-ring`), applied to every `:focus-visible`. Never remove an outline without replacing it.

### 3.7 Motion tokens

| Group | Tokens |
|---|---|
| Durations | `--dur-instant` 80ms, `--dur-fast` 150ms, `--dur-base` 200ms, `--dur-overlay` 220ms, `--dur-exit` 160ms, `--dur-reveal` 320ms, `--dur-sheet` 500ms (mobile bottom sheet only) |
| Eases | `--ease-standard` `.2,0,0,1` (controls), `--ease-out` `.25,1,.5,1` (general enter), `--ease-overlay` `.16,1,.3,1` (dialogs, popovers), `--ease-sheet` `.32,.72,0,1`, `--ease-in-out` (on-screen moves), `--ease-pop` `.34,1.56,.64,1` (copy tick and success only) |
| Distance and scale | `--move-enter` 8px, `--move-exit` -6px, `--blur-enter` 4px, `--scale-press` 0.97, `--scale-press-lg` 0.98, `--scale-enter-min` 0.94 |
| Stagger | `--stagger-step` 40ms, `--stagger-max` 240ms |

Enter is opacity, 8px rise and 4px blur (`.enter`); exit is shorter and subtler (`.exit`). Animate only `transform`, `opacity`, `filter`, `clip-path`.

### 3.8 Motion budget

- Frequency gate before adding any animation: rare (monthly) may be expressive, daily is subtle at 180 to 250ms, hundreds of times a day is none or instant, keyboard-initiated is never animated.
- No entrance motion on dashboard tables, nav, headings, KPI numbers, or anything opened by keyboard.
- At most one stagger group per view: 6 items, 40ms step.
- At most 3 elements with `will-change`. Blur-on-enter only on overlays.
- Press feedback is `scale(0.97)` on small controls and `0.98` on large CTAs and cards. No hover-scale, no hover-lift.
- Card hover is border and tone shift at 150ms (`.card-hover`).
- Live state is a static dot plus a one-shot 600ms ring when status changes (`.status-dot` with `.status-ring-once`). The 15-minute Easebuzz clock animates by its numbers only.
- Success moments (payment captured, payout settled, invoice generated) are the one rare tier: `--dur-reveal`, `--ease-pop` check, once, no confetti.
- Skeletons match final layout and breathe on opacity only (`.skeleton`); no spinners for layout loads.
- Every `@keyframes` has a reduced-motion fallback in the block at the end of `globals.css`.

### 3.9 Icons

One stroke icon set (`icons.tsx`, added in a later task) plus brand marks in `src/components/gateway-icons.tsx`. No emoji and no text glyphs as icons, in copy or alt text.

## 4. Accessibility

Target WCAG 2.2 AA.

- Contrast: body text 4.5:1 minimum, running text in full ink, `--muted` only for secondary text (5.47:1 on paper). Emerald on paper is 5.1:1; white on emerald 5.3:1.
- Targets: 44x44px minimum on touch, 8px gap between neighbours.
- Focus: visible ring on every interactive element (3.6); logical tab order; skip-to-content link on every shell; dialogs trap focus and restore it.
- Forms: label above input, programmatic association, `autocomplete` and `inputmode` set (numeric for OTP, amount, pincode), errors in `role="alert"` with a recovery action, validate on blur.
- Motion: `prefers-reduced-motion: reduce` collapses all durations and removes travel, scale and blur.
- Charts: every chart exposes its values as text; series differ by dash style as well as colour.
- Semantics: real `button`, `a`, `table`, `ol`; accessible names on icon-only controls; `aria-expanded` on disclosure controls; meaningful `alt` or `aria-hidden` for decoration.

## 5. Writing Tone

- Plain, specific, sentence case. Name the action on every button ("Create payment link", not "Get started" or "Learn more").
- Concrete over abstract: rupee amounts, GST breakdowns, the settlement rule the code implements.
- Honest: no invented customers, logos, ratings, counts, certifications, SAC or GSTIN claims, or settlement promises. State test mode. Sample content is labelled and listed for replacement.
- Success text has no exclamation marks. Errors say what happened and what to do next; never "Oops".
- Banned words: unlock, unleash, supercharge, elevate, empower, streamline, seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one, blazing fast. No "not just X, it's Y", no tricolon headlines, no performative labels, no furniture text ("Scroll", "Est. 2024").

## 6. Rules: Do

- Use tokens and utilities from `globals.css` (`rounded-card`, `.t-label`, `shadow-float`); extend tokens before inventing values.
- Separate surfaces by tone step and hairline; group app content with `divide-y` and negative space before reaching for a card.
- Give each screen one ink-filled primary action; make every other action quiet secondary.
- Pair every Add with Edit and Delete; an entity that can be created can be changed.
- Show real loading, empty and error states: layout-matched skeletons, composed empty states with a next action, inline errors.
- Use `Money` for every rupee amount; right-align numeric table columns; use `tabular-nums`.
- Keep headings to 2 lines at 390px on marketing pages; left-align by default; one centred moment per page at most.
- Verify at 390, 768 and 1280 widths before calling a screen done.

## 7. Rules: Don't

- No gradients, glows, blur blobs, or resting card shadows.
- No pulse or ping animations on indicators, no infinite decorative loops (the pass-1 QR scan line is the only one left and is removed in Task 27).
- No `transition: all`, no hover-scale, no hover-lift, no default `ease`.
- No emoji or text glyphs as icons; no raw hex or palette-scale colours (`slate-`, `stone-`, `indigo-`, `emerald-`, `rose-`, `amber-`) in components.
- No `rounded-[Npx]`, no text under 12px, no `text-[9px]`, `text-[10px]`, `text-[11px]`.
- No eyebrow above marketing headings, no pill badge over a hero, no decorative index numbers, no rows of identical icon cards.
- No `window.confirm`, `alert()`, or dead `#` links.
- No indigo or violet anywhere; emerald is never a button colour.
- No invented proof of any kind.

## 8. Guideline Authoring Workflow

1. Read this file and the spec before touching UI.
2. Decide the surface (marketing or app) and apply its column in 2.1.
3. Write the argument first: one line per section as claim plus proof; drop sections without a claim.
4. Build from existing primitives and tokens; if a token is missing, add it to `globals.css` and to this file in the same commit.
5. Apply the frequency gate (3.8) to every animation before adding it.
6. Run the quality gates (section 11) and fix before review.
7. Anything that changes a rule lands in this file in the same change.

## 9. Required Output Structure

Every UI change delivers:

- The components or pages changed, using token classes only.
- States for each interactive element: default, hover, active, focus-visible, disabled, loading, error where relevant.
- For new primitives: an SSR render test (`*.test.tsx`, `renderToStaticMarkup`) asserting structure, aria attributes and token classes; interactive logic kept in pure functions with unit tests.
- A list of any sample content (names, prices) introduced, for replacement before launch.
- Screenshots at 390, 768 and 1280 widths for waves, taken by the controller from the worktree dev server.

## 10. Component Rule Expectations

| Component | Rules |
|---|---|
| Button | 8px; primary ink fill, secondary white with `--line-strong` border, ghost, danger on white; 14px text minimum; press 0.98 (0.97 when small); label names the action; `disabled` is 50% opacity and not clickable; loading keeps width |
| Input | 8px, `--line-strong` border, ink border on focus plus focus ring; label above, hint and error below; 44px target on touch |
| Card | 12px, white on paper, hairline, no shadow; hover only if the whole card is a link (`.card-hover`) |
| Badge and chip | Full radius; semantic soft fills (`badge-good`, `badge-bad`, `badge-warn`, `badge-muted`); 12px minimum text |
| Table | `.table`; `.t-label` heads; numeric columns right-aligned and tabular; row hover fill only; no entrance motion |
| Dialog and sheet | 16px; `--shadow-float`; `--dur-overlay` enter with `--ease-overlay`, `--dur-exit` leave; focus trapped; Escape closes |
| Menu and popover | 8px; `--shadow-float`; origin-aware scale from `--scale-enter-min` |
| Toast | `--shadow-float`; 4s visible; `role="status"`; no exclamation marks |
| Status dot | Static emerald dot; one-shot ring on change |
| Skeleton | Matches final layout; opacity-only; static under reduced motion |
| Chart | Line for trend, sorted horizontal bar for ranking, progress bar for completion; values as text |

## 11. Quality Gates

Per task: `npm test`, `npm run typecheck`, `npm run lint` all green; task review for spec and quality.

Checks that must pass before a screen ships:

- Colour: no raw hex or palette-scale classes in JSX (QR drawing and gateway replica skins excepted); emerald not used on any CTA.
- Shape: no `rounded-[Npx]`; radii come only from 3.3.
- Type: no `text-[9px]`, `text-[10px]`, `text-[11px]`; marketing body 15px or more; app body 14px or more; headings 2 lines or fewer at 390px; at most 5 sizes.
- Motion: no `transition: all`, no hover-scale, no pulse or ping indicators; only transform, opacity, filter, clip-path; every keyframe covered by the reduced-motion block; at most one stagger group per view.
- Surfaces: no resting card shadow, no gradient.
- Money: every rupee amount via `Money` and `formatINR`, `tabular-nums`.
- Copy: no banned words; no invented proof; test mode stated; button labels name the action.
- Accessibility: contrast 4.5:1 body, visible focus, 44px touch targets, labelled controls, reduced motion honoured.
- Responsive: no horizontal overflow at 390, 768, 1280.

Final gates for the branch: Taste checklist audit, Design Motion audit, UI UX Pro Max pre-delivery checklist, full code-reviewer pass, `/design-review`.
