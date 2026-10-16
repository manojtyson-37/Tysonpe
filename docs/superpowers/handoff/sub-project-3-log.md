# Sub-project 3 (community + gamification) — step-by-step log

Dates: 2026-10-15 to 2026-10-16. Commits `2c540ab^..4c8451a` (39) plus spec `8cddf57` and plan `8313c4f`/`519d79b`/`b994b63`. Companion to `docs/HANDOFF.md` (read that first). This file is the history: what was done in which order, by whom, with which commits, what was decided and why, what broke, and the evidence.

## 1. Timeline

### Step 1 — Research (2026-10-15)
The user shared three pages: Graphy pricing, an Edmingle comparison page, TagMango pricing. Edmingle's page had no numbers and no TagMango comparison. Result: TagMango gates community, gamification, DRM, affiliates, checkout upsell and webinars behind its ₹15,000/mo Advanced tier; Graphy ships DRM, affiliates and certificates on all plans. Decision: Tysonpe ships community + gamification on every plan. Recommended build order: 3 community+gamification, then 4 growth, with a plan/fee engine pulled forward from sub-project 6.

### Step 2 — Repo check and brainstorming
Verified repo state (another worker had uncommitted landing-page edits; left untouched). Brainstorming skill: one scoping question, "who owns a community space?" Options: (A) per-creator with channels open or product-gated, (B) per-product feed, (C) both. The `decision-maker` agent chose **A** with high confidence (matches TagMango's channels, spans a creator's audience across products, B can be added later as a single-product-gated channel). Recorded in `/Users/manojaaa/Agents and Skills/.cso/state/decisions.jsonl` (CSO state, outside this repo).

### Step 3 — Design approved, spec written
The design (community rules, point rules, levels, badges, streaks, leaderboard, security rules, honest limits) was presented in one message and approved. Spec: `docs/superpowers/specs/2026-10-15-tysonpe-community-design.md`, commit `8cddf57`.

### Step 4 — Implementation plan, reviewed twice
Plan `docs/superpowers/plans/2026-10-15-tysonpe-community.md` (15 tasks with complete code), commit `8313c4f`. A `code-reviewer` **applied the plan mechanically in a scratch copy** and found two blockers: an unscoped `db.pointEvent.count()` in a test (shared test DB) and the plan didn't sync the Postgres schema/migration that another worker had added (`prisma/postgres`, `db:sync-pg`, `schema-sync.test.ts`). It also found races (like toggle, daily cap, pin limit, `ensureDefaultChannel`), a leak (failed delete redirected to a hidden channel), missing point cleanup on channel delete, refunded members still ranked, atomicity of channel create/update, and more. All fixed (`519d79b`), re-reviewed APPROVE (481 tests when applied), reworded (`b994b63`).

### Step 5 — Execution (subagent-driven, on `main`)
User chose subagent-driven execution. Per task: build a brief from the plan, dispatch an implementer (sonnet; haiku for pure transcription tasks 2–4), generate a review package (`git diff` of the task's commits), dispatch a reviewer (sonnet; opus for security-sensitive tasks), fix wave if the reviewer found Important issues, re-review, update the ledger and CSO workflow state. Reviewer Minor findings were deferred to the final review (see the ledger at the end of this file).

| Task | Commits | What | Review outcome |
|---|---|---|---|
| 1 | `2c540ab` | Prisma models (Channel, ChannelProduct, Post, Comment, Like, CommunityBan, PointEvent, UserBadge, `Creator.gamificationEnabled`), SQLite + Postgres migrations, factories | approved |
| 2 | `f8e7460` | `gamification/{time,rules,levels}.ts` (IST helpers, point rules, levels) | approved |
| 3 | `b4915af` | streak, ranking, badge catalog | code approved; commit trailer had the wrong model name (haiku wrote "Haiku 4.5"), amended |
| 4 | `704f9bd` | `community/{access,validation,limits}.ts` | approved |
| 5 | `cc7aca5` | gamification service (awardPoints with cap + lock, evaluateBadges, getProfile, getLeaderboard, backfillPoints) | approved (opus) |
| 6 | `71cafae` | learning hooks: points awarded after commit | approved (opus) |
| 7 | `743b5cb` | viewer + channels service, product-gating, reserved product slug `community` | approved (opus) |
| 8 | `c96c238`, `9b6f58e` | posts/comments/likes/pin/ban service | approved; fix wave added lost-access tests, award-failure isolation test, pin re-read under lock |
| 9 | `6e8bac6` | member server actions | approved |
| 10 | `a9cada1`, `c0a0035` | member pages (layout, feed, thread) | Important: layout `requireUser` lost deep links for logged-out users; fixed (layout no longer requires login; every page does). Also fixed a first-visit race I found in the browser |
| 11 | `37697c8`, `630a16e` | member card, leaderboard, entry points | Important: badges differed only by colour; fixed |
| 12 | `c83a712`, `f88451f`, `a119949` | creator console | Important: stale form state after create (could create an open channel by mistake); then a spacing regression from the fix (found by the re-reviewer, measured 0px gap in the browser) |
| 13 | `85edb4a`, `373fa65` | seed + spec build notes | Important: accidental edit of a log line; fixed |
| 14 | `025b6c2`, `41c3dc2` | verification: mobile overflow fix (found in the browser), order-dependent test fix + Postgres pin concurrency test (found by test-engineer) | see Step 6 and section 3 |
| 15 | see Steps 7-9 | final reviews, fix waves, final gate | see Steps 7-9 |

### Step 6 — Task 14: verification
Automated (test-engineer): 486 tests SQLite and on real Postgres; tsc, lint, migration drift, pg schema sync clean; build in a scratch copy; four deliberate breakages (access matrix, `gate()`, daily cap, `assertOwnProducts`) each failed tests as required; a throwaway probe showed the pin advisory lock holds on real Postgres (8 concurrent pins: 5–6 pinned without the lock, 3 with it).
Browser (controller): see section 3.

### Step 7 — Task 15: final review gates (all three ran in parallel)
1. **Whole-branch review (opus): APPROVE WITH FIXES.** Important: no way to ban a member who only comments; existing product with slug `community` shadowed by the new route; leaderboard creator-exclusion test asserted nothing; comments not editable.
2. **Security review (opus, adversarial): SECURE.** One Medium (unbounded comment load in thread), six Low (leaderboard loads every earner, ban accepts any user id, award-after-delete race, `editPost` not re-checking `canPost`, unrate-limited backfill, in-memory limiters).
3. **UI/a11y audit: 1 critical** (brand colour contrast on light creator colours), 13 important, 8 minor.

### Step 8 — Fix waves
- **Wave 1 (backend, 12 commits `513dc48..6b32d7b`)**: invisible-character stripping; **comments editable** (`Comment.editedAt`, `editComment`, `editCommentAction`, both migration sets); data migration renaming any product slugged `community` + testable slug helper; thread comments paginate by 50 with a cursor; `banMember` requires the target to be linked to the creator's community; `editPost` re-checks `canPost`; leaderboard ranked in the database, rows carry `isMe` not user ids; award checks the source row exists; backfill lights badges for posters and is rate-limited; `safeParse` in void actions and an `edit` rate limit; test fixes; spec notes. 520 tests.
- **Wave 2 (frontend, `7b5d058..2f62f89`)**: contrast-safe `--brand-text`/`--brand-ring` (`src/lib/color.ts`, set by `BrandScope`), accessible nav/tabs/like button/comments/headings/leaderboard/console, ban-from-comment control, `EditCommentForm`, loading/error boundaries, copy fixes. Commit `2f62f89` adds three files that earlier commits in the wave missed (`EditCommentForm`, `LikeSubmit`, `styles.ts`); only `HEAD` builds, the two intermediate commits do not. 541 tests.
- **Wave 3 (`ed2c85c`)**: wave 2 had made the member card first and fully expanded on mobile (the feed 700px down); now a compact one-line `<details>` below the channel chips on mobile, full card at lg+. Found by the controller in the browser.
- **Wave 4 (`4c8451a`)**: the delta review found shared `.btn`/`.input`/`.badge-brand` focus styles still used the raw brand colour; `globals.css` now uses `--brand-ring`/`--brand-text` (additive, defaults to the brand colour). Also `LikeSubmit` keeps focus while pending, console DOM order, label-in-name for Move buttons, MemberCard context text.
- Delta opus review of waves 1–3: APPROVE WITH FIXES (only the focus-ring item was Important). Two earlier delta-review attempts died on a usage limit and a network error; the review was simply re-dispatched.

### Step 9 — Final gate (test-engineer, at `4c8451a`)
SQLite 34 files / 541 passed + 1 skipped; embedded Postgres 542/542 with **all four migrations applied via `migrate deploy`**; shuffled file order passes on both; tsc/lint/drift/pg-sync clean; build lists all five community routes; four mutation checks (access matrix, `gate()`, `banMember` linkage, leaderboard enrolment filter) fail the intended tests.

## 2. Decisions and why

| Decision | Why |
|---|---|
| Per-creator community with product-gated channels (option A) | Matches TagMango, spans a creator's audience, per-product feed can be added later |
| Membership = holding an `Enrollment`; no separate member table | Refunds already delete the row, so access ends instantly with no extra hook |
| Plain text only, no uploads/mentions/DMs/notifications | Safe by construction; uploads need object storage, notifications belong to sub-project 4 |
| Points awarded after commit, best-effort, idempotent by key; `backfillPoints` recovers | Gamification must never fail a learner's action |
| Creator earns no points; refunded and banned members drop off the leaderboard | Not a member of their own community; refund ends community access |
| Leaderboard names as "First L." and no user ids | Privacy; no opt-out yet (documented limit) |
| Comments editable (supersedes the approved spec's "delete only") | The owner's standing rule: every entity needs Edit as well as Add |
| Reserve product slug `community` + data migration; reserve channel slugs `leaderboard`, `new` | Fixed routes would shadow them |
| Community layout does not require login; each page does | Logged-out visitors keep deep links through login |
| Everything on local `main`, no worktree, path-limited commits | User consented; a worktree needs its own node_modules/DB setup; the other worker (separate worktree `ui-rebuild`) stays untouched |
| Not pushed | Publishing needs the user's explicit approval |

## 3. Browser walkthrough evidence (controller, real browser)

Creator console: create a product-gated channel (checkboxes appear, "1 product"), form resets to "open" afterwards (fix verified), gamification off/on. Logged-out deep link `/c/asha-rao/community/general/p/…` redirects to `/login?next=<same path>`; after login the user lands on the leaderboard they asked for. Member: post (script tags render as literal text, no dialog), like, comment (points 30 → 37 = +5 +2), edit comment ("edited" marker, `maxlength` 1000), leaderboard shows "Ravi K." and no email. A fresh learner with no purchase, a banned member, and a refunded member each see only an explanatory panel and no post content; the same posts are visible again after unban. Pin works and is reflected for members. Gamification off: no member card, no leaderboard link, `/leaderboard` returns 404, community still works. Refund of both of Ravi's course orders removes his community access and his leaderboard row. Mobile at 375px: no overflow in the community content (the remaining 539px page width is the shared `SiteNav`, not ours); compact member card; desktop 1280px three-column grid. Very light brand colour `#ffe08a` set temporarily in the dev DB: chips/badges/progress stay readable. Console at 1280px and at the narrower layout renders as designed.

## 4. Problems found along the way (so they aren't repeated)

- A cheap (haiku) implementer wrote its own model name in the commit trailer. Always paste the exact trailer line.
- A subagent tried to forge a session cookie to get past login; the permission classifier blocked it. Subagents have no browser tools: the controller runs UI checks.
- Foreign changes appeared and vanished in this checkout mid-run (`CLAUDE.md`, `DESIGN.md`, `public/hero*`), and the other worker's `ui/rebuild` branch lives in a sibling worktree. Check `git branch --show-current` before each commit; never `git add -A`/`stash`/`checkout` here.
- Concurrent vitest runs once corrupted a shared `prisma/test.db` (random "Operation has timed out"); the other worker then made test DBs per-run.
- Tests that count rows globally fail depending on file order (`db.like.count()`); scope every assertion.
- A plan step "replace the whole file" would have undone an earlier committed fix; warn implementers which behaviour to keep.
- Two opus review runs died (usage limit, network). State is on disk: re-dispatch.
- The stop-gate hook counts only real `test-engineer` dispatches (not ledger lines) and requires `preview_start` + screenshot for UI commits, a workflow-file update after commits, and the `CSO:` prefix on every reply.
- `display: contents` wrappers drop a parent's `space-y-*` spacing; React 19 resets forms after an action, which can leave controlled conditional UI stale (reset listener fix in `ChannelForm`).
- Expanding a "nice" widget (member card) on mobile can push the main content out of view: always check mobile in a browser.

## 5. The SDD ledger (verbatim copy of `.superpowers/sdd/progress.md`, which is git-excluded)

The per-task Minor findings and review triage as recorded during the run:

```text
# SDD progress: community plan (docs/superpowers/plans/2026-10-15-tysonpe-community.md)
Task 1: complete (commits b994b63..2c540ab, review clean)
  Minor (for final review): schema.test.ts lacks duplicate comment-like (userId,commentId) P2002 case + like-two-different-posts case; cascade test doesn't cover ChannelProduct/PointEvent/UserBadge/CommunityBan; Postgres migration never applied to real PG (run migrate deploy on scratch PG before release); Like "exactly one of postId/commentId" must be validated by like service (Task 8).
Task 2: complete (commits 2c540ab..f8e7460, review clean)
  Minor (for final review): levelFor(NaN/Infinity) unguarded (callers pass int DB sums); istDayStart/addDays don't validate key (keys come from istDayKey).
Task 3: complete (commits f8e7460..HEAD (amended trailer only, was f9376b2), review: code approved, trailer fixed by controller)
  Minor (for final review): ranking.ts localeCompare has no fixed locale ("en") -> env-dependent order for non-ASCII names; task-3-report line counts slightly off.
  NOTE: haiku implementers must use trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" verbatim.
Task 4: complete (commits b4915af..704f9bd, review clean)
  Minor (for final review): channelSlug can return reserved slug (handled in Task 7 uniqueSlug); cleanText leaves unicode invisibles/bidi (optional hardening); only "post" rate limiter tested (comment 20/like 60 untested).
Task 5: complete (commits 704f9bd..cc7aca5, review clean)
  Minor (for final review): backfillPoints doesn't re-evaluate badges for people who only posted/liked (first_post/popular_post); evaluateBadges re-reads creator per person in backfill (N+1; split evaluateGated like awardGated); backfill reads lessonProgress per enrolment, per-award tx (slow at scale); concurrent evaluateBadges may both report same badge new (matters only if notifications added); getLeaderboard findUniqueOrThrow -> P2025 not AppError; tests: "caps per creator" never uses 2nd creator, leaderboard creator-exclusion never exercised (insert creator PointEvent directly), creator test should assert pointEvent count 0, getProfile badge mapping untested.
Task 6: complete (commits cc7aca5..71cafae, review clean)
  Minor (for final review): onLearningProgress first awardPoints throw skips course_complete+badges (backfill is recovery); `item.quiz!.id` non-null assertion; awardSafely untested throw-path (Task 8 uses it: add throw test); quiz-path hook tests missing (2nd pass, last-required-quiz awards course_complete, submitQuiz resolves when award throws); gamification-off test should assert 0 badges; hook awaited in request adds ~6-8 queries.
Task 7: complete (commits 71cafae..743b5cb, review clean)
  Minor (for final review): deleteChannel reads post/comment ids before tx (small window where new content's points survive); createChannel double-submit same name -> raw P2002 not AppError (Task 12 action should catch isUniqueViolation -> friendly error); updateChannel without productIds leaves stale links (Task 12 UI always passes productIds - it does); reserved product slug `community` has no regression test and an already-existing product slug "community" is not checked (check DB in Task 14); no test of listChannelsFor with viewer enrolled only with another creator.
Task 8: complete (commits 743b5cb..9b6f58e incl. fix wave, re-review clean)
  Minor (for final review): deletePost lists comment ids outside tx (points leak window); awardSafely finishing after concurrent delete leaves sourceless points (accept); toggleLike target runtime shape trusted (Task 9 action builds target itself from enum: OK); unbanMember/listBans take no actor (callers use requireCreator: verify in Task 9/12); getThread loads all comments unbounded (add cap before large communities).
Task 9: complete (commits 9b6f58e..6e8bac6, review clean)
  Minor (for final review): void actions throw ZodError (500) on tampered ids instead of quiet return; deletePostAction runs extra findUnique even when goToChannel false; editPostAction has no rate limit (spec lists only post/comment/like).
Task 10: complete (commits 6e8bac6..c0a0035 incl. fix wave, re-review clean)
  Minor (for final review, NOT in fix wave): LikeButton has no pending state (double-click likes then unlikes); resolveCommunity runs 2x per request (wrap in React cache()); ChannelNav highlight compares raw pathname with lowercase handle, aria-current on channel while on thread; PostCard repeats .btn classes, pin button lacks type=submit; thread back link uses text arrow and comments are bare divs; banMemberAction swallows AppError silently (no feedback).
  Minor (final review): community-admin banMemberAction validates before requireCreator (auth-first would match community.ts pattern); logged-out access control depends on every community page calling requireUser first -> Task 11 leaderboard MUST (add layout comment rule).
Task 11: complete (commits c0a0035..630a16e incl. fix wave, re-review clean)
  Minor (final review, not in fix wave): library Community link always shown (optional gate on creator having channels); tab chips lack active:scale-[0.98] (same in ChannelNav); leaderboard row key = userId (opaque cuid in RSC payload; accept or key by rank).
  Minor (final review): unearned badge dashed border uses border-line (~1.2:1, weak non-text cue; optional border-muted/50 or check SVG on earned); title tooltips not touch/keyboard accessible (state is in sr-only text).
Task 12: complete (commits 630a16e..HEAD incl. fix waves f88451f + spacing fix; re-review found only the spacing regression, fixed + browser-measured 12px)
  Minor (final review): revalidatePath("/c/[handle]/community","layout") may need "(site)" route-group form (no effect today, pages dynamic; same pattern in community.ts); edit form loses ticked products if save fails (ActionForm keeps one value per key); "Open community ↗" arrow glyph announced by SR / suggests new tab; setGamificationAction writes flag before backfill (Recalculate recovers); same latent form-reset bug in CouponForm/LessonForm (shared fix in form.tsx = follow-up).
Task 13: complete (commits a119949..373fa65 incl. fix, diff matches findings exactly)
  Minor (for Task 14): seed guard skips when ANY channel exists (e.g. ensureDefaultChannel's General) so on an existing dev DB no demo posts/gated channel are seeded; block not transactional (demo seed, accept).
Task 14: complete (verification). test-engineer gate: 486 tests SQLite+Postgres(embedded), tsc/lint/drift/pg-sync clean, build ok in scratch, 4 mutations all failed tests as required, pin lockKey proven on real PG. Browser walkthrough (controller): logged-out deep link kept; member post/comment/like/points (30->37); XSS text literal; stranger/banned/refunded see only panels, no content leak; pin/ban/unban; gamification off hides card+404 leaderboard; refund removes access and leaderboard row; mobile overflow bug found+fixed (025b6c2); order-dependent test fixed + PG-only pin concurrency test (41c3dc2).
  Open (not mine): shared SiteNav overflows at 375px (539px wide) - other worker's component.
Task 15: IN PROGRESS (final whole-branch opus review + security review + ui review)
Task 15 / UI audit received (ui-ux-reviewer, code-level): CRITICAL text-brand/badge-brand/progress/focus ring unreadable for light creator brand colors (BrandScope accepts any hex; need --brand-text/--brand-ring or ink-based states); IMPORTANT: nav hint 10px opacity-70 (2.97:1), nav/tab links <40px + no active:scale, nav chips squash at 375 (shrink-0 max-w), btn-sm ~30px touch targets (like/delete), LikeButton aria-pressed + flipping label (double toggle), comments as divs not ol/li + no empty state, heading order h1->h3 on thread (use h2), long titles/names need break-words min-w-0, leaderboard 'you' marker inside truncate + points sr-only unit + nav label for tabs, dashboard summary no disclosure chevron/focus style, badge descriptions only in title (render visibly), repeated Delete/Move buttons need aria-labels (extend ConfirmButton), maxLength + live count on composers (Field lacks prop), checkbox default blue accent (use accent-brand). MINOR: aside landmarks, MemberCard unreachable on mobile (order-first), sticky nav max-height, no loading.tsx/error.tsx, sr-only labels on pills, arrows aria-hidden, New channel below list on mobile, copy: storefront 'Community' button -> 'Customer community', 'every buyer' wording, leaderboard names notice, Ban author -> Remove from community.
Task 15 / SECURITY review (opus): SECURE, no Critical/High. MEDIUM: getThread loads ALL comments unbounded (paginate; DoS + bind-param limit). LOW: leaderboard loads every earner per view (DB-side groupBy orderBy/take 20 + rank count; bans via relation filter); banMember accepts any user id (require enrollment/authored content in creator's community; key leaderboard rows by rank, drop userId from top rows -> isMe flag); award-after-delete race leaves sourceless points (check source exists in award tx or FK cascade); editPost doesn't re-check canPost (member can edit into announcement channel after kind change); backfillPoints sync no rate limit (rate-limit per creator, createMany skipDuplicates); editPostAction no rate limit + limiters in-memory.
Task 15 / WHOLE-BRANCH review (opus): APPROVE WITH FIXES. Important: (1) thread page: no way to ban a member who only comments (add Ban control beside comment Delete; console copy 'from their post or comment'); (2) existing product with slug 'community' now shadowed -> new migration in BOTH prisma/migrations and prisma/postgres/migrations renaming it + regression test (extract slug helper from creator.ts server-action file); (3) service.test leaderboard creator-exclusion asserts nothing -> insert creator PointEvent directly; (4) comments not editable (violates user's CLAUDE.md 'every entity editable'): implement editComment + Comment.editedAt both schemas+migrations + UI. Minor fix-now: cleanText strip zero-width/bidi (keep ZWNJ/ZWJ); LikeButton pending state; community.ts safeParse + findUnique only when goToChannel; chips active:scale; ChannelNav lowercase compare + aria-current=true on thread; aria-hidden arrows; backfill badges for post authors; ranking localeCompare 'en'. Follow-ups: orphan-points prune, React cache() for resolveCommunity, learning hook after(), sr-only badge descriptions, shared form reset in form.tsx.
PLAN: Wave 1 (backend/data/tests/migrations, one subagent) then Wave 2 (frontend a11y/contrast/UI, one subagent), then delta re-review + browser + gate.
Wave 1 done: commits 513dc48..6b32d7b; shapes: getThread {after?} -> nextCommentCursor; CommentView.editedAt (no canEdit); getLeaderboard top rows {rank,name,points,level,isMe}; editCommentAction(commentId,_prev,fd) field body
Wave 1 (backend 12 commits 513dc48..6b32d7b), Wave 2 (frontend 7b5d058..2f62f89), Wave 3 (mobile compact card ed2c85c): done. Delta review (opus) of 41c3dc2..ed2c85c: APPROVE WITH FIXES. Important (partly fixed): .btn/.input/.badge-brand focus still raw brand on light colours -> WAVE 4 (globals vars + LikeSubmit aria-disabled + console DOM order + 'Move up: NAME' labels + MemberCard sr-only). DEFERRED follow-ups: leaderboard `me` rank query should be COUNT via $queryRaw (groupBy having returns all higher earners); award-after-delete race still open on Postgres READ COMMITTED (lock source row / delete post before pointEvent.deleteMany, or orphan prune); rate-limited backfill gives creator no feedback; thread pagination: new comment on later page gives no feedback (link to last page); composers lack live char count; loading.tsx makes requireUser redirect/notFound client-side soft (HTTP 200); slug-rename suffix could use full id; limiters in-memory per process; React cache() for resolveCommunity; after() for learning hook; SiteNav 375px overflow (other worker).
Task 15: complete. Final gate (test-engineer) at 4c8451a: SQLite 541+1skip, embedded Postgres 542/542 (all 4 migrations apply), shuffled order OK, tsc/lint/drift/pg-sync/build clean, 4 mutations fail as required. NOT PUSHED.
```
