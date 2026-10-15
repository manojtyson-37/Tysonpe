# Tysonpe — Community + Gamification (Sub-project 3)

Builds on [core commerce](2026-10-15-tysonpe-core-commerce-design.md) and [content](2026-10-15-tysonpe-content-design.md). Gives each creator a community with gated channels, and rewards learning and participation with points, levels, badges, streaks and a leaderboard.

## Reference bar

TagMango gates community channels, gamification and achievements behind its Advanced tier (₹15,000/mo + GST) and Ultimate tier (₹30,000/mo). Graphy has no comparable built-in community. Tysonpe ships both on every plan; no plan gating in this sub-project (plan billing is sub-project 6, and `Creator.planKey` is not consulted here).

## Scope

### Community

| Area | Behaviour |
|---|---|
| Channels | Creator-owned. Fields: name, slug (unique per creator), description, `kind` (`discussion` or `announcement`), `access` (`open` or `product_gated`), position. In an `announcement` channel only the creator can post; members can still comment and like. |
| Membership | A learner is a member of a creator's community while they hold at least one `Enrollment` for one of that creator's products. Refunds already delete the `Enrollment` row (`refundOrder`), so access ends automatically with no extra hook. The creator is always a member. |
| Access | `open`: any member. `product_gated`: members enrolled in at least one product linked to the channel. A gated channel with no linked products is visible to the creator only. |
| Posts | Optional title (max 120), body 1–2,000 characters, **plain text** (line breaks kept, nothing parsed as HTML or Markdown; URLs shown as text). Author edits or deletes their own post (edit sets `editedAt`). Only the author can edit a post. The creator can delete any post, pin or unpin one (max 3 pinned per channel), and ban a member. |
| Comments | One level under a post, body 1–1,000 characters. Author or creator can delete. |
| Likes | One per user per post or comment. Toggle. |
| Ban | `CommunityBan(creatorId, userId)`. A banned user has no access to any channel of that creator (no read, no write). The creator can unban. A creator cannot ban themselves. |
| Feed | Newest first, pinned posts on top, cursor pagination (20 per page). Comment and like counts are returned with each post. |
| Default channel | `general` (open, discussion) is created lazily the first time the creator opens the community dashboard. |

### Gamification

| Area | Behaviour |
|---|---|
| Points | Append-only ledger, scoped per creator community. See the rules table below. |
| Levels | Derived from a user's total points for that creator (never stored). |
| Badges | Fixed catalog in code, stored per user and creator when earned. |
| Streak | Consecutive IST days on which the learner completed a lesson or passed a quiz for that creator. The streak is still live if the last active day is today or yesterday. |
| Leaderboard | Per creator, tabs `This week` (IST week, Monday start) and `All time`, top 20, plus the viewer's own rank. Shows display name as "First L."; never email. |
| Creator toggle | `Creator.gamificationEnabled` (default true). Off: no new awards, no badges or leaderboard UI. Existing ledger rows are kept so turning it back on loses nothing. |

#### Point rules

| Kind | Points | Idempotency key (`refId`) | Daily cap (IST day, per user per creator) |
|---|---|---|---|
| `lesson_complete` | +10 | `itemId` | none (bounded by lesson count) |
| `quiz_pass` | +25 | `quizId` | none |
| `course_complete` | +100 | `productId` | none |
| `post_created` | +5 | `postId` | 3 awarded posts (15 pts) |
| `comment_created` | +2 | `commentId` | 10 awarded comments (20 pts) |
| `like_received` | +1 | `${likerId}:${targetId}` | 20 awarded likes (20 pts) |

- Unique on `(userId, creatorId, kind, refId)`: replaying an event never double-awards.
- Re-liking after an unlike awards nothing (same `refId`). Liking your own post or comment awards nothing.
- Deleting a post or comment removes the `PointEvent` rows whose `sourceId` is that post or comment (and, for a post, its comments). Likes received on deleted content go with them.
- Refunds do **not** revoke points (see limits).
- Caps are enforced by counting that day's rows of the kind inside the award transaction; over the cap the event is simply not recorded.

#### Levels

Thresholds are fixed in code: L1 0, L2 100, L3 250, L4 500, L5 1,000, L6 2,000, L7 3,500, L8 5,500, L9 8,000, L10 12,000. Above L10, +5,000 per level. The UI shows level, points into the level and points to the next.

#### Badge catalog

| Key | Earned when |
|---|---|
| `first_lesson` | First lesson completed for the creator |
| `course_complete` | Any course of the creator completed (100% of required lessons) |
| `first_post` | First post created in the community |
| `streak_7` | A streak of 7 consecutive IST days is reached |
| `popular_post` | One of the user's posts reaches 10 likes from other users |

Unique on `(userId, creatorId, badgeKey)`.

## Data model (additions)

```
Creator          + gamificationEnabled Boolean @default(true)

Channel          id, creatorId, name, slug, description, kind (discussion|announcement),
                 access (open|product_gated), position, createdAt          @@unique(creatorId, slug)
ChannelProduct   channelId, productId                                      @@id(channelId, productId)
Post             id, channelId, authorId, title, body, pinned, editedAt?, createdAt
                                                                           @@index(channelId, pinned, createdAt)
Comment          id, postId, authorId, body, createdAt
Like             id, userId, postId?, commentId?, createdAt                @@unique(userId, postId), @@unique(userId, commentId)
CommunityBan     id, creatorId, userId, createdAt                          @@unique(creatorId, userId)

PointEvent       id, userId, creatorId, kind, points, refId, sourceId?, createdAt
                                                                           @@unique(userId, creatorId, kind, refId)
                                                                           @@index(creatorId, createdAt), @@index(sourceId)
UserBadge        id, userId, creatorId, badgeKey, earnedAt                 @@unique(userId, creatorId, badgeKey)
```

- Exactly one of `Like.postId` / `Like.commentId` is set (validated in code; SQLite has no check constraint through Prisma).
- All new columns have defaults or are nullable, so existing data stays valid. Cascades: deleting a channel deletes its posts, comments and likes; deleting a product removes its `ChannelProduct` rows only.
- Statuses and kinds are strings validated in code, per the existing schema convention (portable to Postgres).
- Migration is created the same way as sub-projects 1 and 2 (SQLite manual migration; regenerate for Postgres later).

## Architecture

- **Pure, unit-tested, no DB:** `lib/community/access.ts` (`canAccessChannel`, `canPost`, `canModerate`), `lib/community/validation.ts` (limits, sanitising), `lib/gamification/rules.ts` (point values, caps), `levels.ts`, `badges.ts`, `streak.ts`, `leaderboard.ts` (ranking and week bounds).
- **DB-backed:** `lib/community/service.ts` (channels, posts, comments, likes, moderation) and `lib/gamification/service.ts` (`awardPoints`, `evaluateBadges`, `getProfile`, `getLeaderboard`, `backfillPoints`).
- **Access is resolved in one place.** `service.ts` loads the viewer's enrolled product ids and ban state, then calls `canAccessChannel`. Every read and write goes through it. Server actions stay thin; creator mutations scope by `creatorId` like sub-projects 1 and 2.
- **Hooks into learning:** `markComplete`, `submitQuiz` (on pass) and the 100% check call `awardPoints` **after** their own transaction commits, best-effort, errors logged. Learning never fails because of gamification. A missed award is recoverable: `backfillPoints(creatorId)` replays `LessonProgress` and passed `QuizAttempt` rows through the same idempotent insert (mirrors `backfillCertificates`).
- **Routes:** `/c/[handle]/community` (channel list + default feed), `/c/[handle]/community/[channel]` (feed, composer, post thread), `/c/[handle]/community/leaderboard`, and a dashboard section for channels, product gating, pinned posts, bans and the gamification toggle. Member sees their own level, streak and badges on the community page.
- **Rate limits** (existing `createLimiter`, keyed by user id): posts 5 per minute, comments 20 per minute, likes 60 per minute. Per-process, same caveat as the login limiter.

## Security rules

- Access is enforced **server-side on every read and write**. A gated channel's posts, comments, like counts and even post counts never reach a client without access; a no-access request gets `not_found`, never `forbidden`, so channel existence is not leaked.
- Author and moderator checks run on the server for edit, delete, pin and ban; client buttons are only hints.
- Content is plain text, escaped by React; no `dangerouslySetInnerHTML`, no link auto-embedding. Length limits are enforced on the server.
- Author identity shown as display name only. Email is never selected into any community query or serialised.
- Banned users are re-checked on each request, not cached in the session.
- Channel `slug` and creator ownership are validated server-side; a creator cannot link a product they don't own to a channel.

## Testing

- **Pure:** the full access matrix (open vs gated, enrolled/not, creator, banned, announcement posting rule, no linked products); point caps and boundaries; each level threshold and the above-L10 rule; streak across IST midnight, gaps, and live-today-or-yesterday; weekly bounds on a Monday 00:00 IST edge; badge triggers.
- **Service on real SQLite:** gated channel secrecy for a non-enrolled user; access removed after a refund; ban blocks read and write; idempotent awards under repeated calls; daily cap; post deletion removes its points; like toggle and no re-award; self-like no points; leaderboard ranks and excludes email; learning actions still succeed when awarding throws; `backfillPoints` is idempotent.
- **Browser walkthrough:** creator creates a gated channel and links a product; an enrolled learner posts, comments and likes; a non-enrolled user is refused; points, level, badges and leaderboard update; a refund removes access.
- Standard gate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Honest limits (not in this sub-project)

- **No real-time**: pages update after an action or refresh; no websockets.
- **No uploads** (images or files in posts) until object storage exists.
- **No notifications** (email, WhatsApp, in-app); that is sub-project 4. A community with no notifications relies on members returning.
- **No DMs, @mentions, reposts or reports queue.** Moderation is creator-only: delete, pin, ban.
- **No challenges, habit tracker or custom badges** (planned 3b).
- **Points are not revoked on refund.** Access is; points stay as a record of past activity.
- **Leaderboard shows real names** ("First L."). There is no opt-out yet.
- Per-process rate limits (same as login) and SQLite-serialised cap counting: both need revisiting for multi-instance Postgres.

## Success criteria

A creator opens the community, creates a product-gated channel, and links a product. A buyer of that product posts, comments and likes; a user who never bought it cannot see the channel, its posts or its counts. Completing lessons, passing a quiz and posting award points exactly once each, levels and badges update, the streak counts correctly across IST days, and the leaderboard ranks members without exposing emails. Banning or refunding removes access immediately. Everything passes tests, typecheck, lint, build and a real-browser walkthrough.
