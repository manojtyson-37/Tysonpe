# Tysonpe UI Rebuild: Design Spec

Date: 2026-10-15. Branch `ui/rebuild`. Supersedes the pass-1 landing tweaks (fa17a43), which are the base.

Goal: every page of Tysonpe reads as hand-built fintech software (Stripe / Linear / Wise craft), not AI output. Viewers said the old UI looked AI-generated. Research lives in `docs/design-research/A..E` and is the evidence base; this spec is the decision record.

## 1. Sources and how each is used

| Source | Used for | Note |
|---|---|---|
| UI UX Pro Max (skill, local) | pre-delivery checklist, chart-type map, UX rules (A §1) | its fintech/LMS palettes rejected (gold/purple/pink); checklist only, no licence file found |
| Taste Skill v2 + v1/redesign (MIT) | audit checklist A1-A19, warnings, copy ban list (A §2) | v2 applies to marketing pages only; v1 dashboard hardening applies to app screens |
| Awesome Claude Design (MIT) | DESIGN.md anatomy; Stripe/Linear/Wise/Mercury/Mastercard patterns (A §3) | LLM-written, unverified against live sites |
| design-md-chrome (TypeUI) | DESIGN.md 11-section skeleton; real tokens curl-extracted from Stripe, Linear, Wise, Razorpay, Cashfree, Gumroad (B §2) | extension not run |
| Design Motion Principles | motion tokens, frequency gate, anti-checklist, audit (B §3-5) | community skill distilled from Emil Kowalski / Jakub Krehel |
| Vengeance UI (MIT, free) | pattern reference only; re-implement our own | uneven quality, may pull three.js; no dependency taken |
| Animaster ("Animmaster Lib") | none | paid, proprietary, scroll/shader showpieces |
| Skiper UI | inspiration only | partly paid, no licence text; never copy code |
| Details.so, Refero, Design Spells | 16 references, 16 micro-interactions, 12 layout structures (D) | detail pages paywalled; derived from public product knowledge, labelled as such |

## 2. Resolved conflicts (owner delegated: "figure it out and go ahead")

1. Taste v2 vs CLAUDE.md. Split by surface. Marketing (landing, storefront hero, catalogue, public community): Taste v2 strict. App screens (dashboard, checkout, library, console, community inside): CLAUDE.md + Taste v1 dashboard hardening.
2. Uppercase micro-labels: allowed on app screens (table heads, stat labels). Marketing: none above headings, at most 2 per page.
3. Monospace: JetBrains Mono only for ledgers, tables and rupee figures; elsewhere tabular-nums of the text face. Documented exception to Taste A3. Typefaces: Bricolage (display), Plus Jakarta (body), JetBrains Mono (ledger figures) = 3, the WARN level; defended in DESIGN.md.
4. Pulsing dots: removed everywhere. Live state = static dot plus a one-shot 600ms ring when status changes.
5. Resting shadows: none on in-page cards. Elevation by one-step tone change (paper canvas `#fbfaf7`, white surfaces, `--surface-2` bands). Warm-tinted shadow only on floating layers (menus, dialogs, toasts, sticky bars).
6. Hairlines: fine on app screens; on marketing pages at most 2 outlined boxes (A10).
7. Press scale: `0.97` small controls, `0.98` large CTAs and cards. No hover-scale. Card hover = border/tone shift at 150ms.
8. UI test harness: no jsdom (it would modify the main checkout's shared node_modules). Primitives are tested with `react-dom/server` `renderToStaticMarkup` in the existing node vitest env; interactive logic is kept in pure functions that are unit-tested.
9. Gateway chooser stays in signup (no change to `actions/auth.ts`); revisit separately.
10. Dark mode: out. Light only, tokens stay semantic.

## 3. Design system (summary; full text goes in DESIGN.md, task 1)

- Palette: paper `#fbfaf7`, surface `#ffffff`, surface-2 `#f3f0e9`, ink `#16130f` (also primary button), muted `#6b665c` (5.47:1 on paper), line `#e4dfd3`, line-strong `#c9c2b2` (inputs), emerald `#0f7b4d` money/success/logo only, bad `#b42318`, warn-soft `#fdf3dc`. No indigo, violet, gradients, glows, or blur blobs. One ink-filled button per view band; every other action is quiet secondary.
- Type: Bricolage 600 display at `-0.025em`, leading 1.0-1.1; body 16px/1.5 (never below 15 on marketing; app text 14-15; meta 12 minimum, at most 3 blocks under 13px per page on marketing); 5 sizes ceiling per page. Measure 45-75ch. Sentence case headings. Hero h1 at most 2 lines at 390px (about 32 characters).
- Radius scale: control 8px, input 8px, card 12px, dialog 16px, pill (badges, chips) full. Buttons 8px. No other radii.
- Spacing: 4px core, 8px rhythm. Section gaps: marketing 80-128px, app 32-48px. Vary padding by role, never one `p-6` everywhere.
- Motion tokens (from B §5): durations 80/150/200/220/160(exit)/320(reveal); eases standard `.2,0,0,1`, out `.25,1,.5,1`, overlay `.16,1,.3,1`, sheet `.32,.72,0,1`, pop `.34,1.56,.64,1` (copy tick and success only); enter = opacity + 8px rise + 4px blur, exit subtler; only transform/opacity/filter/clip-path; never `transition: all`; reduced-motion block mandatory; at most one stagger group per view (40ms step, 6 items). No motion on dashboard tables, nav, headings, KPIs, or keyboard-initiated actions.
- Numbers: `Intl en-IN` grouping via `formatINR` only (its output is test-pinned); `tabular-nums` always; negatives use a true minus.
- Icons: one stroke icon set (`icons.tsx`) plus brand marks in `gateway-icons.tsx`. No emoji or text glyphs as icons.
- Elevation, density, charts: charts follow A §1.3 map (line = revenue trend, sorted horizontal bar = top products, progress bar = course completion); every chart exposes text values.

## 4. Copy rules

Honest copy (CLAUDE.md): no invented customers, logos, ratings, counts, certifications, SAC/GSTIN claims, or settlement promises. Test mode stated. Taste copy ban list applies: unlock, unleash, supercharge, elevate, empower, streamline, seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one; "Get started" / "Learn more" as labels (name the action); tricolon headlines; "not just X, it's Y"; exclamation marks in success text; "Oops". Sample content (names, prices) is listed in the final report.

## 5. Scope and order

All 29 routes and 31 components (E §1-2), rebuilt in 8 waves (E §6): foundations, primitives, shells and boundaries, money path, storefront/learner, creator console, community, marketing/demo/gateway replicas. 31 tasks in the plan. Real bugs found by the inventory are fixed inside the tasks that touch those files: hardcoded 18% GST on checkout/pay and demo; `RazorpayButton` theme `#5b3df5`; dead ternary in signup; console re-rendering marketing nav; no mobile nav; no not-found/error/loading.

Preserve (test-pinned): `formatINR` output (`₹499`, `₹499.50`, `₹1,23,456`); regex-matched error substrings in `lib/learning/quiz.ts`, `lib/learning/admin.ts`, `app/actions/checkout.ts`; `REDIRECT:/demo` targets in actions.

## 6. Gates

Per task: `npm test`, `npm run typecheck`, `npm run lint` green; task review (spec + quality). Per wave: controller screenshots at 390 / 768 / 1280 on a dev server from this worktree (port 3200). Final: Taste checklist audit, Design Motion audit, UI UX Pro Max pre-delivery checklist, full code-reviewer on the branch, `/design-review`. `next build` is run only on this worktree (its own `.next`), never in the main checkout.
