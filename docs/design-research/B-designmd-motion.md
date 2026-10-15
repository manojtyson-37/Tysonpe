# B. DESIGN.md emulation + Motion principles (research)

Date: 2026-10-15. Scope: research only; no src edits, no commits.

## 0. Method and what could NOT be verified

- WebFetch returns markdown text only. For all six sites it reported no CSS, no hex values, no fonts. That is a tool limit, not a property of the sites.
- To get real tokens I additionally `curl`-ed each site's public HTML and linked stylesheets (the same files the Chrome extension would read via computed styles) and grepped custom properties / declaration frequencies. Snapshot taken 2026-10-15 from Mac, India-region pages where available (`stripe.com/in`, `wise.com/in`).
- Frequency counts below are declaration counts across the downloaded CSS, not rendered-element counts. They indicate what a site uses most, not pixel-exact layout.
- NOT verified: computed styles after JS hydration; dark/light variants beyond what is in CSS vars; Razorpay (page is Framer, styles inline in `<style data-framer-*>`, no token system, only hex frequency); spacing rhythm for Razorpay/Cashfree beyond declared values; actual hover/active states; Wise/Stripe/Linear marketing pages are not their logged-in product UI.
- I did not install or run the Chrome extension (needs a GUI Chrome load-unpacked step). The DESIGN.md format below is from its README; the "extract" internals (which DOM APIs) are not documented in the README and were not verified.

## 1. design-md-chrome

- Repo: https://github.com/bergside/design-md-chrome (README via https://cdn.jsdelivr.net/gh/bergside/design-md-chrome@main/README.md). Name: "TypeUI DESIGN.md Extractor". Listing: https://extensionauditor.com/scan/design-md-style-extractor-typeui-ogpdnchdjiibhobphelbbkemnnemkfma . Reported ~1.7k stars (sourcepulse mirror, https://www.sourcepulse.org/projects/28182401).
- What it does: "auto-extract" on the active tab reads typography, colors, spacing, radius, shadows, motion; buttons: Generate DESIGN.md, Generate SKILL.md, Refresh, Download. Install = Load unpacked in chrome://extensions.
- Output format (TypeUI DESIGN.md), 11 sections in this order:
  1. Mission  2. Brand (product context, URL, audience, interface scope)  3. Style Foundations (the extracted tokens: type, color, spacing, radius, shadow, motion)  4. Accessibility (WCAG 2.2 AA)  5. Writing Tone  6. Rules: Do  7. Rules: Don't  8. Guideline Authoring Workflow  9. Required Output Structure  10. Component Rule Expectations (states/interactions)  11. Quality Gates (testable checks).
- Takeaway: tokens (section 3) are the only machine-extracted part; sections 4-11 are templated policy. For Tysonpe, we should author sections 3, 6, 7, 10 ourselves from the research below and keep the TypeUI skeleton so any agent can consume it.

## 2. Emulated per-site DESIGN.md (Style Foundations only)

Source key: [css] = read from the site's stylesheets via curl; [visible] = WebFetch page text. Stripe CSS: https://b.stripecdn.com/mkt-ssr-statics/assets/_next/static/css/ (3 files). Linear: https://static.linear.app/web/_next/static/css/. Wise: https://wise.com/static-assets/app/_next/static/css/. Cashfree: https://cdn.prod.website-files.com/6a60525e5f4d2e4f1faed952/css/. Gumroad: https://assets.gumroad.com/vite/assets/entrypoints/design-D4K7HHQx.css. Razorpay: inline Framer styles in https://razorpay.com .

### 2.1 Stripe (stripe.com/in) - "calm light-weight editorial, indigo action"
- Palette [css]: action `#533afd` (brandDark-600, solid bg) / `#635bff` (most-used brand), brand-500 `#665efd`, brandDark-700 `#362baa`, tint `#f6f7ff`, ink navy `#061b31`, surface `#f8fafd`, border `#e5edf5`, white/black. Gradient accents: `#ee30fb`, `#ff6118`, `#ffd601`, `#ea2261` (hero art only).
- Type [css]: `sohne-var` (+SF Pro Display fallback); headings weight 300 (light), body 400. Scale (rem, responsive): xxl 2.125-3.5, xl 1.75-3, lg 1.375-2, md 1.25-1.625, sm 1.125-1.375; text xs .75-.875, sm .875, md 1, lg 1-1.125. Display tracking -0.02/-0.025em, line-height 1.03-1.12; body 1.4.
- Spacing [css]: 4px core: 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64. Most-used gaps 8/16/4.
- Radius [css]: xs 2, sm 4, md 6 (default, 108 uses), lg 16, xl 32, round 99999. Buttons: lg=4px, sm=2px (tight, not pill).
- Shadow [css]: `0 16px 32px rgba(50,50,93,.12)` (canary), `0 27px 40.5px -27px rgba(50,50,93,.25), 0 16.2px 32.4px -16.2px rgba(0,0,0,.1)` (cards), `0 2px 5px rgba(0,0,0,.1)`. Signature = blue-tinted (50,50,93) long soft shadow.
- Buttons [css]: primary solid indigo, white text; secondary transparent with quiet 1px border (brandDark 700 alpha), hover border darkens.
- Motion [css]: .3s most common, .15s, .25s, .5s; easing `cubic-bezier(.25,1,.5,1)` (44 uses, ease-out-quart-ish), also `.4,0,.2,1`, `.16,1,.3,1`.
- Visible [visible]: bento feature grid, stat strip ("135+ currencies", "99.999% uptime"), CTAs "Start now". Concrete numbers as proof.

### 2.2 Linear (linear.app) - "dark-first, hairline, opacity-based"
- Palette [css]: bg-level 0-3 `#08090a #0f1011 #141516 #191a1b`; light bg `#fff`, secondary `#f9f8f9`; text-primary `#f7f8f8` (dark) / `#282a30` (light); secondary `#d0d6e0`; tertiary `#8a8f98`; quaternary `#62666d`; brand `#5e6ad2` (also `#7070ff`, link `#828fff`); danger `#f34e52`. Borders in dark are white alpha: `#ffffff14 / 1f / 26`; light `#e9e8ea / e4e2e4 / dcdbdd`.
- Type [css]: `Inter Variable` (weights 400/510/590/680 - custom variable weights), `Berkeley Mono` for code/kbd. Sizes dominated by 13 (32 uses), 12, 14, 15; title 32-40. Tracking -0.022em on display, -0.012em subheads. Line heights 14/16/20/24px.
- Spacing [css]: gaps 2/4/6/8/12/16/24 (dense; 6 and 8 most common).
- Radius [css]: 4, 6 (24), 8 (39 - default), 9, 12, 50%. Button radius var `--radius-rounded`.
- Shadow [css]: `0 1px #0006`, `0 0 0 1px #0003` (ring), low `0 2px 4px #0000001a`, medium `0 4px 24px #0003`, high `0 7px 32px #00000059`; inset 1px border ring.
- Motion [css]: .16s (27 uses), .12s, .1s, 80ms, .2s; iOS-sheet easing `cubic-bezier(.32,.72,0,1)`; full named ease set (quad..expo) defined as vars. Speed is the brand.
- Rules: surfaces separate by 1px hairline + 1-step lightness, not shadow; secondary text is a lower-alpha ramp, not another hue.

### 2.3 Wise (wise.com/in) - "friendly-bold, green action, pill buttons"
- Palette [css]: forest `#163300` (text/brand dark), bright green `#9fe870` (action), neutral ink `#21231d`, muted `#5d7079`, greys `#c9cbce`, `#edeeec`; link blues `#00a2dd/#0097c7`, `#37517e`; negative `#e74848`; pastel accents bright-blue `#a0e1e1`, yellow `#ffeb69`, orange `#ffc091`, pink `#ffd7ef`; dark counterparts maroon `#320707`, purple `#260a2f`. Semantic alpha tokens (`--color-background-neutral: rgba(22,51,0,.078)`; hover .129; active .18).
- Type [css]: display `Wise Sans` (heavy, very tight: line-height .85-1.05, tracking -0.03em), body `Inter`. Sizes rem 12..32 in 2px steps via vars; hero 40-50px+ mobile, larger desktop. Weights 300/400/500/700/900.
- Spacing [css]: `--size-8/16/24`, `--mw-space-2/8/12/24`; padding 8/12/16/24.
- Radius [css]: small 10, medium 16, large 24, xlarge 32, full 9999 (buttons/pills/avatars 50%).
- Shadow [css]: mostly `none`; inset 1px `#c9cbce` ring for inputs; color-hard "coin" shadows. Flat, outlined.
- Motion [css]: .15s/.3s/.2s dominant, 0.35/0.4 for larger; easing `cubic-bezier(.6,.2,.1,1)` (54 uses), `.2,0,.2,1`-family, plus an overshoot `(.34,1.56,.64,1)` used sparingly (12) for playful bits.
- Visible [visible]: live currency converter on the hero (a functional widget, not a mockup); life-event copy; hard trust stats.

### 2.4 Razorpay (razorpay.com) - "enterprise navy/blue, Framer-built"
- Not a tokenised system (Framer inline styles). Palette by frequency [css]: ink navy `#192839` (74 uses), muted `#40566d`, brand blue `#305eff` / `#0052B4` / `#2950da`, light `#75a3ff`, surface `#f8fafc`, border `#DFE3E9`, slate `#768ea7`, red `#F0263C`, green `#009e5c`/`#b6ecd1`, body text `#333`.
- Type [css]: `Inter` and `Inter Tight` for display. Sizes/spacing: not extractable reliably (Framer per-component values) - not verified.
- Visible [visible]: product-category nav (Accept Payments, Payouts...), vertical tabs, RBI/PCI DSS compliance copy, code sample for developers.

### 2.5 Cashfree (cashfree.com) - "Webflow, white + green, DM Sans, big radii"
- Palette [css]: evergreen `#00ad5c`, graphite `#1d221f`, goldenhour `#ffae15`, mint tint `#f4fee7`/`#dbefd2`, warm paper `#f6f3ee`, neutrals `#222 #666 #aaa #ccc #eee`.
- Type [css]: `DM Sans` for all. h1 4rem, h2 3.5rem, h3 2.5rem, line-height 1.14, tracking -0.04em (h1/h2), -0.01em (h3). Page also uses 3, 2.25, 2, 1.75, 1.5, 1.25 rem.
- Spacing [css]: rem rhythm: gaps 1 / 2 / .5 / 1.5 / 3 / 2.5 rem; section padding 3rem; card padding 1.5-2rem.
- Radius [css]: .5, .625, .75, 1, 1.2, 1.5 rem, circle 100vw. Large and soft.
- Shadow [css]: stacked long soft `0 .375rem .8125rem #0000001a, 0 1.4375rem 1.4375rem #00000017, 0 3.3125rem 2rem #0000000d, 0 5.875rem 2.375rem #00000003` (layered "float").
- Motion [css]: .32-.56s, `cubic-bezier(.165,.84,.44,1)` (ease-out-quart) on almost everything. Slow vs Linear.
- Visible [visible]: "0% MDR" price-led headline, Cashfree-vs-Razorpay comparison table. Closest in-market peer to Tysonpe's concrete-numbers rule.

### 2.6 Gumroad (gumroad.com) - "neo-brutalist creator marketplace"
- Palette [css]: pink `#ff90e8` (brand), yellow `#f1f333`, purple `#90a8ed`, black `#000`, paper `#f4f4f0`, teal `#23a094`, orange `#f3a642`, red `#dc341e`. Black borders everywhere.
- Type [css]: `ABC Favorit` (display), system sans body; Tailwind v4 scale (text-2xl..7xl, 2.5rem/5xl headings).
- Spacing [css]: Tailwind 4px base (`--spacing:.25rem`), gaps 16/24/32 units dominant; product page max-width 75.25rem.
- Radius [css]: `.25rem` base, sm 4, md 6, lg 8, xl 12, pills `2147483647px` for tags.
- Shadow [css]: HARD offset shadows `4px 4px 0 #000`, `2px 2px 0 #000`, `.25rem .25rem 0 currentColor`; no blur.
- Motion [css]: .15s default, cubic-bezier(.4,0,.2,1) (Tailwind default). Almost no motion.
- Visible [visible]: "Go from 0 to $1", creator testimonials with real earnings. Creator-commerce peer; anti-reference for polish (loud), reference for copy.

### 2.7 Cross-site synthesis (what a fintech-grade system converges on)
- Radius: 4-8px for controls (Stripe 4-6, Linear 6-8) vs 10-24 (Wise/Cashfree, friendly). Tysonpe (warm paper, editorial) fits 6-8 controls / 12-16 cards.
- Shadows: only Stripe/Cashfree use layered soft; Linear/Wise use rings. Tysonpe's existing 2-layer `0 1px 3px .04 + 0 6px 16px .02` is correct and weaker than Stripe's; keep hairline + ring.
- Heading weight: light (Stripe 300) or heavy (Wise 900). Mid-weight 600 grotesque (Bricolage) is neither; pick a clear stance.
- Easing: ease-out-quart/quint family dominates (`.25,1,.5,1` Stripe; `.165,.84,.44,1` Cashfree; `.16,1,.3,1` Stripe modals). Durations: Linear 100-160ms, Wise 150-300ms, Stripe 150-300ms, Cashfree 320-560ms (too slow for utility UI).
- Letter-spacing: display -0.02 to -0.04em everywhere; Tysonpe's -0.025em is in range.

## 3. Design Motion Principles skill

- Repo: https://github.com/kylezantos/design-motion-principles (install `npx skills add kylezantos/design-motion-principles`; also https://www.skills.sh/aradotso/design-skills/design-motion-principles). Raw files read from https://raw.githubusercontent.com/kylezantos/design-motion-principles/main/skills/design-motion-principles/ : SKILL.md, references/{audit-checklist,anti-checklist,emil-kowalski,jakub-krehel,accessibility,performance,motion-cookbook}.md, workflows/audit.md. (Not read: jhey-tompkins.md, creation-gotchas.md, create.md, output-format.md.) It is a community skill that distills published work of Emil Kowalski, Jakub Krehel, Jhey Tompkins; it is not authored by them - cite as "distilled from".
- Two modes: Create ("build/animate") and Audit ("review/evaluate"). Weighting by context: SaaS dashboard/productivity = Emil > Jakub > Jhey; e-commerce / mobile / consumer = Jakub > Emil > Jhey. Tysonpe is both (creator dashboard + storefront/checkout): dashboard = Emil lens, storefront/checkout = Jakub lens.
- Golden rule: "best animation goes unnoticed"; if users comment on it, it is too prominent. Reduced motion is non-negotiable.

### 3.1 Principles with numbers
- Frequency gate (mandatory before approving any animation): rare (monthly) = expressive OK; occasional (daily) = subtle, 180-250ms; frequent (100s/day) = none or instant; keyboard-initiated = never animate.
- Duration: productivity UI < 300ms (180ms ideal, 180-250 daily range); production polish 200-500ms; hover transitions 150-200ms minimum (instant hover feels unpolished); drawer 500ms with `cubic-bezier(0.32,0.72,0,1)` (iOS sheet, also Linear's curve); toast 4000ms visible, 400ms ease.
- Easing: custom Bezier always; default `ease`/`ease-in-out` is flagged. Ease-out for enter. Origin-aware (`transform-origin` at trigger, e.g. popover from its button).
- Press feedback: `scale(0.97)` on `:active`. Never animate from `scale(0)`; start at >= 0.9.
- Enter recipe (Krehel): opacity 0->1, translateY ~8px->0, blur 4px->0, spring `duration .45, bounce 0`. Exit is subtler than enter (e.g. translateY -12px, shorter), never as prominent.
- Springs: production default `bounce: 0`; mouse-tracking spring stiffness 300 / damping 30. Bouncy/elastic only for rare, playful moments; never on utility actions (dropdown, toggle, modal).
- Tooltips: first shows delayed + animated; subsequent while adjacent = instant.
- Icon state swaps (copy -> check): animate opacity + scale + blur together; instant swaps feel jarring and get missed.
- Layout: shared `layoutId`/FLIP for card->modal; `clip-path` for reveals/tabs (no layout shift); velocity-based swipe dismissal, not distance; damping at boundaries.
- Shadows over solid borders when backgrounds vary; optical alignment over geometric.
- Stagger: use sparingly (see anti list); cookbook uses `calc(var(--index) * ...)` negative-delay pattern for looping effects, not list entrances.
- Blur as a mask: `filter: blur(2px)` hides rough state transitions.

### 3.2 Audit checklist (condensed, from audit.md + audit-checklist.md)
1. Context recon (CLAUDE.md, package.json, existing animations) and propose lens weighting; confirm with user.
2. Motion gap analysis (Critical): conditional renders with no AnimatePresence/transition, ternary swaps, inline-style changes with no `transition`, tab/toggle mode switches that snap.
3. Frequency gate per interaction. 4. Duration/easing audit (< 300ms for UI; custom curves; duration scaled to element size - not one value for everything). 5. Enter/exit asymmetry (exit subtler). 6. Springs: bounce 0 on utility. 7. Press/hover states exist (150-200ms). 8. `transform-origin` correct. 9. Tooltip sequencing. 10. Accessibility: `prefers-reduced-motion`. 11. Performance. 12. Anti-checklist (below).
- Severity: Critical (gaps, a11y violations), Important (inconsistency, perf), Opportunities. Output: HTML report `motion-audits/{project}-{ISO-date}.html` with looping CSS demos (3s cadence: ~2s motion, 1s hold), or inline markdown.

### 3.3 Anti-checklist: what NOT to animate / "AI slop motion"
Flag: any pulsing/glowing/breathing indicator (flag every instance); blur-enter on every element (>= 3 identical); hover-scale on everything (>= 3); stagger on every list (>= 2 lists in a view); any bouncy spring on utility actions; identical fade-up on >= 4 components; entrance motion on static text/nav/headings. Also: animating high-frequency or keyboard-initiated actions; > 300ms in UI; `scale(0)`; default CSS easing; keyframes where interruption matters (use transitions); CSS variables for per-frame updates (use direct style); exits as loud as enters; animating layout properties (width/height/top/left/margin/padding/font-size); no animation at all (instant state change feels broken); missing reduced-motion. Emil also lists serious/banking contexts as places to be minimal.

### 3.4 Reduced motion + performance (accessibility.md, performance.md)
- Reduced motion CSS: `animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important`. Distinguish functional motion (keep an instant/non-motion equivalent) from decorative (remove). Remove parallax, zoom, spin, unpaused loops; give pause control for ambient animation; verify every task works with motion off.
- Animate only `transform`, `opacity`, `filter`, `clip-path`/`mask`; `will-change` on 0-3 elements (4-10 test, 10+ rethink), never `will-change: all`, never site-wide. Gradient: animate position/size/opacity overlays, not color stops. Prefer CSS transitions for interruptible, keyframes for fixed sequences. Test low-end devices.

## 4. Conflicts between this skill and Tysonpe CLAUDE.md (resolve before build)
_Checked against both `ui-rebuild/CLAUDE.md` (newer: light-only, ink primary button, no indigo, honest copy, product-first landing) and the parent sandbox CLAUDE.md. Motion section is identical in both._
- Dark-luxury / Vengeance UI pattern in CLAUDE.md section 3 is moot for ui-rebuild (light only); Linear's dark tokens in 2.2 are structure references only.
- CLAUDE.md demands `animate-pulse` on emerald live-dot; the skill flags ANY pulsing indicator as slop. Recommendation: replace with a static dot + one-shot 600ms ring on state change, or pulse only while data is actually streaming (functional), with reduced-motion off-switch.
- CLAUDE.md: `active:scale-[0.98]` on every button; skill: `0.97`, and hover-scale-on-everything is flagged (press-scale is not hover-scale, so OK). Keep 0.98 for large buttons, 0.97 for small chips; both defensible.
- CLAUDE.md: copy-to-clipboard "spring pop to emerald checkmark" matches Krehel's icon swap (opacity+scale+blur) but spring must be `bounce: 0`-ish; use a tiny overshoot only for this rare moment.
- CLAUDE.md "staggered entrance" for Animaster pattern: limit to one stagger group per view, <= 40ms step, <= 6 items.
- CLAUDE.md fast=150ms `(0.2,0,0,1)` and overlays=220ms `(0.16,1,0.3,1)`: both valid. `.16,1,.3,1` is literally Stripe's modal curve; `.2,0,0,1` is a Material-style standard-decelerate (Wise uses `.2,0,0,1` too).

## 5. Motion tokens (CSS custom properties; Tailwind v4 `@theme` compatible)

```css
:root {
  /* durations */
  --dur-instant: 80ms;    /* keyboard-initiated, high-frequency: effectively no motion */
  --dur-fast: 150ms;      /* hover, press, chip, toggle, icon swap (Linear .16s, Stripe .15s) */
  --dur-base: 200ms;      /* popover, tooltip, menu, tab indicator */
  --dur-overlay: 220ms;   /* modal, drawer, sheet enter (exit = 160ms) */
  --dur-exit: 160ms;      /* exits are shorter + subtler than enters */
  --dur-reveal: 320ms;    /* rare: page/section reveal, receipt success, payout confirmed */
  --dur-sheet: 500ms;     /* only native-feel bottom sheet on mobile */

  /* easings (all ease-out family for entering; never default ease) */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);      /* controls: hover/press/toggle */
  --ease-out:      cubic-bezier(0.25, 1, 0.5, 1);   /* Stripe's most-used curve; general enter */
  --ease-overlay:  cubic-bezier(0.16, 1, 0.3, 1);   /* modals/drawers/popovers */
  --ease-sheet:    cubic-bezier(0.32, 0.72, 0, 1);  /* iOS-style sheet, Linear/Vaul */
  --ease-in-out:   cubic-bezier(0.65, 0.05, 0.36, 1); /* on-screen position moves only */
  --ease-pop:      cubic-bezier(0.34, 1.56, 0.64, 1); /* ONLY copy-check / success tick (rare) */

  /* distances & scale */
  --move-enter: 8px;           /* translateY on enter */
  --move-exit: -6px;           /* subtler than enter */
  --blur-enter: 4px;           /* enter blur; mask-only 2px for icon swaps */
  --scale-press: 0.97;         /* small chips/buttons :active */
  --scale-press-lg: 0.98;      /* large CTAs, cards */
  --scale-enter-min: 0.94;     /* popover/modal start (never < 0.9) */

  /* stagger (max 1 group per view, <= 6 items) */
  --stagger-step: 40ms;
  --stagger-max: 240ms;

  /* spring (for Motion/framer): bounce 0; use via JS, mirrored here for docs */
  --spring-ui-duration: 0.45s;
  --spring-ui-bounce: 0;
  --spring-pointer-stiffness: 300;
  --spring-pointer-damping: 30;

  /* tooltip */
  --tooltip-delay-first: 400ms;   /* subsequent tooltips: 0ms */
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: .01ms; --dur-base: .01ms; --dur-overlay: .01ms; --dur-exit: .01ms; --dur-reveal: .01ms; --dur-sheet: .01ms;
          --move-enter: 0px; --move-exit: 0px; --blur-enter: 0px; --stagger-step: 0ms; }
  *, *::before, *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
}

/* reference enter/exit */
.enter { animation: enter var(--dur-overlay) var(--ease-overlay) both; }
.exit  { animation: exit  var(--dur-exit)    var(--ease-standard) both; }
@keyframes enter { from { opacity:0; transform: translateY(var(--move-enter)) scale(var(--scale-enter-min)); filter: blur(var(--blur-enter)); } }
@keyframes exit  { to   { opacity:0; transform: translateY(var(--move-exit)); filter: blur(2px); } }
.press { transition: transform var(--dur-fast) var(--ease-standard), background-color var(--dur-fast) var(--ease-standard); }
.press:active { transform: scale(var(--scale-press)); }
```

## 6. Apply to Tysonpe (10 lines)
1. Write `ui-rebuild/DESIGN.md` using the TypeUI 11-section skeleton; fill Style Foundations from section 2.7 and the ui-rebuild/CLAUDE.md palette (light only: paper `#fbfaf7`, ink `#16130f` also primary button, hairline `#e4dfd3`, emerald `#0f7b4d` for money/success/logo only; NO indigo/violet, so do not copy Stripe/Linear brand hues, only their structure).
2. Type: keep Bricolage display at -0.025em; set body 14-15px / 1.4 and tabular-nums for all INR; steal Linear's tertiary-text ramp (3 text alphas, not extra hues) and Stripe's 4px-core spacing scale (4,6,8,12,16,24,32,48,64).
3. Radius: 6px controls, 8px inputs/menus, 12px cards, 16px modals, full for pills; stop mixing (Stripe/Linear precedent).
4. Surfaces: hairline ring + 1-step tint for dashboard (Linear); a single Stripe-style tinted long shadow only on floating layers (checkout modal, menus), tint it warm (`rgba(22,19,15,.12)`), never on in-page cards.
5. Dashboard (Emil lens): no entrance animation on tables, nav, headings, KPI numbers; row hover 150ms; no motion on keyboard shortcuts or command-palette result navigation.
6. Storefront/checkout (Jakub lens): modal/drawer `--dur-overlay` + `--ease-overlay`, exit 160ms; Razorpay-modal and Easebuzz-redirect simulations animate once, then still.
7. Replace the always-on `animate-pulse` live dot with a static emerald dot plus a one-shot ring when a status changes; animate the 15-minute countdown by numbers only (tabular-nums), not by pulsing.
8. Success moments (payment captured, payout settled, invoice generated) are the "rare" tier: `--dur-reveal` with `--ease-pop` check, once, no confetti.
9. Enforce via lint/review: only transform/opacity/filter; no `transition: all`; no default `ease`; every `@keyframes` covered by the reduced-motion block; run the skill's audit (`npx skills add kylezantos/design-motion-principles`, then "audit motion") on `src/` before each milestone and treat Critical = gap or a11y.
10. Keep a motion budget in DESIGN.md: max 1 stagger group per view, max 3 elements with `will-change`, blur-enter only on overlays, no hover-scale on cards (use border-shine/shadow shift at 150ms instead).

## 7. URLs
- https://github.com/bergside/design-md-chrome ; https://cdn.jsdelivr.net/gh/bergside/design-md-chrome@main/README.md
- https://github.com/kylezantos/design-motion-principles ; raw: https://raw.githubusercontent.com/kylezantos/design-motion-principles/main/skills/design-motion-principles/ (SKILL.md, references/*, workflows/audit.md)
- https://stripe.com/in ; https://linear.app ; https://wise.com/in ; https://razorpay.com ; https://www.cashfree.com ; https://gumroad.com (+ their CSS files listed in section 2)
