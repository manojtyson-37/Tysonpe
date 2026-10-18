# UI rebuild: step log (branch `ui/rebuild`)

Written 2026-10-18 at `ui/rebuild` `82ac431`. Every commit hash below was read from `git log c098ca7..HEAD`; the per-commit history is the source of truth (`git log --oneline c098ca7..HEAD`, 108 commits including one merge of `main` at `43881b1`). Local scratch with briefs, reports and the full ledger is `.superpowers/sdd/` (git-excluded, per clone: `progress.md`, `task-NN-brief.md`, `task-NN-report.md`).

Start with `docs/HANDOFF.md` section 0 for the current state and the open merge decision.

## Method

Subagent-driven development, one writer per worktree:

1. The controller wrote a brief to a file (exact values, files in scope, files not to touch, acceptance) and dispatched one engineer.
2. The controller ran the gates itself: `npm test`, `npm run typecheck`, `npm run lint`.
3. The controller verified in a real browser (the subagents had none): flows, focus, mobile widths, console, and database state read read-only with `sqlite3 -readonly`.
4. A read-only `code-reviewer` and an isolated `test-engineer` (a `git archive` copy, single-edit mutants, restore checked by sha256) reviewed each task; their findings went to one fix wave on the same engineer.
5. The controller pushed `ui/rebuild` (`gh auth switch -u manojtyson-37` first) and updated the ledger and workflow state.

Nearly every task needed at least one fix wave. The catches that mattered came from the controller's browser pass or a reviewer recomputing, not from the implementer's own green tests.

## Tasks and the commits that built them

| Task | What | Main commit(s) |
|---|---|---|
| (pass 1) | Anti-slop redesign, paper tokens, honest copy | `fa17a43` |
| (docs) | Research A-E, spec, 32-task plan | `7226103` |
| 1 | Tokens, base layer, `DESIGN.md` | `8495fa5` |
| 2 | Icon set and formatters | `e49b584` |
| 3 | Button, Badge, Surface | `052bbcf` |
| 4 | Money, Stat, MetricRow, Progress, Avatar | `3f6e318` |
| 5 | Table kit | `0964f66` |
| 6 | Form controls | `2ce2260` |
| 7 | Tabs, SegmentedControl | `7319d47` |
| 8 | Dialog, Toast, Callout, ConfirmDialog | `9293e69` |
| 9 | EmptyState, PageHeader, Disclosure, Skeleton, Chart | `3b6833c` |
| 10 | Public shell, mobile nav, footer | `104a5f9` |
| 11 | Console shell | `e79d4ba` |
| 12 | Route boundaries, AuthShell | `8bcf165` |
| 13 | Checkout review page | `a8bc11a` |
| 14 | Pay page, Razorpay launcher | `b28988b` |
| 15 | Success page, invoice | `0808941` |
| 16 | Storefront | `4cfe881` |
| 17 | Product detail | `b6fb329` |
| 18 | Library, course player, quiz player | `fbbf9da` |
| 19 | Certificate | `81f79af` |
| 20 | Console overview | `66d168d` |
| 21 | Products list, new, editor, lessons | `0eb84d9`, `81edad0` |
| 22 | Quiz editor, orders | `14b55fb` |
| 23 | Learners, payouts, coupons, settings | `b157a72`, `5867762` |
| 24 | Community (feed, thread, leaderboard) | `ec1c322`, `344bbfb`, `772c338` |
| 25 | Community admin | `7a99b62` |
| 26 | Landing page (live computed ledger) | `d8fddb9` |
| 27 | Home demo | `985b9be` |
| 28 | Gateway playground `/demo` | `db00c8b` |
| 29 | Auth forms | `5238b3a`, `9a87a4f` (after the WIP adopt commit `04eef13`) |
| 30 | Gateway replicas on isolated skins | `6003ce5`, `07d0dc7` |
| 31 | Housekeeping (A: metadata, favicon, scaffold svgs; B: gateway-icons cleanup) | `6e6ba44`, `7b3e416` |
| 32 | Audit and fix-up waves | `91ea347`, `ca877be`, `8328198`, `1e5e5d6`, `82ac431` (plus `67d70b3`, `ad626f8` and others as review follow-ups) |

## Things that went wrong, and what fixed them

- **SSR tests are blind to the browser.** A green suite hid: a server file reading a non-component export of a `"use client"` module (undefined in dev, a crash in production), hydration mismatches from multi-text SVG `<title>`, 7.5px axis labels, focus rings clipped by `overflow` ancestors or painted over by an active-tab pill, a `w-full` dropped from a disclosure button, and a modal showing "Payment successful" for a declined payment. Guards added: `src/test/client-imports.ts` (follows `export *`, wrappers, namespaces), `src/test/rsc-safe.ts`, `src/test/style-scan.ts`, hook-stub interaction harnesses, and a rule that the controller drives every outcome in a browser.
- **A server action that ends in `redirect()` remounts the whole page segment.** Removing a `key` did not keep focus on the gateway chooser; a `sessionStorage` flag bridges the remount (`GatewayChooser`).
- **`ok: true` from `settleDemoAction` means "no exception", not success.** A declined payment returned `ok: true` with a failure-page redirect; the modal now decides its screen from the server's answer (`settledView`).
- **Layout checked only with seed data.** A `whitespace-nowrap` money figure defeats `overflow-wrap`, so lakh and crore totals overflowed the stat strip at narrow widths. The strip now answers to its own width (container queries, one column below 672px) and was re-verified with `−₹1,29,99,999.99` injected at 375, 768, 1024 and 1440px.
- **A global `scroll-padding-top` stacks on `scroll-margin`.** The per-element `scroll-mt-*` classes were removed and a source scan guards against their return.
- **Stale dev CSS.** Turbopack served a chunk without newly appended rules until the dev server was restarted; restart (and `rm -rf .next` after a production build) before blaming the code.
- **Untrusted foreign edits.** Another tool left uncommitted edits to `SignupForm.tsx`, `form.tsx` and `gateway-icons.tsx`. They were backed up as a patch, audited (CHANGES REQUESTED, six blockers), kept at the owner's request as the WIP commit `04eef13`, and rewritten in Task 29.
- **Agent hand-offs.** Rate-limit and network (`ENOTFOUND`) failures killed background agents mid-task; their uncommitted work stayed in the worktree and the same agent was resumed with `SendMessage`. Agent IDs were swapped twice after parallel launches; the ledger now records `id -> job` in the same turn as the launch.

## Verification evidence (2026-10-18, `82ac431` unless noted)

- `npm test`: 149 files, 3237 passed, 1 skipped; `npm run typecheck` and `npm run lint` clean.
- `npm run build` succeeds; `next start -p 3300` smoke: `/`, `/login`, `/signup`, `/c/asha-rao`, a product page, community, a certificate and `/icon.svg` return 200; `/demo` and `/dashboard` return 307 when logged out; an unknown path returns 404.
- All-routes responsive walk (a scripted measure of overflow, h1 and main counts, unnamed controls, missing alt, text under 12px): public and learner routes at 375 and 1440px, console routes at 375, 768, 1024, 1280 and 1440px. After the fixes above there is no horizontal overflow and one h1 per page. The thread page was not valid in this check (local DB lacks two migrations).
- Auth forms: a failed creator + Easebuzz signup keeps the role, gateway, email and handle in the DOM, the name error has `role="alert"`, `aria-invalid` and `aria-describedby`, focus moves to the first invalid field, and the password input has no `value` attribute.
- Gateway replicas: Escape and backdrop are ignored while a payment processes, focus returns to the trigger, decline shows the declined screen, and a success enrols the learner.
- Production (`https://tysonpe.vercel.app`) is still the old build: it is deployed manually from `main` and `ui/rebuild` has no Git link.

## Not done

Final whole-branch review on the most capable model; `/design-review`; Postgres run of this branch; a screen-reader and real-device pass; the merge with `origin/main` (see `docs/HANDOFF.md` section 0); production deploy (the user's `vercel --prod`).
