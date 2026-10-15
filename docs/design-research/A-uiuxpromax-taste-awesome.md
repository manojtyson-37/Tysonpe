# A. UI UX Pro Max, Taste Skill, Awesome Claude Design: extraction for Tysonpe

Researched 2026-10-15. Research only: no `src` edits, nothing committed. Raw captures live in the session scratchpad, not in the repo.

Tysonpe constraints held against everything below, taken from `ui-rebuild/CLAUDE.md` (which supersedes the older sandbox CLAUDE.md): light only, warm paper `#fbfaf7`, warm ink `#16130f` (also the primary button `--brand`), hairline `#e4dfd3`, emerald `#0f7b4d` reserved for money, success and the logo mark, NO indigo/violet anywhere; Bricolage Grotesque display (h1-h3), Plus Jakarta Sans body, JetBrains Mono for figures and ledgers; product-first landing on paper (one real computed sale in the hero, tables not card grids, no video or generated imagery); pages = landing, storefront, checkout, dashboard, LMS, community; copy honest (state Live vs Planned, test-mode payments, no invented customers, testimonials, uptime or certifications). Note: the older sandbox CLAUDE.md still listed indigo `#5b3df5` as brand; ui-rebuild drops it, and this document follows ui-rebuild.

Contrast facts measured for this doc (WCAG 2.x formula): ink on paper 17.7:1; (old indigo `#5b3df5` on paper 5.9:1, white on it 6.1:1, now unused); emerald `#0f7b4d` on paper 5.1:1; white on emerald 5.3:1; `#6b655a` on paper 5.5:1; `#8a8478` on paper 3.6:1 (fails body text, ok for 18px+ only); old hairline `#e7e2d8` on paper 1.2:1 (new `#e4dfd3` is about the same) (decorative only, never the sole signal of a boundary or state).

---

## 0. Sources and licences

| Resource | URL | Licence | Notes |
|---|---|---|---|
| UI UX Pro Max (installed skill) | `~/.claude/skills/ui-ux-pro-max` (SKILL.md, `scripts/search.py`, `data/`) | Not stated in the installed folder; I did not find a LICENSE file there. Treat as third-party, use outputs as guidance only. | Ran locally via `search.py` |
| Taste Skill | https://github.com/Leonxlnx/taste-skill | MIT (c) 2026 Leonxlnx | 96.7k stars on 2026-10-15 (not 76k). v2.0.0 released 2026-10-13 |
| Awesome Claude Design | https://github.com/VoltAgent/awesome-claude-design | MIT (repo). Linked DESIGN.md files carry a disclaimer: "inspired by publicly observable design patterns", not official, not affiliated; trademarks belong to owners | 4.1k stars. 68 entries confirmed by badge |
| DESIGN.md files (Stripe, Linear, Wise, Mastercard) | `https://getdesign.md/design-md/<slug>/DESIGN.md` (slugs `stripe`, `linear.app`, `wise`, `mastercard`) | Hosted by getdesign.md (VoltAgent). Same disclaimer. Fonts named in them are proprietary; brand marks and fonts must not be copied | |
| Mercury DESIGN.md (bonus) | https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/mercury/DESIGN.md | MIT (c) 2026 VoltAgent (sibling repo, 121k stars) | Mercury is NOT in the 68-entry Awesome Claude Design list; it is in awesome-design-md |

---

## 1. UI UX Pro Max output (ran `search.py` locally)

Skill facts: 67 styles, 161 palettes, 57 font pairings, 99 UX guidelines, 25 chart types. Domains: product, style, typography, color, landing, chart, ux, react, web, prompt. Stack guidance exists for nextjs.

Important caveat first: the tool is a keyword matcher over CSV rows. Its answers are generic and several clash with Tysonpe's identity. Treat as a checklist source, not a design.

### 1.1 Recommendations per product type (`--design-system`, plus `--domain product/color/typography/landing`)

| Query | Landing pattern | Style | Palette (primary / accent / bg / fg / border) | Fonts (heading / body) | Avoid |
|---|---|---|---|---|---|
| fintech payments | Trust & Authority (hero, features, CTA; CTA above fold) | Exaggerated Minimalism (oversized type, high contrast, negative space; `clamp(3rem,10vw,12rem)`, weight 900, tracking -0.05em). Product row itself says "Glassmorphism + Dark Mode (OLED)", secondary Retro-Futurism, Motion-Driven; dashboard "Real-Time Monitoring + Predictive" | `#F59E0B` / `#8B5CF6` / `#0F172A` / `#F8FAFC` / `#334155`; ring `#F59E0B`; destructive `#EF4444`. Note "Gold trust + purple tech" | Calistoga / Inter (+ JetBrains Mono for data labels, 12pt uppercase tracking 1.5). Alt: IBM Plex Sans single family "Financial Trust" | "Playful design + Unclear fees + AI purple/pink gradients" |
| creator commerce / marketplace | Marketplace/Directory: Hero (search) > Categories > Featured listings > Trust/Safety > CTA (become seller). Creator Economy row: "Social Proof-Focused" | Vibrant & Block-based + Flat (marketplace); Vibrant & Block + Bento Box Grid, secondary Motion-Driven, Aurora UI (creator economy). Dashboard: "User Behavior Analytics" / "E-commerce Analytics" | Creator Economy: `#EC4899` / `#EA580C` / `#FDF2F8` / `#831843` / `#FBCFE8`. Link-in-bio builder: `#2563EB` / `#EC4899` / `#FFFFFF` / `#0F172A` / `#E4ECFC` | Rubik / Nunito Sans (e-commerce clean) | "Low trust signals + Confusing layout" |
| SaaS dashboard | Real-Time / Operations Landing: Hero (product + live preview) > Key metrics > How it works > CTA; "demo or sandbox link, trust signals" | Motion-Driven; product rows: SaaS (General) = Glassmorphism + Flat, dashboard "Data-Dense + Real-Time Monitoring"; Micro SaaS = Flat + Vibrant, "Executive Dashboard" | Financial Dashboard: `#0F172A` / accent green `#22C55E` / bg `#020617` / card `#0E1223` / border `#334155`. "Dark bg + green positive indicators" | Fira Code / Fira Sans (dashboard data). Alt: Plus Jakarta Sans single family "Friendly SaaS" | "Static design + No video + Poor mobile" |
| e-commerce checkout | Feature-Rich Showcase (no checkout-specific landing row found) | Vibrant & Block-based; luxury variant: Liquid Glass + Glassmorphism | E-commerce: `#059669` / `#EA580C` / `#ECFDF5` / `#064E3B` / `#A7F3D0`; "Success green + urgency orange". Luxury: `#1C1917` / `#A16207` / `#FAFAF9` / `#0C0A09` / `#D6D3D1` | Rubik / Nunito Sans; luxury Cormorant / Montserrat | "Flat design without depth + Text-heavy pages" |
| online course / LMS | Feature-Rich + Social Proof; Educational App row: Storytelling-Driven | Claymorphism + Vibrant & Block (kids/edu skew; not suited to Tysonpe) | `#0D9488` / `#EA580C` / `#F0FDFA` / `#134E4A` / `#5EEAD4`; "Progress teal + achievement orange". Muted fg for all palettes `#64748B` | Magazine Style: Libre Bodoni / Public Sans (also returned); Baloo 2 / Comic Neue for kids (reject) | "Boring design + No gamification" |

Shared design-system values the tool emits: pre-delivery checklist = no emoji icons (use Heroicons/Lucide SVG), `cursor-pointer` on clickable items, hover transitions 150-300ms, light-mode text contrast 4.5:1, visible focus states, `prefers-reduced-motion`, responsive checks at 375 / 768 / 1024 / 1440.

Landing search returned 0 rows for "fintech", "e-commerce checkout" and "online course". Typography returned 0 rows for "creator marketplace". Style "Minimalism & Swiss Style" row: single primary accent, `--border-radius: 0px`, no shadow, 12-16 column grid, AAA contrast. "Trust & Authority" style row: certificate/security badges, metric cards with sources, `--trust-color #1E40AF`, `--security-green #059669`, `--card-shadow 0 4px 6px rgba(0,0,0,.1)`; checklist says "Metrics with sources" and "Guarantee clearly stated".

### 1.2 UX guidelines returned (severity from the tool)

- Forms (checkout): show loading then success/error after submit (High); inputs need real `<label for>`, never placeholder-only (High); validate on blur, not only on submit (Medium); use correct `type` (email, tel, number, url) (Medium); proper `autocomplete` attributes, do not blanket `autocomplete="off"` (Medium); mobile keyboards via `inputmode="numeric"` for OTP, amount, pincode (Medium).
- Errors: `aria-live` or `role="alert"`, never visual-only (High); error must offer a recovery path (Medium).
- States: loading = skeleton or spinner, never a frozen blank (High); empty states need a helpful message plus an action (Medium); active nav item highlighted by colour or underline (Medium).
- Navigation: preserve browser back behaviour (High); sticky nav must not obscure content, pad body by nav height (Medium).
- Dashboard tables: horizontal scroll wrapper or card layout on mobile (Medium); multi-select plus bulk action bar for repeated edits (Low).
- Touch: 44x44px minimum targets (High); 8px minimum gap between targets (Medium).
- Contrast and type: 4.5:1 normal text (High); no grey-on-grey (High); focus rings never removed without replacement (High); tab order matches visual order, no traps (High).
- Motion: 150-300ms micro-interactions, nothing over 500ms for UI (Medium); continuous animation only for loaders, never decoration (Medium).
- Content: thousand separators or abbreviations on long numbers (Low). Note: Indian grouping (12,34,567) is not mentioned by the tool; Tysonpe should use `Intl.NumberFormat('en-IN')`.
- Performance (Next.js stack): use `next/font` (self-hosted, zero layout shift), single variable font file, `next/image` for all images, `priority` only on the LCP hero image, set OpenGraph images, `font-display: swap`, lazy load below-fold.
- Sustainability: no autoplay high-res video loops; muted, `playsInline`, `preload="none"`, click to play.

### 1.3 Chart types returned (from `charts.csv`)

| Data | Best chart | Rules | Accessibility |
|---|---|---|---|
| Trend over time (revenue, payouts, signups) | Line; secondary Area / Smooth Area | Needs 4+ points else use a stat card; max 6 series; SVG under 1000 points, Canvas with downsampling above; fill 20% opacity | AA. Differentiate series by dash style, not colour alone; togglable data table fallback |
| Compare categories (top courses, products, sources) | Horizontal or vertical bar; secondary grouped bar | 15 categories or fewer; sort descending; under 20 vertical bars, 20-50 horizontal, over 50 a paginated table | AAA. Value labels always visible; sort control; CSV export |
| KPIs vs target (monthly goal, payout threshold) | Bullet chart (3-10 in a grid) or Gauge for a single KPI | Numeric value and % of target shown as text; target as a marker line | AAA bullet / AA gauge. Never rely on colour position alone; ARIA live region for updates |
| Funnel (visit > add to cart > pay; enrol > lesson 1 > complete) | Funnel or Sankey; secondary Waterfall | 3-8 stages; show conversion % per stage, highlight biggest drop; single-hue gradient | AA. Linear list fallback with stage, count, drop-off % |
| Proportion / progress (course completion) | Waffle (10x10), or 100% stacked bar | 5 categories max; 2-3px gaps; percentage text always visible; `aria-label` per cell | AA, better than pie |
| Composition (hierarchical) | Treemap | Poor baseline accessibility; table must be the primary view | Poor |
| Real-time stream | Streaming area chart | Needs pause/resume; current value as large KPI text; respect reduced motion | |
| Multi-variable compare | Radar | 2-3 datasets, 5-8 axes; grouped bar as mandatory alternative | B. Skip |
| Geographic | Choropleth/bubble | Possible for India state sales; table fallback; avoid on mobile | B |

Suggested chart colour guidance from the tool: line primary `#0080FF` (replace with Tysonpe ink `#16130f`, emerald only for money series), bullet ranges `#FFCDD2 / #FFF9C4 / #C8E6C9`, target marker black 3px. Libraries named: Chart.js, Recharts, ApexCharts, D3, Plotly, custom SVG.

### 1.4 What to take and what to reject

Take: the checklist rules, chart-type choice table, form/state/a11y guidelines, Next.js font/image rules, the "show numeric value as text next to every chart" pattern.
Reject: gold-and-purple dark fintech palette and Exaggerated Minimalism at weight 900 (clashes with Tysonpe warm-paper identity); pink creator palette; clay/kids typography for LMS; "Glassmorphism + OLED dark" as fintech default (its own AVOID row bans AI purple gradients, and Taste bans glass).

---

## 2. Taste Skill: rules as an audit checklist

Repo: https://github.com/Leonxlnx/taste-skill (MIT). Current default `skills/taste-skill/SKILL.md` = "tasteskill v2" (2.0.0, 2026-10-13), a full rewrite built from a study of 247 gallery sites. Older versions preserved: v1 (`skills/taste-skill-v1`, the three-dial version with `DESIGN_VARIANCE 8 / MOTION_INTENSITY 6 / VISUAL_DENSITY 4`), `taste-skill-v2-experimental`, plus variants `soft-skill`, `minimalist-skill`, `brutalist-skill`, `redesign-skill`, `output-skill`, `gpt-tasteskill`, `stitch-skill`, `brandkit`, `image-to-code-skill`, `imagegen-frontend-web/mobile`.

### 2.0 Read this before using it (conflicts with Tysonpe CLAUDE.md)

1. v2 states in its own description: "Not for dashboards or app screens." It targets public marketing pages. Apply v2 strictly only to landing, storefront hero, LMS catalogue and community public pages. For dashboard, checkout and app screens use v1 Section 3/7 (it has Dashboard Hardening and density dials) and the `redesign-skill` audit.
2. v2 house rules ban things Tysonpe's CLAUDE.md mandates: tiny uppercase tracked micro-labels (`text-xs font-semibold uppercase tracking-wider`), hairline borders and 1px outlined boxes (`border-line/80`), multi-layer card shadows, monospace, index numbering, and pulsing status dots. Decision needed from the owner (see section 5 item 1). Do not silently pick.
3. v2 bans violet/indigo palettes (inspector FAIL `palette-purple`). ui-rebuild already removed indigo, so this rule is satisfied with no exception and no `--allow` flag needed. Colour roles then map cleanly onto Taste's "one ground, one ink, one accent": ground paper, ink `#16130f` (also the button), single accent emerald for money/success only.
4. v2 bans "yellow-cream ground + terracotta". Tysonpe paper `#fbfaf7` is near-white and very low chroma (saturation about 2%, well under the "about 15%" low-chroma-stone threshold v2 calls acceptable), and the accent is emerald/indigo, not terracotta. Passes. Keep emerald and indigo; never add terracotta/rust/clay.
5. I read: v2 `SKILL.md`, `references/tells.md`, `references/copy.md` (sections 1, 2, 5, 6), `scripts/lib/rules.mjs` (the FAIL/WARN list), motion.md (sections 1, 3, 6, 7), colour.md section 8-9, type.md section 8, critique.md caps, v1 `SKILL.md`, `redesign-skill/SKILL.md`. I did not run `draw.mjs`, `lint.mjs` or `inspect.mjs` (they need Node 22 + Chrome and would need to be installed); I did not read `research.md`, `imagery.md`, `layout.md` in full or the `library/*.json` files.

### 2.1 Tier A: v2 hard bans (the inspector FAILs these). Audit every public page.

- [ ] A1 No headline over 2 lines at 1440, 768 and 390 px (all h1-h6 plus the hero main line). Budget about 32 characters for a hero at phone width; use `max-width` in `ch`, `text-wrap: balance`, authored breaks.
- [ ] A2 No eyebrow/kicker label above a heading; no pill badge above the hero headline ("New", "Beta", "Introducing").
- [ ] A3 No monospace outside real code blocks and tables. Use tabular figures of the text face for numbers.
- [ ] A4 No decorative index numbers (01 / 02 / 03, "Step 2", (001)). A real `<ol>` is fine.
- [ ] A5 3 or more tiny uppercase letter-spaced labels on a page = FAIL (1-2 = WARN). Use sentence case at readable size.
- [ ] A6 No emoji anywhere (also in alt text and copy).
- [ ] A7 No gradients (backgrounds, buttons, text). Only exception: a neutral scrim under text on a photo. No gradient-filled text.
- [ ] A8 No box-shadow on resting elements, no text-shadow, no glows. Shadows only for things that float (menu, dialog, sticky). Separate surfaces with a one-step tone change.
- [ ] A9 Buttons: flat, one fill, no gradient, no shadow/glow. Radius chosen once (square or full pill).
- [ ] A10 3 or more boxes with a 1px outline = FAIL (1-2 = WARN). Dashed/dotted borders WARN unless a real drop zone.
- [ ] A11 No rows of identical cards topped with an icon. Two or more rows of identical boxed cards = WARN.
- [ ] A12 No violet/indigo palette, no cream + terracotta, no terracotta alone (Tysonpe has none of these; no `--allow` flags needed). Yellow-cream ground alone WARN.
- [ ] A13 Text contrast: under about 2.6:1 FAIL; body 4.5:1 minimum (WARN below); body copy in full ink (7:1 or more is the target; a soft grey body = WARN `grey-body`).
- [ ] A14 No more than 3 typefaces (FAIL over 3, WARN at 3). House rule says two at most, one is normal.
- [ ] A15 Body text at least 15px (FAIL under 15, WARN under 16 on desktop). Fewer than 4 text blocks under 13px (FAIL over 3).
- [ ] A16 No horizontal overflow at any width; no broken images.
- [ ] A17 Every page needs a clear focal point in the first viewport (largest type or one picture covering a third of the screen) and a visible real button for the primary action in the first screen.
- [ ] A18 Pictures floor on public pages: at least 4 real pictures (photos, footage, raster art; SVG drawings do not count; interface fragments count for software). Tysonpe note: only use pictures that honestly exist (creator-supplied or the product's own UI); never fake product shots (see C4).
- [ ] A19 `data-ui` attribute may only wrap a cropped interface fragment, never page-level wrappers or headings.

### 2.2 Tier B: v2 warnings (need a one-sentence defence)

- [ ] B1 Backdrop-blur surfaces more than 1 (one blurred sticky bar at most); floating rounded pill nav WARN.
- [ ] B2 One word of a headline in a different face/italic/colour/underline (`mixed-font-headline`).
- [ ] B3 Headline hero longer than 10 words (gallery median is 5); statement text set large running past 3 lines.
- [ ] B4 More than 9 distinct font sizes (target about 5: display, heading, lead, body, small).
- [ ] B5 More than 72% of text centred; centre at most one moment.
- [ ] B6 Paragraph measure over 88 characters (target 45-75, `max-width: 60ch`).
- [ ] B7 Browser-default blue/purple links showing.
- [ ] B8 Declared font not actually loaded (fallback rendering); check with `next/font`.
- [ ] B9 Rows that scroll sideways with content cut at the edge; `mix-blend-mode` difference/exclusion on text.
- [ ] B10 Fewer than 2 real photos/clips; no footage anywhere (WARN only).
- [ ] B11 Motion: fewer than 8 elements that actually move on load/scroll = FAIL (`still-page`), under 16 WARN. This conflicts with a strict "restraint" reading; see C6.

### 2.3 Tier C: v2 design laws and process rules (judgement, not measured)

- [ ] C1 Idea from the subject: fill "On this page, [something belonging to this product] becomes [device]". Competitor test: if the nearest competitor fits the sentence, the idea is generic. Tysonpe candidates: the real GST invoice line, the T+1 payout timeline, a UPI collect request, a creator's own storefront URL.
- [ ] C2 One live thing per public page, made from real content, thumb-usable on phone, plain fallback without JS, never blocking reading (e.g. a payout/fee calculator using Tysonpe's actual fee table; GST breakdown for a price). Only if the numbers are true (see C4).
- [ ] C3 Write the argument first: one line per section as claim plus proof; delete sections without a claim; avoid the stock order hero > logos > three features > testimonial > pricing > CTA.
- [ ] C4 Honest proof: never invent customers, quotes, press, logos, ratings, user counts or benchmarks. If a testimonial section is requested with no real quotes, build with plainly fictional sample content and list it for replacement before launch. Sample content (names of courses, prices) must be listed in the report. Never fake a payment form; a payment button points to the real flow.
- [ ] C5 Section variety: neighbouring sections never share a layout; carry the idea into pricing, FAQ and footer too; gap between sections clearly larger than any gap inside one (120-220px desktop). One deliberate rest per page at most (the inspector fails 2+ near-empty screens).
- [ ] C6 Type laws: two or three sizes do the work (one very large, one small); display tracking -0.02 to -0.05em, leading 0.85-1.05; text 16-20px, leading 1.45-1.6, 45-75 characters; left-aligned by default; five sizes ceiling.
- [ ] C7 Colour laws: one ground, one ink, one accent (accent on the action plus perhaps one other thing); surfaces separated by a small tone step; running text full ink; a section may switch the whole field colour; nothing fades into anything.
- [ ] C8 Imagery laws: one dominant image beats six small; same crop ratios and treatment; no image beats a placeholder, icon or abstract shape; credit found images.
- [ ] C9 Components: nav = wordmark, 3-5 plain links, one action; footer is a designed close (the name returns at full width), not a link farm.
- [ ] C10 Copy bans (flagged by `lint.mjs`): unlock, unleash, supercharge, elevate, empower, streamline, seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one, blazing fast; "not just X, it's Y"; tricolon headlines; "Get started" and "Learn more" as button labels (name the action); more than a handful of em dashes (one or two are fine); lorem ipsum; performative labels ("Field notes", "Quietly trusted by"); furniture text ("Est. 2024", coordinates, "Scroll"); status lines with a dot ("Available for work"); step labels that duplicate numbers; three parallel items everywhere (use the number the content has).
- [ ] C11 Motion rules: one signature move; per-section entrance staggered 60-90ms rising 16-32px with opacity, once; not the same fade-up on every block; feedback on every control (press, hover, focus); animate transform/opacity/clip-path only; never hide content if script fails; reduced motion keeps opacity/colour, drops travel/scale/parallax/autoplay; no scroll hijack, no smooth-scroll library, no custom cursor; no bounce or elastic easing; pause loops off-screen; no infinite meaningless loops (pulsing dots, shimmer, rotating badges). Tokens: `--ease-out cubic-bezier(0.22,1,0.36,1)`, `--t-press 140ms`, `--t-hover 180ms`, `--t-ui 240ms`, `--t-reveal 800ms`. Never `transition: all`.
- [ ] C12 Critique loop: screenshots at 1440 / 768 / 390, score against `references/critique.md` (14 passes, Awwwards-weighted). Caps: any FAIL caps overall at 6.0; 3+ line headline, eyebrow, mono label, numbering, gradient, resting shadow or decorative hairline caps at 6.5; fewer than 4 real pictures caps design at 6.5; any placeholder (grey box, lorem, "Image here") caps content at 5; anything covering a headline caps usability at 6; a blank band where a reveal failed caps usability at 5.
- [ ] C13 Removal is not enough: a page with every tell removed and nothing in their place is itself a tell (the "avoidance aesthetic"). Fill space with scale, full content, a picture made for the subject, or a flat colour field; never another ornament.

### 2.4 Applicable rules from v1 and redesign-skill (for dashboard, checkout, LMS app, community)

- Dashboard hardening (density above 7): drop generic card boxes; group by `border-t`, `divide-y` or negative space; use cards only where elevation communicates hierarchy; numbers monospace or tabular. This is more compatible with Tysonpe's hairline rules than v2.
- Dials: v1 baseline VARIANCE 8, MOTION 6, DENSITY 4. For Tysonpe app screens, suggest VARIANCE 3-4, MOTION 3-4, DENSITY 7 (dashboard) / 4 (checkout) (these are my suggestions, not from the repo).
- Forms: label above input, helper text optional, error text below, `gap-2`. Mobile layouts: `min-h-[100dvh]` not `h-screen`; CSS Grid not flex percentage math; container `max-w-[1400px]`.
- Interactive states: skeleton loaders that match layout (no spinners), composed empty states, inline errors (no `alert()`), `:active` press feedback `scale(0.98)` or `translateY(1px)`, visible focus ring, hover on every control, active nav state, no dead `#` links.
- Redesign audit highlights: avoid Inter-only/default fonts; more than one accent; mixing warm and cool greys (Tysonpe: stay in one warm grey family); pure `#000`; oversaturated accents (saturation under 80%); tint shadows to background hue; uniform border-radius on everything; symmetrical vertical padding; buttons not bottom-aligned in card groups; pricing feature lists starting at different Y positions; "Oops!" errors and exclamation marks in success messages; Title Case On Every Header (use sentence case); fake round numbers (99.99%) and "John Doe" names; missing legal links, 404 page, skip-to-content link, form validation, favicon, meta/OG tags, alt text; arbitrary `z-index: 9999`; div soup (use semantic elements); sidebar rail needs 44x44 targets, accessible names, `aria-expanded`, and `inert` management.
- Tysonpe conflict note: v1 bans Inter and Serif-on-dashboard, and "NO Oversized H1s". Tysonpe's Bricolage + Plus Jakarta pairing passes the font ban. Hero 56px with Bricolage is a commanding scale, which v2 wants; v1's "no oversized H1" contradicts it. Follow v2 for marketing, v1 for app.

---

## 3. Awesome Claude Design: how a DESIGN.md is structured

Repo https://github.com/VoltAgent/awesome-claude-design (MIT) is an index only: its README and LICENSE are the only two files. The 68 entries link out to `getdesign.md/<brand>/design-md` pages; the actual markdown is at `getdesign.md/design-md/<slug>/DESIGN.md` (found by trial; the page itself is client-rendered). Categories: AI & LLM (12), Developer tools (7), Backend/DB/DevOps (8), Productivity & SaaS (7), Design & creative (6), Fintech & Crypto (7: Binance, Coinbase, Kraken, Mastercard, Revolut, Stripe, Wise), E-commerce (4), Media & consumer (11), Automotive (6). Mercury is not among them.

The README's stated 9-section anatomy (and what each is for):
1 Visual Theme & Atmosphere (tone, density, mood) · 2 Color Palette & Roles (semantic names plus hex) · 3 Typography Rules (type scale, font fallbacks) · 4 Component Stylings (buttons, inputs, cards, nav with states) · 5 Layout Principles (spacing scale, grid, whitespace) · 6 Depth & Elevation (shadow tokens, surface hierarchy) · 7 Do's and Don'ts (guardrails) · 8 Responsive Behavior (breakpoints, touch targets, collapse) · 9 Agent Prompt Guide (reusable prompts). Core idea in the README: "token, rule and rationale in the same file". Usage: upload to Claude Design (claude.ai/design) which scaffolds README, `colors_and_type.css`, preview cards, a UI kit and a `SKILL.md`; or `npx getdesign@latest add <name>` into a project root.

What I actually observed in the files (structure varies, which the README does not say):
- Stripe, Linear, Wise and Mercury use the newer Google-Stitch-style format: a YAML front matter (`version: alpha`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components` with token references like `"{colors.primary}"`) followed by markdown sections: Overview (with "Key Characteristics"), Colors, Typography (Font Family, Hierarchy table, Principles, Note on Font Substitutes), Layout (Spacing System, Grid, Whitespace Philosophy, Responsive), Elevation & Depth (level table), Shapes (radius scale), Components, Do's and Don'ts, Responsive Behavior, Iteration Guide. It says to lint with `npx @google/design.md lint DESIGN.md`.
- Mastercard uses the older numbered 9-section prose format with no front matter and an "Agent Prompt Guide" with example prompts and a "Known Gaps" list.
- The Stripe file's internal name is "Stripi-design-analysis" (typo/obfuscated brand), a sign these are LLM-generated "inspired" analyses, not Stripe's own system. Values are plausible but unverified against production CSS. Treat as inspiration.

### 3.1 Picks (closest to Stripe / Linear / Wise / Mercury-style fintech)

The brief names Stripe, Linear, Wise, Mercury. Three are in the 68; Mercury is not. Mastercard is the fourth pick from the 68 because it is the only fintech file on a warm, non-white canvas (closest to `#fbfaf7`). Mercury is added as a bonus from the sibling repo.

#### Stripe (https://getdesign.md/stripe/design-md)
- Colors: primary indigo `#533afd` (deep `#4434d4`, press `#2e2b8c`, soft `#665efd`, subdued tag fill `#b9b9f9`); navy ink `#0d253d`, ink-secondary `#273951`, ink-mute `#64748d`; brand-dark `#1c1e54` (featured tier, dashboard chrome); canvas `#ffffff`, canvas-soft `#f6f9fc`, canvas-cream `#f5e9d4` (warm interlude band); hairline `#e3e8ee`, input hairline `#a8c3de`; ruby `#ea2261`, magenta `#f96bee`, lemon `#9b6829` (gradient stops only, never buttons); shadow-blue `#003770`. No marketing semantic palette; success/error live in product UI.
- Type: Sohne (proprietary) weight 300, `ss01`; Inter 300 is the suggested substitute. Scale: 56/1.03/-1.4px, 48/1.15/-0.96px, 32/1.1/-0.64px, 26/-0.26px, 22, 20, 18, body 16 and 15, tabular 14 with `tnum` and -0.42px, button 16/14 at 400, caption 13/-0.39px, micro 11, micro-cap 10/+0.1px. Display never above 300. Money cells always `tnum`.
- Spacing: 8px base; 2/4/8/12/16/24/32/64 tokens; section padding 64-96px marketing, 32-48px dashboard; card padding 32px (24px for dashboard mockups). Container about 1200px.
- Radii: 4 / 6 (inputs) / 8 / 12 (cards) / 16 (mockup chrome) / pill 9999 (all buttons and tags).
- Shadows: L1 `rgba(0,55,112,0.08) 0 1px 3px`; L2 `rgba(0,55,112,0.08) 0 8px 24px, rgba(0,55,112,0.04) 0 2px 6px`; L3 is the gradient mesh. Shadows tinted blue.
- Components: primary pill indigo 8x16 padding, one filled button per band; secondary = white with 1px indigo border; inputs 1px `#a8c3de`, focus border turns indigo; cards 1px hairline, 12px radius, 32px padding; featured pricing card inverted navy; soft tag pills 4x8.
- Breakpoints: 1440 wide, 1024-1440 desktop (pricing 4-up), 768-1023 (2-up), under 768 (1-up, display 56 to 36). Touch 40-44px, inputs 40px minimum.
- Do/Don't worth stealing: one filled CTA per band; tinted not black shadows; tabular figures on money; do not use brand colour as body text. Reject for Tysonpe: the gradient mesh (banned by Taste A7 and Tysonpe's own no-blur-blob rule).

#### Linear (https://getdesign.md/linear.app/design-md)
- Colors (dark-first, marketing is dark only): canvas `#010102`, surfaces `#0f1011 / #141516 / #18191a / #191a1b`, hairlines `#23252a / #34343a / #3e3e44`; ink `#f7f8f8`, muted `#d0d6e0`, subtle `#8a8f98`, tertiary `#62666d`; primary lavender-blue `#5e6ad2` (hover `#828fff`, focus `#5e69d1`); inverse canvas `#ffffff`; success `#27a644`. Single chromatic accent; used only on brand mark, primary CTA, focus ring, link emphasis.
- Type: custom sans with SF Pro Display fallback; weights 400-600 (never 700+); scale 80/-3.0px, 56/-1.8, 40/-1.0, 28/-0.6, 22/-0.4, 20/-0.2, body 18 and 16 (-0.05px), 14, caption 12, eyebrow 13/+0.4px, mono 13.
- Spacing: 4/8/12/16/24/32/48, section 96px. Radii: 4 chips, 6 tags, 8 buttons and inputs, 12 cards, 16 screenshot panels, 24 rare banners, pill for tabs and status.
- Elevation without shadow: five-step surface ladder plus 1px hairline; focus ring 2px at 50% opacity primary; faint top-edge highlight on lifted panels.
- Components: buttons 8x14 padding 8px radius (primary lavender, secondary charcoal with hairline, tertiary text, inverse white); selected pill tab = surface lift; cards 24px padding; changelog row with bottom hairline; inputs 8x12.
- Useful for Tysonpe: the dark mode surface ladder (Tysonpe dark bg `#100e0b`, build 4 steps of warm lift), "tone step instead of shadow", 8px button radius for dense app UI, hairline row dividers for tables, status pill pattern. Reject: dark-only rule (Tysonpe needs both modes); do not use `#000`.

#### Wise (https://getdesign.md/wise/design-md)
- Colors: lime `#9fe870` (on `#0e0f0c`; active `#cdffad`, neutral `#c5edab`, pale `#e2f6d5`), ink `#0e0f0c`, forest ink `#163300`, body `#454745`, mute `#868685`; canvas `#ffffff`, sage canvas-soft `#e8ebe6`; semantic: positive `#2ead4b` (deep `#054d28`), warning `#ffd11a` (deep `#b86700`, content `#4a3b1c`), negative `#d03238` (deep `#a72027`, darkest `#a7000d`, bg `#320707`); accents orange `#ffc091`, cyan `#38c8ff`. File warns: never repurpose brand green as success.
- Type: Wise Sans (proprietary) weight 900 for heroes at 64/96/126px; Inter 600 for sub-display; scale 47/400, 40/900, 32/600/-0.96px, 24/600/-0.48px, body 20/16/14 at 400 (24px line height at 16), caption 12, button 16/600. Substitutes named: Inter 900, Manrope 800/900, Geist 800.
- Spacing: 4px base, 2/4/8/12/16/24/32/48, band padding 48px, card padding 24px, container about 1200px. Radii: 8 pills, 12 inputs, 16 cards, 24 canonical card and button, pill/full.
- Elevation: surface contrast is the elevation (white card on sage canvas); inputs and tertiary buttons use 1px ink border. No shadows.
- Components: primary pill lime 12x24; secondary sage; tertiary white with 1px ink border; cards no border sitting on sage; dark promo card ink bg with lime text; **currency-converter card** (from/to amount inputs + selectors) as the signature interactive hero widget; positive/negative badges as pills.
- Useful for Tysonpe: the live converter-card pattern is the template for a Tysonpe fee/payout/GST calculator in the landing hero; semantic status palette with deep/pale variants; surface-contrast elevation on a tinted canvas (Tysonpe paper `#fbfaf7` with `#ffffff` cards is the same device); never use the brand colour as the success colour (applies to Tysonpe: indigo is brand, emerald is success).

#### Mastercard (https://getdesign.md/mastercard/design-md) (warm canvas reference)
- Colors: canvas cream `#F3F0EE` (never pure white), lifted cream `#FCFBFA`, white `#FFFFFF` (nav pill, modals, secondary buttons), soft bone `#F4F4F4`; ink `#141413` (warm near-black, primary CTA and footer), charcoal `#262627`, slate `#696969`, granite `#555555`, dust taupe `#D1CDC7` (whisper/disabled); signal orange `#CF4500` (consent/legal only), light orange `#F37338` (decorative arcs only), clay `#9A3A0A`; link blue `#3860BE`. Logo red/yellow are not UI colours. No gradients.
- Type: MarkForMC (proprietary), substitute Sofia Sans or Inter at 450/500/700. H1 64/500/line 64/-2%; H2 36/500/44; H3 24/500/28.8; eyebrow 14/700/+4% uppercase with a tiny accent dot; body 16/**450**/22.4; button 16/500/-3%; footer headers 12-14/700/+4% uppercase. Single family. Uppercase only at the 14px eyebrow scale.
- Spacing: 8px base, 8/16/24/32/48/64/96/128; section padding 96-128px desktop, 48-64px mobile; card padding 32-40px; max width 1200-1280px.
- Radii: 3-6, then 20 (buttons), 24, 40 (hero frames), 50% circles, 99-1000 pills; deliberately skips 8-12.
- Shadows: L1 `rgba(0,0,0,0.04) 0 4px 24px`; L2 `rgba(0,0,0,0.08) 0 24px 48px`; L3 `rgba(0,0,0,0.25) 0 70px 110px` (rare). Rule: all elevation 48px spread or more and 10% opacity or less; functional boundaries use lines not shadows.
- Components: ink pill button (cream text, 1.5px ink border, 20px radius, 6x24 padding); outlined secondary (white fill); floating nav pill 24px below viewport top; circular image portraits with a satellite CTA; footer ink with 4-col grid collapsing to accordion.
- Breakpoints: 767 / 768-1023 / 1024 / 1440. All touch targets above 44px, none below 40.
- Useful for Tysonpe: validates warm putty canvas + warm near-black ink + white lifted surfaces (the same three-tone rhythm as `#fbfaf7` / `#ffffff` / `#16130f`); soft atmospheric shadow recipe; the "eyebrow only at 14px" principle that is compatible with Tysonpe's micro-label rule. Reject: orbital arcs, circle masks, ghost watermark headlines (decorative, not honest data).

#### Mercury (bonus, https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/mercury/DESIGN.md)
- Colors: indigo primary `#5266eb` (the single saturated action), periwinkle `#9cb4e8`, canvas `#fbfcfd`, surface `#ffffff`, tint `#fbfbff`, lavender `#edecfb`, night `#171721`, night-raised `#1e1e2a`, ink `#28253b`, ink-secondary `#554e7b`, on-dark `#ededf3`, fog `#c3c3cc`, slate `#70707d`.
- Type: custom light variable weights 360 (body), 420 (UI), 480 (headings); display 52, stat 60, h1 42, h2 28, lead 24, body-lg 18, body 16, ui 16, ui-sm 14, eyebrow 14/500/+0.28px, legal 12. Tracking +0.42px on headings. Nothing bold.
- Spacing 8/12/16/20/24/32/40, section 80, 128. Radii 4/8/12/16/32/pill 40/full. Cards 12px radius with 32px padding and no shadow; elevation is tonal.
- Pattern: one solid indigo pill per view, every other action a translucent tinted capsule (`rgba(82,102,235,0.1)` on light). Do: separate cards by fill not border. Don't: status greens/oranges in chrome (belong to product mockups only).
- Useful for Tysonpe: the "one solid action, everything else tinted" button hierarchy applies directly to checkout and dashboard.

### 3.2 Cross-system pattern table (what the four converge on)

| Decision | Stripe | Linear | Wise | Mercury | Mastercard | Tysonpe today |
|---|---|---|---|---|---|---|
| Accent count | 1 indigo | 1 lavender | 1 lime | 1 indigo | ink as CTA | ink as CTA + emerald (money/success only); no indigo |
| Body text colour | navy ink | off-white | near-black | plum ink | warm black | `#16130f` |
| Button shape | pill 9999 | 8px | 24px pill-rect | pill / 32px | 20px | decide once |
| Card radius | 12 | 12 (16 shots) | 24 | 12 | 40 / pill | decide once |
| Elevation | tinted soft shadow | surface ladder + hairline | surface contrast | tonal | soft 48px shadow | hairline border + faint two-layer shadow |
| Base spacing | 8 | 4 | 4 | 8 | 8 | |
| Section gap | 64-96 | 96 | 48 | 80-128 | 96-128 | |
| Numbers | `tnum` | mono 13 for code | tabular (not specified) | stat 60px | | `tabular-nums` + JetBrains Mono for ledgers |
| Display weight | 300 | 600 | 900 | 480 | 500 | Bricolage |

---

## 4. Honest gaps

- Mercury is not in Awesome Claude Design (68). I used the sibling repo awesome-design-md and flagged it.
- The four DESIGN.md contents are LLM-written "inspired interpretations" (the Stripe file is literally titled "Stripi"); their numbers are not verified against production sites. I did not compare against live CSS.
- Taste Skill star count is 96.7k, not 76k (GitHub API on 2026-10-15). Search snippets said 46k, which is stale.
- I did not run Taste's `draw.mjs`, `lint.mjs` or `inspect.mjs`, so no Tysonpe page has been measured against them. Running them on the built pages (`node skills/taste-skill/scripts/inspect.mjs <url>`, needs Node 22+ and Chrome) is the obvious follow-up for public pages only.
- UI UX Pro Max has no LICENSE file in the installed folder that I could find, returned 0 landing rows for fintech/checkout/course, and 0 for "trust security" UX. Its checkout guidance is generic form advice, nothing payment-specific (no UPI/OTP/3DS patterns).
- Awesome Claude Design contains no Indian-fintech references (no Razorpay, PhonePe, Cred, Zerodha). Nothing here covers rupee grouping, UPI VPA input patterns, or GST invoice layout.
- I did not read Taste's `references/imagery.md`, `layout.md`, `research.md` in full or the 686KB `sites.json` library.

---

## 5. Apply to Tysonpe (10 lines)

1. Decide the rule conflict first (owner call): Taste v2 bans uppercase micro-labels, hairline outlines, resting shadows and pulsing dots; CLAUDE.md section 2 mandates them. Proposed split: Taste v2 strictly on landing/storefront/LMS-catalogue marketing sections; Tysonpe CLAUDE.md plus Taste v1 dashboard hardening on app screens.
2. Action colour is ink `#16130f` (17.7:1 on paper): one solid ink button per view/band (Stripe/Mercury "one filled CTA" rule, Mastercard's ink pill on cream), every other action a quiet secondary (white fill + hairline, or a 6-10% ink tint, Mercury-style). Emerald `#0f7b4d` stays money/success only and never becomes a CTA (Wise rule: brand/CTA colour is not the success colour). Emerald on paper is 5.1:1, white on emerald 5.3:1, both pass.
3. Elevation by tone step first (paper `#fbfaf7` canvas, white cards, per Wise/Mercury), tinted soft shadow only on floating things, using a warm tint such as `rgba(22,19,15,0.04) 0 6px 16px` (Mastercard's rule: 10% opacity or less, large blur).
4. Pick one button radius and one card radius and write them into tokens (suggest 10-12px cards, 8-10px or pill buttons; the 12px card and 8px control radius appear across Stripe/Linear/Mercury); avoid the "medium radius on everything" tell.
5. Numbers: `tabular-nums` (and JetBrains Mono in ledgers, per ui-rebuild CLAUDE.md, which Taste v2 bans outside code blocks, so ledger tables are the one documented exception) on every rupee amount and countdown, `Intl.NumberFormat('en-IN')` grouping, 4px-multiple spacing on an 8px rhythm, section gaps 80-128px marketing and 32-48px dashboard (all four systems converge here).
6. Dashboard charts: line for revenue/payout trend, sorted horizontal bar for top products and courses, bullet chart for goals, funnel with per-stage conversion percentages for checkout drop-off, waffle or progress bar for course completion; every chart shows its value as text and offers a table fallback; series differ by dash style as well as colour.
7. Checkout: label above input, `autocomplete` and `inputmode="numeric"` on OTP/amount/pincode, validate on blur, `role="alert"` on errors with a recovery action, loading then success state on submit, 44px targets with 8px gaps, no "Oops!", no exclamation marks in success copy.
8. Landing hero: build one live thing from true numbers (a Wise-style converter card: price in, GST and Tysonpe fee out, payout date), with a no-JS fallback; use the real UI fragment (marked `data-ui` if Taste's inspector is used) rather than a fake dashboard; claims limited to what the fee table and settlement logic actually do.
9. Copy and proof lint: ban the Taste word list (seamless, unlock, all-in-one, elevate...), "Get started" and "Learn more" button labels, three-everything lists and invented logos/ratings/user counts; any sample testimonial or number is labelled sample and listed for replacement; headlines at most two lines at 390px (about 32 characters hero).
10. Motion and gates: keep CLAUDE.md timings (150ms buttons, 220ms overlays, `active:scale-[0.98]`), animate transform/opacity only, no `transition: all`, honour `prefers-reduced-motion`, ban infinite decorative loops except the live-status dot; run Taste `inspect.mjs` on public pages and ui-ux-pro-max's pre-delivery checklist (375/768/1024/1440, focus visible, 4.5:1) on every page before sign-off.
