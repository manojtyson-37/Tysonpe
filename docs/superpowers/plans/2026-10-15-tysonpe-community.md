# Tysonpe Community + Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each creator a community with open or product-gated channels, and reward learning and participation with points, levels, badges, streaks and a leaderboard.

**Architecture:** Pure, unit-tested logic (`lib/community/{access,validation}.ts`, `lib/gamification/{time,rules,levels,streak,ranking,badges}.ts`) sits under two DB-backed services (`lib/community/service.ts`, `lib/gamification/service.ts`). Access to a channel is decided in one place (`canAccessChannel`) from the viewer's `Enrollment` rows (refunds already delete those rows). Learning actions award points **after** their own transaction commits, best-effort. Server actions stay thin; UI follows the existing `ActionForm` / `requireCreator` patterns.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind v4, Prisma 7 + SQLite (`better-sqlite3` adapter), Zod 4, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-15-tysonpe-community-design.md` — read it first.

## Global Constraints

- Money-free sub-project: no payment code is touched. Payments stay test mode (`PAYMENTS_MODE=mock`).
- **Shared repo.** Another worker has uncommitted edits (landing page, `package.json`, `package-lock.json`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{HomeInteractiveDemo,Logo,SiteNav,AuroraHero}.tsx`, `public/hero.mp4`, `vitest.config.mts`, `src/test/global-setup.ts`, `src/test/db-path.ts`). **Never `git add -A` / `git add .` / `git commit -a`.** Always `git add <exact paths>` and `git commit -m "..." -- <exact paths>`. If a path you must edit shows as already modified in `git status` before you touched it (e.g. `SiteNav.tsx`), stop and tell the user.
- **Test DB is private per run** (`prisma/test-<pid>.db`, set up in `src/test/{db-path,global-setup}.ts` + `vitest.config.mts`, which are another worker's *uncommitted* edits: do not commit or modify them). Concurrent vitest runs are safe. Baseline is **357 passing**.
- Plain-text posts only: no `dangerouslySetInnerHTML`, no Markdown/HTML parsing, no link embedding.
- Never select or serialise `User.email` in any community or gamification query.
- Access is enforced server-side on every read and write; a user without access gets `AppError("not_found")`, never `forbidden`.
- IST (UTC+05:30, no DST) defines every "day" and "week" (Monday start).
- Statuses/kinds are strings validated in code (existing schema convention).
- Point values: lesson_complete 10, quiz_pass 25, course_complete 100, post_created 5 (3/day), comment_created 2 (10/day), like_received 1 (20/day).
- Levels: L1 0, L2 100, L3 250, L4 500, L5 1,000, L6 2,000, L7 3,500, L8 5,500, L9 8,000, L10 12,000; above L10 +5,000 per level.
- Limits: post body 1–2,000 chars, title ≤120; comment 1–1,000; channel name ≤60, description ≤200; max 3 pinned per channel; feed page size 20; leaderboard top 20.
- Rate limits (per user id, `createLimiter`): posts 5/min, comments 20/min, likes 60/min.
- Design: follow `CLAUDE.md` in the repo (no emojis as UI icons, no purple blur blobs, no uniform `p-6` everywhere, 150ms interactions, `active:scale-[0.98]` on buttons, respect `prefers-reduced-motion`). Reuse existing classes: `card`, `badge`, `badge-good|muted|brand|warn|bad`, `btn btn-primary|secondary|danger|ghost btn-sm`, `input`, `label`, `err`, `hint`.
- **Copy honesty** (`CLAUDE.md`): no invented customers, member counts, testimonials or figures in UI copy; state what exists. The palette is light-only (no dark-mode variants). Single font family.
- Standard gate before the final commit: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, migration drift check, real-browser walkthrough.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## File Structure

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` (modify) | New models + `Creator.gamificationEnabled` + back-relations |
| `prisma/migrations/20261015120000_community/migration.sql` (create) | Hand-written SQLite migration for the above |
| `src/lib/gamification/time.ts` | IST day key, day bounds, week start (pure) |
| `src/lib/gamification/rules.ts` | Point rules and caps (pure) |
| `src/lib/gamification/levels.ts` | `levelFor(points)` (pure) |
| `src/lib/gamification/streak.ts` | `currentStreak`, `longestStreak` (pure) |
| `src/lib/gamification/ranking.ts` | `rankRows`, `shortName` (pure) |
| `src/lib/gamification/badges.ts` | Badge catalog + `badgesToAward` (pure) |
| `src/lib/gamification/service.ts` | `awardPoints`, `evaluateBadges`, `getProfile`, `getLeaderboard`, `backfillPoints` |
| `src/lib/gamification/hooks.ts` | `awardSafely`, `onLearningProgress` (best-effort wrappers) |
| `src/lib/community/access.ts` | `canAccessChannel`, `canPost`, `canModerate` (pure) |
| `src/lib/community/validation.ts` | Zod schemas, `cleanText`, `channelSlug` (pure) |
| `src/lib/community/limits.ts` | Rate limiters + `checkRate` |
| `src/lib/community/viewer.ts` | `loadViewer` (DB) |
| `src/lib/community/channels.ts` | Channel CRUD, listing, gating (DB) |
| `src/lib/community/posts.ts` | Feed, posts, comments, likes, pin, bans (DB) |
| `src/app/actions/community.ts` | Member server actions |
| `src/app/actions/community-admin.ts` | Creator server actions |
| `src/components/community/*.tsx` | `PostComposer`, `ChannelForm`, `LikeButton`, `MemberCard`, `ChannelNav` |
| `src/app/(site)/c/[handle]/community/...` | Member pages (channel list, feed, thread, leaderboard) |
| `src/app/dashboard/(console)/community/page.tsx` | Creator console |
| `src/components/DashNav.tsx` (modify) | Add "Community" link |
| `src/lib/learning/service.ts` (modify) | Call `onLearningProgress` after commit |
| `src/lib/handles.ts`, `src/app/actions/creator.ts` (modify) | Reserve product slug `community` |
| `prisma/seed.ts` (modify) | Demo channels and posts |
| `src/test/factories.ts` (modify) | `makeChannel`, `makePost` helpers |

---

## Task 1: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261015120000_community/migration.sql`
- Modify: `src/test/factories.ts`
- Test: `src/lib/community/schema.test.ts`

**Interfaces:**
- Produces: Prisma models `Channel`, `ChannelProduct`, `Post`, `Comment`, `Like`, `CommunityBan`, `PointEvent`, `UserBadge`; field `Creator.gamificationEnabled`; factories `makeChannel(creatorId, over?)`, `makePost(channelId, authorId, over?)`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/community/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeChannel, makeCreatorWithProduct, makePost, makeUser } from "@/test/factories";

describe("community schema", () => {
  it("creator defaults to gamification on", async () => {
    const { creator } = await makeCreatorWithProduct();
    expect(creator.gamificationEnabled).toBe(true);
  });

  it("channel slug is unique per creator but reusable across creators", async () => {
    const a = await makeCreatorWithProduct();
    const b = await makeCreatorWithProduct();
    await makeChannel(a.creator.id, { slug: "general" });
    await expect(makeChannel(a.creator.id, { slug: "general" })).rejects.toMatchObject({ code: "P2002" });
    await expect(makeChannel(b.creator.id, { slug: "general" })).resolves.toBeTruthy();
  });

  it("one like per user per post, enforced by the database", async () => {
    const { creator } = await makeCreatorWithProduct();
    const ch = await makeChannel(creator.id);
    const author = await makeUser();
    const liker = await makeUser();
    const post = await makePost(ch.id, author.id);
    await db.like.create({ data: { userId: liker.id, postId: post.id } });
    await expect(db.like.create({ data: { userId: liker.id, postId: post.id } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("point events are unique per user, creator, kind and ref", async () => {
    const { creator } = await makeCreatorWithProduct();
    const u = await makeUser();
    const data = { userId: u.id, creatorId: creator.id, kind: "lesson_complete", points: 10, refId: "item1" };
    await db.pointEvent.create({ data });
    await expect(db.pointEvent.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("deleting a channel cascades to posts, comments and likes", async () => {
    const { creator } = await makeCreatorWithProduct();
    const ch = await makeChannel(creator.id);
    const u = await makeUser();
    const post = await makePost(ch.id, u.id);
    const c = await db.comment.create({ data: { postId: post.id, authorId: u.id, body: "hi" } });
    await db.like.create({ data: { userId: u.id, commentId: c.id } });
    await db.channel.delete({ where: { id: ch.id } });
    expect(await db.post.count({ where: { id: post.id } })).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(0);
    expect(await db.like.count({ where: { commentId: c.id } })).toBe(0);
  });
});
```

- [ ] **Step 2: Add the factories**

Append to `src/test/factories.ts`:

```ts
export async function makeChannel(creatorId: string, over: Record<string, unknown> = {}) {
  const n = uid();
  return db.channel.create({
    data: { creatorId, name: `Channel ${n}`, slug: `ch-${n}`, kind: "discussion", access: "open", ...over },
  });
}

export async function makePost(channelId: string, authorId: string, over: Record<string, unknown> = {}) {
  return db.post.create({ data: { channelId, authorId, body: "Hello community", ...over } });
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/community/schema.test.ts`
Expected: FAIL — TypeScript/runtime error `db.channel` is undefined (models don't exist yet).

- [ ] **Step 4: Edit the Prisma schema**

In `prisma/schema.prisma`:

a) In `model User`, after `certificates Certificate[]` add:

```prisma
  posts        Post[]
  comments     Comment[]
  likes        Like[]
  bans         CommunityBan[]
  pointEvents  PointEvent[]
  badges       UserBadge[]
```

b) In `model Creator`, after `planKey ...` line add `gamificationEnabled Boolean @default(true)`, and after `ledger   LedgerEntry[]` add:

```prisma
  channels    Channel[]
  bans        CommunityBan[]
  pointEvents PointEvent[]
  badges      UserBadge[]
```

c) In `model Product`, after `enrollments Enrollment[]` add `channelLinks ChannelProduct[]`.

d) Append at the end of the file:

```prisma
model Channel {
  id          String   @id @default(cuid())
  creatorId   String
  name        String
  slug        String
  description String   @default("")
  kind        String   @default("discussion") // discussion | announcement
  access      String   @default("open") // open | product_gated
  position    Int      @default(0)
  createdAt   DateTime @default(now())

  creator  Creator          @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  products ChannelProduct[]
  posts    Post[]

  @@unique([creatorId, slug])
  @@index([creatorId, position])
}

model ChannelProduct {
  channelId String
  productId String

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([channelId, productId])
  @@index([productId])
}

model Post {
  id        String    @id @default(cuid())
  channelId String
  authorId  String
  title     String    @default("")
  body      String
  pinned    Boolean   @default(false)
  editedAt  DateTime?
  createdAt DateTime  @default(now())

  channel  Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  author   User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments Comment[]
  likes    Like[]

  @@index([channelId, pinned, createdAt])
  @@index([authorId])
}

model Comment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())

  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  likes  Like[]

  @@index([postId, createdAt])
}

/// Exactly one of postId / commentId is set (validated in code).
model Like {
  id        String   @id @default(cuid())
  userId    String
  postId    String?
  commentId String?
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@unique([userId, commentId])
  @@index([postId])
  @@index([commentId])
}

model CommunityBan {
  id        String   @id @default(cuid())
  creatorId String
  userId    String
  createdAt DateTime @default(now())

  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([creatorId, userId])
}

/// Append-only points ledger. Unique key makes every award idempotent.
model PointEvent {
  id        String   @id @default(cuid())
  userId    String
  creatorId String
  kind      String // lesson_complete | quiz_pass | course_complete | post_created | comment_created | like_received
  points    Int
  refId     String
  sourceId  String? // the post/comment this came from, so deleting it removes its points
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([userId, creatorId, kind, refId])
  @@index([creatorId, createdAt])
  @@index([creatorId, userId])
  @@index([sourceId])
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  creatorId String
  badgeKey  String
  earnedAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([userId, creatorId, badgeKey])
}
```

- [ ] **Step 5: Write the migration SQL**

Create `prisma/migrations/20261015120000_community/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "gamificationEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'discussion',
    "access" TEXT NOT NULL DEFAULT 'open',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelProduct" (
    "channelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    PRIMARY KEY ("channelId", "productId"),
    CONSTRAINT "ChannelProduct_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChannelProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityBan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PointEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "refId" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PointEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Channel_creatorId_position_idx" ON "Channel"("creatorId", "position");
CREATE UNIQUE INDEX "Channel_creatorId_slug_key" ON "Channel"("creatorId", "slug");
CREATE INDEX "ChannelProduct_productId_idx" ON "ChannelProduct"("productId");
CREATE INDEX "Post_channelId_pinned_createdAt_idx" ON "Post"("channelId", "pinned", "createdAt");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Like_postId_idx" ON "Like"("postId");
CREATE INDEX "Like_commentId_idx" ON "Like"("commentId");
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");
CREATE UNIQUE INDEX "Like_userId_commentId_key" ON "Like"("userId", "commentId");
CREATE UNIQUE INDEX "CommunityBan_creatorId_userId_key" ON "CommunityBan"("creatorId", "userId");
CREATE INDEX "PointEvent_creatorId_createdAt_idx" ON "PointEvent"("creatorId", "createdAt");
CREATE INDEX "PointEvent_creatorId_userId_idx" ON "PointEvent"("creatorId", "userId");
CREATE INDEX "PointEvent_sourceId_idx" ON "PointEvent"("sourceId");
CREATE UNIQUE INDEX "PointEvent_userId_creatorId_kind_refId_key" ON "PointEvent"("userId", "creatorId", "kind", "refId");
CREATE UNIQUE INDEX "UserBadge_userId_creatorId_badgeKey_key" ON "UserBadge"("userId", "creatorId", "badgeKey");
```

- [ ] **Step 6: Regenerate the client and check migration drift**

Run:

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe" && npx prisma generate && npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

Expected: `No difference detected.` and exit code 0. If it prints a diff, the hand-written SQL does not match the schema: fix the SQL (index names must match Prisma's `Model_fields_idx` / `_key` naming) until clean. `src/generated/prisma` is gitignored; do not add it.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/community/schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261015120000_community/migration.sql src/test/factories.ts src/lib/community/schema.test.ts
git commit -m "feat(community): schema, migration and factories

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- prisma/schema.prisma prisma/migrations/20261015120000_community/migration.sql src/test/factories.ts src/lib/community/schema.test.ts
```

---

## Task 2: Gamification pure core (time, rules, levels)

**Files:**
- Create: `src/lib/gamification/time.ts`, `src/lib/gamification/rules.ts`, `src/lib/gamification/levels.ts`
- Test: `src/lib/gamification/core.test.ts`

**Interfaces:**
- Produces:
  - `time.ts`: `istDayKey(d: Date): string` (`"YYYY-MM-DD"`), `istDayStart(key: string): Date` (UTC instant of that IST midnight), `addDays(key: string, n: number): string`, `istWeekStart(now: Date): Date`.
  - `rules.ts`: `type PointKind`, `POINT_RULES: Record<PointKind, { points: number; dailyCap?: number }>`, `isPointKind(s: string): s is PointKind`.
  - `levels.ts`: `levelFor(points: number): { level: number; floor: number; next: number; into: number; span: number }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/gamification/core.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { levelFor } from "./levels";
import { POINT_RULES, isPointKind } from "./rules";
import { addDays, istDayKey, istDayStart, istWeekStart } from "./time";

describe("IST time helpers", () => {
  it("rolls the day over at 18:30 UTC (IST midnight)", () => {
    expect(istDayKey(new Date("2026-10-15T18:29:59Z"))).toBe("2026-10-15");
    expect(istDayKey(new Date("2026-10-15T18:30:00Z"))).toBe("2026-10-16");
  });
  it("istDayStart is the UTC instant of IST midnight", () => {
    expect(istDayStart("2026-10-16").toISOString()).toBe("2026-10-15T18:30:00.000Z");
  });
  it("addDays crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("week starts Monday 00:00 IST", () => {
    // Thursday 2026-10-15 12:00 IST -> Monday 2026-10-12 00:00 IST
    expect(istWeekStart(new Date("2026-10-15T06:30:00Z")).toISOString()).toBe("2026-10-11T18:30:00.000Z");
    // Monday 00:00:00 IST exactly stays that Monday
    expect(istWeekStart(new Date("2026-10-11T18:30:00Z")).toISOString()).toBe("2026-10-11T18:30:00.000Z");
    // Sunday 23:59 IST belongs to the week that began the previous Monday
    expect(istWeekStart(new Date("2026-10-11T18:29:59Z")).toISOString()).toBe("2026-10-04T18:30:00.000Z");
  });
});

describe("point rules", () => {
  it("has the spec's values", () => {
    expect(POINT_RULES.lesson_complete).toEqual({ points: 10 });
    expect(POINT_RULES.quiz_pass).toEqual({ points: 25 });
    expect(POINT_RULES.course_complete).toEqual({ points: 100 });
    expect(POINT_RULES.post_created).toEqual({ points: 5, dailyCap: 3 });
    expect(POINT_RULES.comment_created).toEqual({ points: 2, dailyCap: 10 });
    expect(POINT_RULES.like_received).toEqual({ points: 1, dailyCap: 20 });
  });
  it("isPointKind guards unknown strings", () => {
    expect(isPointKind("quiz_pass")).toBe(true);
    expect(isPointKind("hack")).toBe(false);
  });
});

describe("levelFor", () => {
  it("maps each threshold boundary", () => {
    const cases: Array<[number, number]> = [
      [0, 1], [99, 1], [100, 2], [249, 2], [250, 3], [499, 3], [500, 4], [999, 4], [1000, 5],
      [1999, 5], [2000, 6], [3499, 6], [3500, 7], [5499, 7], [5500, 8], [7999, 8], [8000, 9],
      [11999, 9], [12000, 10], [16999, 10], [17000, 11], [22000, 12],
    ];
    for (const [pts, lvl] of cases) expect(levelFor(pts).level, `${pts} pts`).toBe(lvl);
  });
  it("reports progress inside the level", () => {
    expect(levelFor(160)).toEqual({ level: 2, floor: 100, next: 250, into: 60, span: 150 });
    expect(levelFor(12000)).toEqual({ level: 10, floor: 12000, next: 17000, into: 0, span: 5000 });
  });
  it("clamps negatives to level 1", () => {
    expect(levelFor(-5).level).toBe(1);
    expect(levelFor(-5).into).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gamification/core.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

Create `src/lib/gamification/time.ts`:

```ts
/** IST is UTC+05:30 with no DST, so "days" and "weeks" are fixed offsets from UTC. */
const IST_OFFSET_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of the IST calendar day containing `d`. */
export function istDayKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant of 00:00 IST on that calendar day. */
export function istDayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - IST_OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Monday 00:00 IST of the week containing `now`. */
export function istWeekStart(now: Date): Date {
  const key = istDayKey(now);
  const dow = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return istDayStart(addDays(key, -dow));
}
```

Create `src/lib/gamification/rules.ts`:

```ts
export type PointKind =
  | "lesson_complete"
  | "quiz_pass"
  | "course_complete"
  | "post_created"
  | "comment_created"
  | "like_received";

/** `dailyCap` = max number of awarded events of this kind per user per creator per IST day. */
export const POINT_RULES: Record<PointKind, { points: number; dailyCap?: number }> = {
  lesson_complete: { points: 10 },
  quiz_pass: { points: 25 },
  course_complete: { points: 100 },
  post_created: { points: 5, dailyCap: 3 },
  comment_created: { points: 2, dailyCap: 10 },
  like_received: { points: 1, dailyCap: 20 },
};

export const isPointKind = (s: string): s is PointKind => Object.hasOwn(POINT_RULES, s);
```

Create `src/lib/gamification/levels.ts`:

```ts
const FLOORS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000]; // L1..L10
const STEP_ABOVE_10 = 5000;

const floorOf = (level: number) => (level <= 10 ? FLOORS[level - 1] : FLOORS[9] + STEP_ABOVE_10 * (level - 10));

export function levelFor(rawPoints: number) {
  const points = Math.max(0, Math.floor(rawPoints));
  let level: number;
  if (points >= FLOORS[9]) level = 10 + Math.floor((points - FLOORS[9]) / STEP_ABOVE_10);
  else level = FLOORS.filter((f) => f <= points).length;
  const floor = floorOf(level);
  const next = floorOf(level + 1);
  return { level, floor, next, into: points - floor, span: next - floor };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/gamification/core.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/time.ts src/lib/gamification/rules.ts src/lib/gamification/levels.ts src/lib/gamification/core.test.ts
git commit -m "feat(gamification): IST time helpers, point rules, levels

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/gamification/time.ts src/lib/gamification/rules.ts src/lib/gamification/levels.ts src/lib/gamification/core.test.ts
```

---

## Task 3: Gamification pure core (streak, ranking, badges)

**Files:**
- Create: `src/lib/gamification/streak.ts`, `src/lib/gamification/ranking.ts`, `src/lib/gamification/badges.ts`
- Test: `src/lib/gamification/core2.test.ts`

**Interfaces:**
- Consumes: `addDays` from `./time`.
- Produces:
  - `streak.ts`: `currentStreak(dayKeys: Iterable<string>, todayKey: string): number`, `longestStreak(dayKeys: Iterable<string>): number`.
  - `ranking.ts`: `type RankRow = { userId: string; name: string; points: number }`, `rankRows(rows: RankRow[]): Array<RankRow & { rank: number }>` (competition ranking 1,2,2,4; points desc, then name asc, then userId), `shortName(name: string): string`.
  - `badges.ts`: `BADGES: ReadonlyArray<{ key: BadgeKey; label: string; description: string }>`, `type BadgeKey`, `type BadgeStats`, `badgesToAward(stats: BadgeStats, earned: ReadonlySet<string>): BadgeKey[]`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/gamification/core2.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BADGES, badgesToAward } from "./badges";
import { rankRows, shortName } from "./ranking";
import { currentStreak, longestStreak } from "./streak";

describe("streaks", () => {
  it("is 0 with no activity", () => {
    expect(currentStreak([], "2026-10-15")).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-10-13", "2026-10-14", "2026-10-15"], "2026-10-15")).toBe(3);
  });
  it("is still live if the last active day was yesterday", () => {
    expect(currentStreak(["2026-10-13", "2026-10-14"], "2026-10-15")).toBe(2);
  });
  it("is dead (0) if the last active day was two or more days ago", () => {
    expect(currentStreak(["2026-10-12", "2026-10-13"], "2026-10-15")).toBe(0);
  });
  it("a gap resets the run; duplicates are ignored", () => {
    expect(currentStreak(["2026-10-10", "2026-10-14", "2026-10-15", "2026-10-15"], "2026-10-15")).toBe(2);
  });
  it("longestStreak finds the best run anywhere, across a month end", () => {
    const days = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-05", "2026-10-06"];
    expect(longestStreak(days)).toBe(4);
  });
});

describe("ranking", () => {
  it("sorts by points desc then name, with shared ranks for ties (1,2,2,4)", () => {
    const rows = [
      { userId: "d", name: "Dev", points: 10 },
      { userId: "a", name: "Asha", points: 50 },
      { userId: "c", name: "Chitra", points: 30 },
      { userId: "b", name: "Bala", points: 30 },
    ];
    expect(rankRows(rows).map((r) => [r.userId, r.rank])).toEqual([["a", 1], ["b", 2], ["c", 2], ["d", 4]]);
  });
  it("shortName hides the surname", () => {
    expect(shortName("Meera Learner")).toBe("Meera L.");
    expect(shortName("  Ravi  Kumar  Singh ")).toBe("Ravi S.");
    expect(shortName("Cher")).toBe("Cher");
    expect(shortName("")).toBe("Member");
  });
});

describe("badges", () => {
  const none = { lessonsCompleted: 0, coursesCompleted: 0, postsCreated: 0, longestStreak: 0, maxLikesOnOnePost: 0 };
  it("awards nothing at zero", () => {
    expect(badgesToAward(none, new Set())).toEqual([]);
  });
  it("awards each badge at its threshold", () => {
    expect(badgesToAward({ ...none, lessonsCompleted: 1 }, new Set())).toEqual(["first_lesson"]);
    expect(badgesToAward({ ...none, coursesCompleted: 1 }, new Set())).toEqual(["course_complete"]);
    expect(badgesToAward({ ...none, postsCreated: 1 }, new Set())).toEqual(["first_post"]);
    expect(badgesToAward({ ...none, longestStreak: 6 }, new Set())).toEqual([]);
    expect(badgesToAward({ ...none, longestStreak: 7 }, new Set())).toEqual(["streak_7"]);
    expect(badgesToAward({ ...none, maxLikesOnOnePost: 9 }, new Set())).toEqual([]);
    expect(badgesToAward({ ...none, maxLikesOnOnePost: 10 }, new Set())).toEqual(["popular_post"]);
  });
  it("skips badges already earned", () => {
    expect(badgesToAward({ ...none, lessonsCompleted: 5, postsCreated: 2 }, new Set(["first_lesson"]))).toEqual(["first_post"]);
  });
  it("catalog has a label and description for every key", () => {
    expect(BADGES.map((b) => b.key).sort()).toEqual(["course_complete", "first_lesson", "first_post", "popular_post", "streak_7"]);
    for (const b of BADGES) expect(b.label && b.description).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gamification/core2.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

Create `src/lib/gamification/streak.ts`:

```ts
import { addDays } from "./time";

const sortedUnique = (days: Iterable<string>) => [...new Set(days)].sort();

/** Run of consecutive IST days ending at the latest active day; live only if that day is today or yesterday. */
export function currentStreak(dayKeys: Iterable<string>, todayKey: string): number {
  const days = sortedUnique(dayKeys);
  if (days.length === 0) return 0;
  const last = days[days.length - 1];
  if (last !== todayKey && last !== addDays(todayKey, -1)) return 0;
  let run = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i - 1] === addDays(days[i], -1)) run++;
    else break;
  }
  return run;
}

export function longestStreak(dayKeys: Iterable<string>): number {
  const days = sortedUnique(dayKeys);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i - 1] === addDays(days[i], -1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
```

Create `src/lib/gamification/ranking.ts`:

```ts
export type RankRow = { userId: string; name: string; points: number };

/** Competition ranking: ties share a rank and the next rank skips (1, 2, 2, 4). */
export function rankRows(rows: RankRow[]): Array<RankRow & { rank: number }> {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
  );
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || sorted[i - 1].points !== r.points) rank = i + 1;
    return { ...r, rank };
  });
}

/** "Meera Learner" -> "Meera L." The leaderboard never shows a full surname or an email. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
```

Create `src/lib/gamification/badges.ts`:

```ts
export type BadgeKey = "first_lesson" | "course_complete" | "first_post" | "streak_7" | "popular_post";

export const BADGES: ReadonlyArray<{ key: BadgeKey; label: string; description: string }> = [
  { key: "first_lesson", label: "First lesson", description: "Completed your first lesson." },
  { key: "course_complete", label: "Course complete", description: "Finished every required lesson of a course." },
  { key: "first_post", label: "First post", description: "Started a conversation in the community." },
  { key: "streak_7", label: "7-day streak", description: "Learned on 7 days in a row." },
  { key: "popular_post", label: "Popular post", description: "One of your posts got 10 likes." },
];

export type BadgeStats = {
  lessonsCompleted: number;
  coursesCompleted: number;
  postsCreated: number;
  longestStreak: number;
  maxLikesOnOnePost: number;
};

export function badgesToAward(stats: BadgeStats, earned: ReadonlySet<string>): BadgeKey[] {
  const met: Record<BadgeKey, boolean> = {
    first_lesson: stats.lessonsCompleted >= 1,
    course_complete: stats.coursesCompleted >= 1,
    first_post: stats.postsCreated >= 1,
    streak_7: stats.longestStreak >= 7,
    popular_post: stats.maxLikesOnOnePost >= 10,
  };
  return BADGES.map((b) => b.key).filter((k) => met[k] && !earned.has(k));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/gamification/core2.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/streak.ts src/lib/gamification/ranking.ts src/lib/gamification/badges.ts src/lib/gamification/core2.test.ts
git commit -m "feat(gamification): streaks, ranking, badge catalog

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/gamification/streak.ts src/lib/gamification/ranking.ts src/lib/gamification/badges.ts src/lib/gamification/core2.test.ts
```

---

## Task 4: Community pure core (access, validation, limits)

**Files:**
- Create: `src/lib/community/access.ts`, `src/lib/community/validation.ts`, `src/lib/community/limits.ts`
- Test: `src/lib/community/pure.test.ts`

**Interfaces:**
- Produces:
  - `access.ts`: `type ChannelAccessInfo = { access: "open" | "product_gated"; kind: "discussion" | "announcement"; productIds: readonly string[] }`, `type Viewer = { isCreator: boolean; banned: boolean; enrolledProductIds: readonly string[] }`, `canAccessChannel(ch, v): boolean`, `canPost(ch, v): boolean`, `canComment(ch, v): boolean`, `canModerate(v): boolean`.
  - `validation.ts`: `cleanText(s: string): string`, `channelSchema` (zod; output `{ name, description, kind, access }`), `postSchema` (`{ title, body }`), `commentSchema` (`{ body }`), `channelSlug(name: string): string`, `RESERVED_CHANNEL_SLUGS: ReadonlySet<string>`, `LIMITS`.
  - `limits.ts`: `checkRate(kind: "post" | "comment" | "like", userId: string): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/community/pure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canAccessChannel, canComment, canModerate, canPost, type ChannelAccessInfo, type Viewer } from "./access";
import { checkRate } from "./limits";
import { LIMITS, channelSchema, channelSlug, cleanText, commentSchema, postSchema } from "./validation";

const open: ChannelAccessInfo = { access: "open", kind: "discussion", productIds: [] };
const gated: ChannelAccessInfo = { access: "product_gated", kind: "discussion", productIds: ["p1", "p2"] };
const announce: ChannelAccessInfo = { access: "open", kind: "announcement", productIds: [] };
const viewer = (o: Partial<Viewer> = {}): Viewer => ({ isCreator: false, banned: false, enrolledProductIds: [], ...o });

describe("canAccessChannel", () => {
  it("open: needs at least one enrolment with this creator", () => {
    expect(canAccessChannel(open, viewer())).toBe(false);
    expect(canAccessChannel(open, viewer({ enrolledProductIds: ["zzz"] }))).toBe(true);
  });
  it("gated: needs an enrolment in a linked product", () => {
    expect(canAccessChannel(gated, viewer({ enrolledProductIds: ["other"] }))).toBe(false);
    expect(canAccessChannel(gated, viewer({ enrolledProductIds: ["p2"] }))).toBe(true);
  });
  it("gated with no linked products is creator-only", () => {
    const empty: ChannelAccessInfo = { access: "product_gated", kind: "discussion", productIds: [] };
    expect(canAccessChannel(empty, viewer({ enrolledProductIds: ["p1"] }))).toBe(false);
    expect(canAccessChannel(empty, viewer({ isCreator: true }))).toBe(true);
  });
  it("the creator always has access, even if (somehow) flagged banned", () => {
    expect(canAccessChannel(gated, viewer({ isCreator: true, banned: true }))).toBe(true);
  });
  it("banned members have no access even when enrolled", () => {
    expect(canAccessChannel(open, viewer({ banned: true, enrolledProductIds: ["p1"] }))).toBe(false);
    expect(canAccessChannel(gated, viewer({ banned: true, enrolledProductIds: ["p1"] }))).toBe(false);
  });
});

describe("canPost / canComment / canModerate", () => {
  const member = viewer({ enrolledProductIds: ["p1"] });
  it("members post in discussion channels only", () => {
    expect(canPost(open, member)).toBe(true);
    expect(canPost(announce, member)).toBe(false);
  });
  it("the creator posts in announcement channels", () => {
    expect(canPost(announce, viewer({ isCreator: true }))).toBe(true);
  });
  it("members can still comment in announcement channels", () => {
    expect(canComment(announce, member)).toBe(true);
  });
  it("no access means no posting or commenting", () => {
    expect(canPost(open, viewer())).toBe(false);
    expect(canComment(open, viewer())).toBe(false);
  });
  it("only the creator moderates", () => {
    expect(canModerate(viewer({ isCreator: true }))).toBe(true);
    expect(canModerate(member)).toBe(false);
  });
});

describe("cleanText", () => {
  it("normalises newlines, strips control chars, collapses blank runs, trims", () => {
    expect(cleanText("  a\r\nb\u0000\u0007c\n\n\n\n d  ")).toBe("a\nbc\n\n d");
  });
  it("leaves HTML as inert text (React escapes it on render)", () => {
    expect(cleanText("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("schemas", () => {
  it("postSchema enforces body length and trims the title", () => {
    expect(postSchema.safeParse({ title: "", body: "" }).success).toBe(false);
    expect(postSchema.safeParse({ title: "", body: "x".repeat(LIMITS.postBody + 1) }).success).toBe(false);
    expect(postSchema.safeParse({ title: "x".repeat(LIMITS.postTitle + 1), body: "ok" }).success).toBe(false);
    expect(postSchema.parse({ title: "  Hi  ", body: "ok" })).toEqual({ title: "Hi", body: "ok" });
    expect(postSchema.parse({ body: "ok" })).toEqual({ title: "", body: "ok" });
  });
  it("commentSchema enforces 1–1000", () => {
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(commentSchema.safeParse({ body: "x".repeat(1001) }).success).toBe(false);
    expect(commentSchema.parse({ body: "nice" })).toEqual({ body: "nice" });
  });
  it("channelSchema validates kind and access enums", () => {
    expect(channelSchema.safeParse({ name: "Q&A", description: "", kind: "chat", access: "open" }).success).toBe(false);
    expect(channelSchema.safeParse({ name: "Q&A", description: "", kind: "discussion", access: "everyone" }).success).toBe(false);
    expect(channelSchema.parse({ name: " Q&A ", kind: "discussion", access: "open" })).toEqual({ name: "Q&A", description: "", kind: "discussion", access: "open" });
  });
  it("channelSlug slugifies and never returns an empty or reserved-by-itself value", () => {
    expect(channelSlug("Masterclass Q&A!")).toBe("masterclass-q-a");
    expect(channelSlug("!!!")).toBe("channel");
    expect(channelSlug("x".repeat(100)).length).toBeLessThanOrEqual(40);
  });
});

describe("checkRate", () => {
  it("allows 5 posts per minute per user, then blocks", () => {
    const u = `rate-user-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(checkRate("post", u)).toBe(true);
    expect(checkRate("post", u)).toBe(false);
    expect(checkRate("post", `${u}-other`)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/pure.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

Create `src/lib/community/access.ts`:

```ts
export type ChannelAccessInfo = {
  access: "open" | "product_gated";
  kind: "discussion" | "announcement";
  productIds: readonly string[];
};

export type Viewer = {
  /** The viewer owns the community. */
  isCreator: boolean;
  banned: boolean;
  /** Products of THIS creator the viewer holds an Enrollment for (refunds delete the row). */
  enrolledProductIds: readonly string[];
};

export function canAccessChannel(ch: ChannelAccessInfo, v: Viewer): boolean {
  if (v.isCreator) return true;
  if (v.banned) return false;
  if (ch.access === "open") return v.enrolledProductIds.length > 0;
  return ch.productIds.some((p) => v.enrolledProductIds.includes(p));
}

export function canPost(ch: ChannelAccessInfo, v: Viewer): boolean {
  if (!canAccessChannel(ch, v)) return false;
  return ch.kind === "discussion" || v.isCreator;
}

export const canComment = canAccessChannel;

export const canModerate = (v: Viewer): boolean => v.isCreator;
```

Create `src/lib/community/validation.ts`:

```ts
import { z } from "zod";

export const LIMITS = {
  postTitle: 120,
  postBody: 2000,
  commentBody: 1000,
  channelName: 60,
  channelDescription: 200,
  maxPinned: 3,
  pageSize: 20,
} as const;

/** Channel slugs that would collide with fixed routes under /c/[handle]/community/. */
export const RESERVED_CHANNEL_SLUGS: ReadonlySet<string> = new Set(["leaderboard", "new"]);

/** Plain text only: normalise newlines, drop control characters (keep \n), collapse blank-line runs, trim. */
export function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (min: number, max: number, what: string) =>
  z.string().transform(cleanText).pipe(z.string().min(min, `${what} can't be empty`).max(max, `${what} is too long (max ${max})`));

export const postSchema = z.object({
  title: z.string().optional().default("").transform(cleanText).pipe(z.string().max(LIMITS.postTitle, `Title is too long (max ${LIMITS.postTitle})`)),
  body: text(1, LIMITS.postBody, "Post"),
});

export const commentSchema = z.object({ body: text(1, LIMITS.commentBody, "Comment") });

export const channelSchema = z.object({
  name: text(1, LIMITS.channelName, "Name"),
  description: z.string().optional().default("").transform(cleanText).pipe(z.string().max(LIMITS.channelDescription, `Description is too long (max ${LIMITS.channelDescription})`)),
  kind: z.enum(["discussion", "announcement"]),
  access: z.enum(["open", "product_gated"]),
});

export const channelSlug = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "") || "channel";
```

Create `src/lib/community/limits.ts`:

```ts
import { createLimiter } from "@/lib/auth/rate-limit";

// Per-process (same caveat as the login limiter). Keyed by user id.
const limiters = {
  post: createLimiter({ max: 5, windowMs: 60_000 }),
  comment: createLimiter({ max: 20, windowMs: 60_000 }),
  like: createLimiter({ max: 60, windowMs: 60_000 }),
} as const;

/** True if the user may perform the action now (and counts this attempt). */
export function checkRate(kind: keyof typeof limiters, userId: string): boolean {
  return limiters[kind].hit(userId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/community/pure.test.ts`
Expected: PASS. If the `cleanText` expectation `"a\nbc\n\n d"` fails, trace it: input `"  a\r\nb\0\x07c\n\n\n\n d  "` → `"  a\nb" + "c" ...` after removing `\0` and `\x07`; four newlines collapse to two; the leading space of ` d` survives (only the ends are trimmed). Fix the implementation, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/access.ts src/lib/community/validation.ts src/lib/community/limits.ts src/lib/community/pure.test.ts
git commit -m "feat(community): access rules, validation, rate limits

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/community/access.ts src/lib/community/validation.ts src/lib/community/limits.ts src/lib/community/pure.test.ts
```

---

## Task 5: Gamification service (awards, badges, profile, leaderboard, backfill)

**Files:**
- Create: `src/lib/gamification/service.ts`
- Test: `src/lib/gamification/service.test.ts`

**Interfaces:**
- Consumes: `POINT_RULES`, `PointKind`, `istDayKey`, `istDayStart`, `istWeekStart`, `addDays`, `levelFor`, `currentStreak`, `longestStreak`, `rankRows`, `shortName`, `BADGES`, `badgesToAward`, `computeProgress` (`@/lib/learning/progress`), `isUniqueViolation`.
- Produces:
  - `awardPoints(a: { userId: string; creatorId: string; kind: PointKind; refId: string; sourceId?: string; at?: Date }): Promise<{ awarded: boolean; points: number }>`
  - `evaluateBadges(userId: string, creatorId: string): Promise<string[]>` (newly earned keys, in catalog order)
  - `getProfile(userId: string, creatorId: string, now?: Date): Promise<{ points: number; level: ReturnType<typeof levelFor>; streak: number; badges: Array<{ key: string; label: string; description: string; earnedAt: Date }> }>`
  - `getLeaderboard(creatorId: string, period: "week" | "all", viewerId: string | null, now?: Date): Promise<{ top: Array<{ rank: number; userId: string; name: string; points: number; level: number }>; me: { rank: number; points: number } | null }>`
  - `backfillPoints(creatorId: string): Promise<{ awarded: number }>`
- Rules enforced here: gamification off → no award; the creator earns nothing; over the daily cap → not recorded; unique key makes replay a no-op.

- [ ] **Step 1: Write the failing test**

Create `src/lib/gamification/service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem, addQuiz, enroll, makeChannel, makeCreatorWithProduct, makePost, makeUser } from "@/test/factories";
import { awardPoints, backfillPoints, evaluateBadges, getLeaderboard, getProfile } from "./service";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  await enroll(learner.id, product.id);
  return { creatorUser, creator, product, learner };
}
beforeEach(async () => {
  ctx = await setup();
});
const award = (kind: Parameters<typeof awardPoints>[0]["kind"], refId: string, extra: Partial<Parameters<typeof awardPoints>[0]> = {}) =>
  awardPoints({ userId: ctx.learner.id, creatorId: ctx.creator.id, kind, refId, ...extra });

describe("awardPoints", () => {
  it("awards the rule's points once; a replay is a no-op", async () => {
    expect(await award("lesson_complete", "item1")).toEqual({ awarded: true, points: 10 });
    expect(await award("lesson_complete", "item1")).toEqual({ awarded: false, points: 0 });
    expect(await db.pointEvent.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("does nothing when the creator turned gamification off", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    expect((await award("lesson_complete", "item1")).awarded).toBe(false);
    expect(await db.pointEvent.count()).toBe(0);
  });

  it("the creator earns no points in their own community", async () => {
    const r = await awardPoints({ userId: ctx.creatorUser.id, creatorId: ctx.creator.id, kind: "post_created", refId: "p1" });
    expect(r.awarded).toBe(false);
  });

  it("stops at the daily cap (3 awarded posts) but resumes the next IST day", async () => {
    const day1 = new Date("2026-10-15T08:00:00Z");
    for (const id of ["a", "b", "c"]) expect((await award("post_created", id, { at: day1 })).awarded).toBe(true);
    expect((await award("post_created", "d", { at: day1 })).awarded).toBe(false);
    const day2 = new Date("2026-10-15T20:00:00Z"); // after 18:30 UTC = next IST day
    expect((await award("post_created", "e", { at: day2 })).awarded).toBe(true);
  });

  it("caps are per kind, per user and per creator", async () => {
    const at = new Date("2026-10-15T08:00:00Z");
    for (const id of ["a", "b", "c"]) await award("post_created", id, { at });
    expect((await award("comment_created", "c1", { at })).awarded).toBe(true);
    const other = await makeUser();
    await enroll(other.id, ctx.product.id);
    expect((await awardPoints({ userId: other.id, creatorId: ctx.creator.id, kind: "post_created", refId: "z", at })).awarded).toBe(true);
  });

  it("stores sourceId so deleting content can remove its points", async () => {
    await award("post_created", "post1", { sourceId: "post1" });
    expect((await db.pointEvent.findFirstOrThrow({ where: { refId: "post1" } })).sourceId).toBe("post1");
  });
});

describe("evaluateBadges", () => {
  it("awards first_lesson after a completed lesson, once", async () => {
    const item = await addItem(ctx.product.id);
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_lesson"]);
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
    expect(await db.userBadge.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("awards first_post and popular_post (10 likes from OTHER users)", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_post"]);
    for (let i = 0; i < 9; i++) {
      const u = await makeUser();
      await db.like.create({ data: { userId: u.id, postId: post.id } });
    }
    await db.like.create({ data: { userId: ctx.learner.id, postId: post.id } }); // self-like must not count
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
    const tenth = await makeUser();
    await db.like.create({ data: { userId: tenth.id, postId: post.id } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["popular_post"]);
  });

  it("awards streak_7 after 7 consecutive IST days of lesson completions", async () => {
    for (let i = 0; i < 7; i++) {
      const item = await addItem(ctx.product.id, { position: i });
      await db.lessonProgress.create({
        data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id, completedAt: new Date(Date.UTC(2026, 9, 1 + i, 8)) },
      });
    }
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_lesson", "streak_7"]);
  });

  it("awards nothing when gamification is off", async () => {
    const item = await addItem(ctx.product.id);
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id } });
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
  });
});

describe("getProfile", () => {
  it("sums points, derives level and lists badges", async () => {
    await award("lesson_complete", "i1");
    await award("quiz_pass", "q1");
    await award("course_complete", "p1");
    const p = await getProfile(ctx.learner.id, ctx.creator.id);
    expect(p.points).toBe(135);
    expect(p.level.level).toBe(2);
    expect(p.streak).toBe(0);
    expect(p.badges).toEqual([]);
  });

  it("reports a live streak from lesson completions today", async () => {
    const now = new Date("2026-10-15T08:00:00Z");
    for (const [i, d] of [14, 15].entries()) {
      const item = await addItem(ctx.product.id, { position: i });
      await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id, completedAt: new Date(Date.UTC(2026, 9, d, 8)) } });
    }
    expect((await getProfile(ctx.learner.id, ctx.creator.id, now)).streak).toBe(2);
  });
});

describe("getLeaderboard", () => {
  it("ranks by points, uses short names, never exposes email", async () => {
    const asha = await makeUser("Asha Rao");
    await enroll(asha.id, ctx.product.id);
    await awardPoints({ userId: asha.id, creatorId: ctx.creator.id, kind: "course_complete", refId: "p1" });
    await award("lesson_complete", "i1");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top.map((r) => [r.name, r.points, r.rank])).toEqual([["Asha R.", 100, 1], ["Meera L.", 10, 2]]);
    expect(lb.me).toEqual({ rank: 2, points: 10 });
    expect(JSON.stringify(lb)).not.toContain("@");
  });

  it("the weekly board only counts events since Monday 00:00 IST", async () => {
    const now = new Date("2026-10-15T06:30:00Z"); // Thu
    await award("lesson_complete", "old", { at: new Date("2026-10-10T08:00:00Z") }); // previous week
    await award("lesson_complete", "new", { at: new Date("2026-10-13T08:00:00Z") });
    const week = await getLeaderboard(ctx.creator.id, "week", ctx.learner.id, now);
    const all = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id, now);
    expect(week.top[0].points).toBe(10);
    expect(all.top[0].points).toBe(20);
  });

  it("excludes banned members and the creator, and caps the list at 20", async () => {
    const banned = await makeUser("Bad Actor");
    await enroll(banned.id, ctx.product.id);
    await awardPoints({ userId: banned.id, creatorId: ctx.creator.id, kind: "course_complete", refId: "p1" });
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: banned.id } });
    for (let i = 0; i < 22; i++) {
      const u = await makeUser(`User ${i}`);
      await enroll(u.id, ctx.product.id);
      await awardPoints({ userId: u.id, creatorId: ctx.creator.id, kind: "lesson_complete", refId: `x${i}` });
    }
    const lb = await getLeaderboard(ctx.creator.id, "all", null);
    expect(lb.top).toHaveLength(20);
    expect(lb.top.some((r) => r.userId === banned.id)).toBe(false);
    expect(lb.me).toBeNull();
  });

  it("returns the viewer's rank even when outside the top 20", async () => {
    for (let i = 0; i < 21; i++) {
      const u = await makeUser(`Top ${i}`);
      await enroll(u.id, ctx.product.id);
      await awardPoints({ userId: u.id, creatorId: ctx.creator.id, kind: "course_complete", refId: `t${i}` });
    }
    await award("lesson_complete", "mine");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top).toHaveLength(20);
    expect(lb.me).toEqual({ rank: 22, points: 10 });
  });
});

describe("backfillPoints", () => {
  it("replays lessons, passed quizzes and finished courses idempotently", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    const { item: qItem, quiz } = await addQuiz(ctx.product.id, { position: 1 });
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: a.id, productId: ctx.product.id } });
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: qItem.id, productId: ctx.product.id } });
    const first = await backfillPoints(ctx.creator.id);
    expect(first.awarded).toBe(3); // lesson + quiz_pass + course_complete
    const profile = await getProfile(ctx.learner.id, ctx.creator.id);
    expect(profile.points).toBe(10 + 25 + 100);
    expect(await db.pointEvent.findFirst({ where: { kind: "quiz_pass", refId: quiz.id } })).toBeTruthy();
    expect((await backfillPoints(ctx.creator.id)).awarded).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gamification/service.test.ts`
Expected: FAIL — `./service` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/gamification/service.ts`:

```ts
import { db } from "../db";
import { isUniqueViolation } from "../errors";
import { computeProgress } from "../learning/progress";
import { BADGES, badgesToAward } from "./badges";
import { levelFor } from "./levels";
import { rankRows, shortName } from "./ranking";
import { POINT_RULES, type PointKind } from "./rules";
import { currentStreak, longestStreak } from "./streak";
import { istDayKey, istDayStart, istWeekStart } from "./time";

export type AwardInput = { userId: string; creatorId: string; kind: PointKind; refId: string; sourceId?: string; at?: Date };

/**
 * Idempotent: the unique key (user, creator, kind, refId) makes a replay a no-op. Returns awarded:false when
 * gamification is off, the user owns the community, the daily cap is reached, or the event already exists.
 */
export async function awardPoints(a: AwardInput): Promise<{ awarded: boolean; points: number }> {
  const none = { awarded: false, points: 0 };
  const creator = await db.creator.findUnique({ where: { id: a.creatorId }, select: { gamificationEnabled: true, userId: true } });
  if (!creator || !creator.gamificationEnabled || creator.userId === a.userId) return none;

  const rule = POINT_RULES[a.kind];
  const at = a.at ?? new Date();
  try {
    return await db.$transaction(async (tx) => {
      if (rule.dailyCap !== undefined) {
        const dayStart = istDayStart(istDayKey(at));
        const today = await tx.pointEvent.count({
          where: { userId: a.userId, creatorId: a.creatorId, kind: a.kind, createdAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) } },
        });
        if (today >= rule.dailyCap) return none;
      }
      await tx.pointEvent.create({
        data: { userId: a.userId, creatorId: a.creatorId, kind: a.kind, points: rule.points, refId: a.refId, sourceId: a.sourceId ?? null, createdAt: at },
      });
      return { awarded: true, points: rule.points };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return none; // replay or a concurrent identical award
    throw e;
  }
}

async function activityDays(userId: string, creatorId: string): Promise<string[]> {
  const rows = await db.lessonProgress.findMany({ where: { userId, product: { creatorId } }, select: { completedAt: true } });
  return rows.map((r) => istDayKey(r.completedAt));
}

/** Award any badges whose conditions are now met. Returns the newly earned keys, in catalog order. */
export async function evaluateBadges(userId: string, creatorId: string): Promise<string[]> {
  const creator = await db.creator.findUnique({ where: { id: creatorId }, select: { gamificationEnabled: true, userId: true } });
  if (!creator || !creator.gamificationEnabled || creator.userId === userId) return [];

  const [lessonsCompleted, coursesCompleted, postsCreated, days, likeGroups, earnedRows] = await Promise.all([
    db.lessonProgress.count({ where: { userId, product: { creatorId } } }),
    db.pointEvent.count({ where: { userId, creatorId, kind: "course_complete" } }),
    db.post.count({ where: { authorId: userId, channel: { creatorId } } }),
    activityDays(userId, creatorId),
    db.like.groupBy({
      by: ["postId"],
      where: { postId: { not: null }, userId: { not: userId }, post: { authorId: userId, channel: { creatorId } } },
      _count: { _all: true },
    }),
    db.userBadge.findMany({ where: { userId, creatorId }, select: { badgeKey: true } }),
  ]);
  const maxLikesOnOnePost = likeGroups.reduce((m, g) => Math.max(m, g._count._all), 0);
  const fresh = badgesToAward(
    { lessonsCompleted, coursesCompleted, postsCreated, longestStreak: longestStreak(days), maxLikesOnOnePost },
    new Set(earnedRows.map((b) => b.badgeKey)),
  );
  for (const badgeKey of fresh) {
    await db.userBadge.upsert({
      where: { userId_creatorId_badgeKey: { userId, creatorId, badgeKey } },
      create: { userId, creatorId, badgeKey },
      update: {},
    });
  }
  return fresh;
}

export async function getProfile(userId: string, creatorId: string, now = new Date()) {
  const [sum, days, badgeRows] = await Promise.all([
    db.pointEvent.aggregate({ where: { userId, creatorId }, _sum: { points: true } }),
    activityDays(userId, creatorId),
    db.userBadge.findMany({ where: { userId, creatorId }, orderBy: { earnedAt: "asc" } }),
  ]);
  const points = sum._sum.points ?? 0;
  const catalog = new Map(BADGES.map((b) => [b.key as string, b]));
  return {
    points,
    level: levelFor(points),
    streak: currentStreak(days, istDayKey(now)),
    badges: badgeRows.flatMap((b) => {
      const def = catalog.get(b.badgeKey);
      return def ? [{ key: def.key, label: def.label, description: def.description, earnedAt: b.earnedAt }] : [];
    }),
  };
}

export async function getLeaderboard(creatorId: string, period: "week" | "all", viewerId: string | null, now = new Date()) {
  const creator = await db.creator.findUniqueOrThrow({ where: { id: creatorId }, select: { userId: true } });
  const banned = await db.communityBan.findMany({ where: { creatorId }, select: { userId: true } });
  const excluded = [creator.userId, ...banned.map((b) => b.userId)];
  const groups = await db.pointEvent.groupBy({
    by: ["userId"],
    where: {
      creatorId,
      userId: { notIn: excluded },
      ...(period === "week" ? { createdAt: { gte: istWeekStart(now) } } : {}),
    },
    _sum: { points: true },
  });
  const earners = groups.filter((g) => (g._sum.points ?? 0) > 0);
  const users = await db.user.findMany({ where: { id: { in: earners.map((g) => g.userId) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const ranked = rankRows(earners.map((g) => ({ userId: g.userId, name: nameOf.get(g.userId) ?? "", points: g._sum.points ?? 0 })));

  // Levels use all-time points regardless of the board's period.
  const top = ranked.slice(0, 20);
  const totals = await db.pointEvent.groupBy({ by: ["userId"], where: { creatorId, userId: { in: top.map((r) => r.userId) } }, _sum: { points: true } });
  const totalOf = new Map(totals.map((t) => [t.userId, t._sum.points ?? 0]));
  const mine = viewerId ? ranked.find((r) => r.userId === viewerId) : undefined;
  return {
    top: top.map((r) => ({ rank: r.rank, userId: r.userId, name: shortName(r.name), points: r.points, level: levelFor(totalOf.get(r.userId) ?? r.points).level })),
    me: mine ? { rank: mine.rank, points: mine.points } : null,
  };
}

/** Replay existing progress through the idempotent award path (turning gamification on later, or a missed award). */
export async function backfillPoints(creatorId: string): Promise<{ awarded: number }> {
  let awarded = 0;
  const rows = await db.lessonProgress.findMany({
    where: { product: { creatorId } },
    include: { item: { select: { id: true, kind: true, quiz: { select: { id: true } } } } },
  });
  for (const r of rows) {
    const quiz = r.item.kind === "quiz" && r.item.quiz;
    const res = await awardPoints({
      userId: r.userId, creatorId, kind: quiz ? "quiz_pass" : "lesson_complete", refId: quiz ? quiz.id : r.item.id, at: r.completedAt,
    });
    if (res.awarded) awarded++;
  }
  const enrollments = await db.enrollment.findMany({
    where: { product: { creatorId } },
    select: { userId: true, productId: true, product: { select: { items: { select: { id: true, requiredForCompletion: true } } } } },
  });
  for (const e of enrollments) {
    const done = await db.lessonProgress.findMany({ where: { userId: e.userId, productId: e.productId }, select: { itemId: true, completedAt: true } });
    const progress = computeProgress(e.product.items.map((i) => ({ id: i.id, required: i.requiredForCompletion })), new Set(done.map((d) => d.itemId)));
    if (!progress.complete) continue;
    const at = done.reduce((m, d) => (d.completedAt > m ? d.completedAt : m), done[0].completedAt);
    if ((await awardPoints({ userId: e.userId, creatorId, kind: "course_complete", refId: e.productId, at })).awarded) awarded++;
  }
  return { awarded };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/gamification/service.test.ts`
Expected: PASS. If the "streak_7" case returns badges in a different order, `badgesToAward` follows catalog order (`first_lesson` before `streak_7`), which is what the test expects.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification/service.ts src/lib/gamification/service.test.ts
git commit -m "feat(gamification): points service, badges, profile, leaderboard, backfill

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/gamification/service.ts src/lib/gamification/service.test.ts
```

---

## Task 6: Learning hooks (best-effort awards after commit)

**Files:**
- Create: `src/lib/gamification/hooks.ts`
- Modify: `src/lib/learning/service.ts` (`markComplete`, `submitQuiz`)
- Test: `src/lib/gamification/hooks.test.ts`

**Interfaces:**
- Consumes: `awardPoints`, `evaluateBadges` (`./service`), `computeProgress`.
- Produces:
  - `awardSafely(a: AwardInput): Promise<void>` — awards then evaluates the user's badges (and, for `like_received`, nothing extra); never throws.
  - `onLearningProgress(userId: string, itemId: string): Promise<void>` — never throws. Awards `lesson_complete` (refId = itemId) or `quiz_pass` (refId = quiz id, for quiz lessons), then `course_complete` (refId = productId) when 100% of required lessons are done, then evaluates badges.

- [ ] **Step 1: Write the failing test**

Create `src/lib/gamification/hooks.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { markComplete, submitQuiz } from "@/lib/learning/service";
import { addItem, addQuiz, enroll, makeCreatorWithProduct, makeUser } from "@/test/factories";

let failAward = false;
vi.mock("./service", async (orig) => {
  const mod = await orig<typeof import("./service")>();
  return {
    ...mod,
    awardPoints: (...a: Parameters<typeof mod.awardPoints>) => {
      if (failAward) throw new Error("boom");
      return mod.awardPoints(...a);
    },
  };
});

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  await enroll(learner.id, product.id);
  return { creator, product, learner };
}
beforeEach(async () => {
  failAward = false;
  ctx = await setup();
});
const points = () => db.pointEvent.aggregate({ where: { userId: ctx.learner.id }, _sum: { points: true } }).then((r) => r._sum.points ?? 0);

describe("learning hooks", () => {
  it("completing a lesson awards 10 points once, even if marked complete twice", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    await addItem(ctx.product.id, { position: 1 });
    await markComplete(ctx.learner.id, a.id);
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(10);
    expect(await db.userBadge.findFirst({ where: { userId: ctx.learner.id, badgeKey: "first_lesson" } })).toBeTruthy();
  });

  it("finishing the last required lesson also awards course_complete (+100) and its badge", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(110);
    expect(await db.userBadge.findFirst({ where: { userId: ctx.learner.id, badgeKey: "course_complete" } })).toBeTruthy();
  });

  it("optional lessons still give lesson points but never block course_complete", async () => {
    const req = await addItem(ctx.product.id, { position: 0 });
    const opt = await addItem(ctx.product.id, { position: 1, requiredForCompletion: false });
    await markComplete(ctx.learner.id, opt.id);
    expect(await points()).toBe(10);
    await markComplete(ctx.learner.id, req.id);
    expect(await points()).toBe(120);
  });

  it("a failed quiz attempt awards nothing; passing awards quiz_pass once", async () => {
    const { item, correctAnswers, wrongAnswers } = await addQuiz(ctx.product.id);
    await addItem(ctx.product.id, { position: 5 }); // keep the course incomplete
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    expect(await points()).toBe(0);
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    expect(await points()).toBe(25);
  });

  it("learning still succeeds when awarding throws", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    failAward = true;
    await expect(markComplete(ctx.learner.id, a.id)).resolves.toEqual({ ok: true });
    expect(await db.lessonProgress.count({ where: { userId: ctx.learner.id, itemId: a.id } })).toBe(1);
    expect(await points()).toBe(0);
  });

  it("no points when the creator has gamification off", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    const a = await addItem(ctx.product.id, { position: 0 });
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/gamification/hooks.test.ts`
Expected: FAIL — `./hooks` is not imported yet, so points stay 0 (assertions on 10/110/25 fail).

- [ ] **Step 3: Write the hooks**

Create `src/lib/gamification/hooks.ts`:

```ts
import { db } from "../db";
import { computeProgress } from "../learning/progress";
import { awardPoints, evaluateBadges, type AwardInput } from "./service";

/** Award + evaluate badges; gamification must never break the action that triggered it. */
export async function awardSafely(a: AwardInput): Promise<void> {
  try {
    await awardPoints(a);
    await evaluateBadges(a.userId, a.creatorId);
  } catch (e) {
    console.error("[gamification] award failed", a.kind, e);
  }
}

/** Called after a lesson is marked complete or a quiz is passed (post-commit). */
export async function onLearningProgress(userId: string, itemId: string): Promise<void> {
  try {
    const item = await db.contentItem.findUnique({
      where: { id: itemId },
      select: { id: true, kind: true, productId: true, quiz: { select: { id: true } }, product: { select: { creatorId: true } } },
    });
    if (!item) return;
    const creatorId = item.product.creatorId;
    const isQuiz = item.kind === "quiz" && item.quiz;
    await awardPoints({ userId, creatorId, kind: isQuiz ? "quiz_pass" : "lesson_complete", refId: isQuiz ? item.quiz!.id : item.id });

    const [items, done] = await Promise.all([
      db.contentItem.findMany({ where: { productId: item.productId }, select: { id: true, requiredForCompletion: true } }),
      db.lessonProgress.findMany({ where: { userId, productId: item.productId }, select: { itemId: true } }),
    ]);
    const progress = computeProgress(items.map((i) => ({ id: i.id, required: i.requiredForCompletion })), new Set(done.map((d) => d.itemId)));
    if (progress.complete) await awardPoints({ userId, creatorId, kind: "course_complete", refId: item.productId });
    await evaluateBadges(userId, creatorId);
  } catch (e) {
    console.error("[gamification] learning hook failed", e);
  }
}
```

- [ ] **Step 4: Call the hook from the learning service**

In `src/lib/learning/service.ts` add the import at the top:

```ts
import { onLearningProgress } from "../gamification/hooks";
```

Replace `markComplete` with:

```ts
export async function markComplete(userId: string, itemId: string) {
  const result = await db.$transaction(async (tx) => {
    const { item, state } = await accessFor(tx, userId, itemId);
    if (item.kind === "quiz") throw new AppError("invalid_state", "Quizzes are completed by passing them.");
    if (!state.unlocked) throw new AppError("locked", "This lesson isn't available yet.");
    await ensureProgress(tx, userId, item.productId, item.id);
    await maybeIssueCertificate(tx, userId, item.productId);
    return { ok: true as const };
  });
  await onLearningProgress(userId, itemId); // after commit, best-effort: never fails the learner's action
  return result;
}
```

In `submitQuiz`, replace the body of the `try` so a pass triggers the hook after the transaction:

```ts
export async function submitQuiz(userId: string, itemId: string, answers: Record<string, string[]>): Promise<QuizSubmission> {
  try {
    const result = await submitQuizTx(userId, itemId, answers);
    if (result.passed) await onLearningProgress(userId, itemId); // after commit, best-effort
    return result;
  } catch (e) {
    // Two submits raced for the same attempt number: the database refused the second.
    if (isUniqueViolation(e)) throw new AppError("no_attempts", "Another submission was just processed. Reload and check your attempts.");
    throw e;
  }
}
```

(`onLearningProgress` swallows its own errors, so the `catch` above can only see errors from `submitQuizTx`.)

- [ ] **Step 5: Run the new tests and the whole learning suite**

Run: `npx vitest run src/lib/gamification src/lib/learning`
Expected: all PASS (existing learning tests unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gamification/hooks.ts src/lib/gamification/hooks.test.ts src/lib/learning/service.ts
git commit -m "feat(gamification): award points after lessons, quizzes and course completion

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/gamification/hooks.ts src/lib/gamification/hooks.test.ts src/lib/learning/service.ts
```

---

## Task 7: Community channels service (viewer, channels, gating)

**Files:**
- Create: `src/lib/community/viewer.ts`, `src/lib/community/channels.ts`
- Modify: `src/lib/handles.ts`, `src/app/actions/creator.ts` (reserve product slug `community`)
- Test: `src/lib/community/channels.test.ts`

**Interfaces:**
- Consumes: `canAccessChannel`, `Viewer`, `channelSchema`, `channelSlug`, `RESERVED_CHANNEL_SLUGS`, `AppError`.
- Produces:
  - `viewer.ts`: `loadViewer(creatorId: string, userId: string | null): Promise<Viewer>`; `resolveCommunity(handle: string, userId: string | null): Promise<{ creator: { id: string; userId: string; handle: string; displayName: string; brandColor: string; gamificationEnabled: boolean }; viewer: Viewer } | null>`.
  - `channels.ts`:
    - `type ChannelView = { id: string; name: string; slug: string; description: string; kind: "discussion" | "announcement"; access: "open" | "product_gated"; productIds: string[] }`
    - `ensureDefaultChannel(creatorId): Promise<void>`
    - `listChannelsFor(creatorId, viewer): Promise<ChannelView[]>` (only accessible channels, by position then createdAt)
    - `getChannelFor(creatorId, slug, viewer): Promise<ChannelView | null>`
    - `listChannelsAdmin(creatorId): Promise<Array<ChannelView & { postCount: number }>>`
    - `createChannel(creatorId, input: unknown): Promise<ChannelView>`; `updateChannel(creatorId, channelId, input: unknown): Promise<ChannelView>`; `deleteChannel(creatorId, channelId): Promise<void>`; `setChannelProducts(creatorId, channelId, productIds: string[]): Promise<void>`; `moveChannel(creatorId, channelId, dir: "up" | "down"): Promise<void>`
  - `RESERVED_PRODUCT_SLUGS` exported from `handles.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/community/channels.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { enroll, makeChannel, makeCreatorWithProduct, makeUser } from "@/test/factories";
import {
  createChannel, deleteChannel, ensureDefaultChannel, getChannelFor, listChannelsAdmin, listChannelsFor,
  moveChannel, setChannelProducts, updateChannel,
} from "./channels";
import { loadViewer, resolveCommunity } from "./viewer";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  return { creatorUser, creator, product, learner };
}
beforeEach(async () => {
  ctx = await setup();
});

describe("loadViewer / resolveCommunity", () => {
  it("anonymous and unenrolled viewers have no enrolments", async () => {
    expect(await loadViewer(ctx.creator.id, null)).toEqual({ isCreator: false, banned: false, enrolledProductIds: [] });
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).enrolledProductIds).toEqual([]);
  });
  it("lists only this creator's enrolled products, and flags the creator and bans", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    const other = await makeCreatorWithProduct();
    await enroll(ctx.learner.id, other.product.id);
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).enrolledProductIds).toEqual([ctx.product.id]);
    expect((await loadViewer(ctx.creator.id, ctx.creatorUser.id)).isCreator).toBe(true);
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: ctx.learner.id } });
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).banned).toBe(true);
  });
  it("resolveCommunity finds a creator by handle (case-insensitive) or returns null", async () => {
    const r = await resolveCommunity(ctx.creator.handle.toUpperCase(), ctx.learner.id);
    expect(r?.creator.id).toBe(ctx.creator.id);
    expect(await resolveCommunity("nope-nope", ctx.learner.id)).toBeNull();
  });
});

describe("createChannel / validation", () => {
  it("creates with a slug derived from the name and suffixes duplicates", async () => {
    const a = await createChannel(ctx.creator.id, { name: "Masterclass Q&A", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "Masterclass Q&A", kind: "discussion", access: "open" });
    expect(a.slug).toBe("masterclass-q-a");
    expect(b.slug).toBe("masterclass-q-a-2");
  });
  it("never produces a slug that collides with a fixed route", async () => {
    const c = await createChannel(ctx.creator.id, { name: "Leaderboard", kind: "discussion", access: "open" });
    expect(c.slug).toBe("leaderboard-2");
  });
  it("rejects invalid input with a validation error", async () => {
    await expect(createChannel(ctx.creator.id, { name: "", kind: "discussion", access: "open" })).rejects.toMatchObject({ code: "invalid" });
    await expect(createChannel(ctx.creator.id, { name: "x", kind: "chat", access: "open" })).rejects.toMatchObject({ code: "invalid" });
  });
  it("appends new channels after existing ones", async () => {
    const a = await createChannel(ctx.creator.id, { name: "One", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "Two", kind: "discussion", access: "open" });
    expect(b.id).not.toBe(a.id);
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["one", "two"]);
  });
});

describe("ensureDefaultChannel", () => {
  it("creates #general once and never again", async () => {
    await ensureDefaultChannel(ctx.creator.id);
    await ensureDefaultChannel(ctx.creator.id);
    const all = await listChannelsAdmin(ctx.creator.id);
    expect(all.map((c) => [c.slug, c.access, c.kind])).toEqual([["general", "open", "discussion"]]);
  });
  it("does not recreate #general after the creator deleted it and made other channels", async () => {
    await ensureDefaultChannel(ctx.creator.id);
    await createChannel(ctx.creator.id, { name: "Other", kind: "discussion", access: "open" });
    const g = (await listChannelsAdmin(ctx.creator.id)).find((c) => c.slug === "general")!;
    await deleteChannel(ctx.creator.id, g.id);
    await ensureDefaultChannel(ctx.creator.id);
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["other"]);
  });
});

describe("gating and listing", () => {
  it("members see open channels; gated channels need a linked product", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    const open = await makeChannel(ctx.creator.id, { slug: "open-one", position: 0 });
    const gated = await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated", position: 1 });
    const v = await loadViewer(ctx.creator.id, ctx.learner.id);
    expect((await listChannelsFor(ctx.creator.id, v)).map((c) => c.slug)).toEqual(["open-one"]);
    await setChannelProducts(ctx.creator.id, gated.id, [ctx.product.id]);
    expect((await listChannelsFor(ctx.creator.id, v)).map((c) => c.slug)).toEqual(["open-one", "vip"]);
    expect((await getChannelFor(ctx.creator.id, "vip", v))?.productIds).toEqual([ctx.product.id]);
    expect(open.id).toBeTruthy();
  });
  it("non-members and strangers get null for any channel, gated or open", async () => {
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    const v = await loadViewer(ctx.creator.id, ctx.learner.id);
    expect(await getChannelFor(ctx.creator.id, "open-one", v)).toBeNull();
    expect(await listChannelsFor(ctx.creator.id, v)).toEqual([]);
  });
  it("a refund (enrolment deleted) ends access immediately", async () => {
    const e = await enroll(ctx.learner.id, ctx.product.id);
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toHaveLength(1);
    await db.enrollment.delete({ where: { id: e.id } });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toHaveLength(0);
  });
  it("a banned member sees nothing; the creator sees everything", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated" });
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: ctx.learner.id } });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toEqual([]);
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.creatorUser.id))).toHaveLength(2);
  });
});

describe("creator-scoped mutations", () => {
  it("a creator cannot link another creator's product, nor touch another creator's channel", async () => {
    const other = await makeCreatorWithProduct();
    const mine = await makeChannel(ctx.creator.id, { access: "product_gated" });
    await expect(setChannelProducts(ctx.creator.id, mine.id, [other.product.id])).rejects.toMatchObject({ code: "not_found" });
    const theirs = await makeChannel(other.creator.id);
    await expect(updateChannel(ctx.creator.id, theirs.id, { name: "Hijack", kind: "discussion", access: "open" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteChannel(ctx.creator.id, theirs.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(setChannelProducts(ctx.creator.id, theirs.id, [])).rejects.toMatchObject({ code: "not_found" });
  });
  it("setChannelProducts replaces the link set", async () => {
    const second = await db.product.create({ data: { creatorId: ctx.creator.id, slug: "second", type: "course", title: "Second", pricePaise: 0, status: "published" } });
    const ch = await makeChannel(ctx.creator.id, { access: "product_gated" });
    await setChannelProducts(ctx.creator.id, ch.id, [ctx.product.id, second.id]);
    await setChannelProducts(ctx.creator.id, ch.id, [second.id]);
    expect((await listChannelsAdmin(ctx.creator.id))[0].productIds).toEqual([second.id]);
  });
  it("updateChannel changes fields but keeps the slug stable", async () => {
    const ch = await createChannel(ctx.creator.id, { name: "Old name", kind: "discussion", access: "open" });
    const up = await updateChannel(ctx.creator.id, ch.id, { name: "New name", description: "Hi", kind: "announcement", access: "open" });
    expect(up).toMatchObject({ name: "New name", slug: "old-name", kind: "announcement", description: "Hi" });
  });
  it("moveChannel swaps order and ignores moves past the ends", async () => {
    const a = await createChannel(ctx.creator.id, { name: "A", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "B", kind: "discussion", access: "open" });
    await moveChannel(ctx.creator.id, b.id, "up");
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["b", "a"]);
    await moveChannel(ctx.creator.id, b.id, "up");
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["b", "a"]);
    expect(a.id).toBeTruthy();
  });
  it("deleteChannel removes its posts", async () => {
    const ch = await makeChannel(ctx.creator.id);
    await db.post.create({ data: { channelId: ch.id, authorId: ctx.learner.id, body: "x" } });
    await deleteChannel(ctx.creator.id, ch.id);
    expect(await db.post.count({ where: { channelId: ch.id } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/channels.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `viewer.ts`**

Create `src/lib/community/viewer.ts`:

```ts
import { db } from "../db";
import type { Viewer } from "./access";

/** Everything access decisions need about one viewer of one creator's community. Re-read on every request. */
export async function loadViewer(creatorId: string, userId: string | null): Promise<Viewer> {
  if (!userId) return { isCreator: false, banned: false, enrolledProductIds: [] };
  const [creator, ban, enrollments] = await Promise.all([
    db.creator.findUnique({ where: { id: creatorId }, select: { userId: true } }),
    db.communityBan.findUnique({ where: { creatorId_userId: { creatorId, userId } }, select: { id: true } }),
    db.enrollment.findMany({ where: { userId, product: { creatorId } }, select: { productId: true } }),
  ]);
  return { isCreator: creator?.userId === userId, banned: ban !== null, enrolledProductIds: enrollments.map((e) => e.productId) };
}

export async function resolveCommunity(handle: string, userId: string | null) {
  const creator = await db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, userId: true, handle: true, displayName: true, brandColor: true, gamificationEnabled: true },
  });
  if (!creator) return null;
  return { creator, viewer: await loadViewer(creator.id, userId) };
}
```

- [ ] **Step 4: Write `channels.ts`**

Create `src/lib/community/channels.ts`:

```ts
import { db } from "../db";
import { AppError } from "../errors";
import { canAccessChannel, type Viewer } from "./access";
import { RESERVED_CHANNEL_SLUGS, channelSchema, channelSlug } from "./validation";

export type ChannelView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  kind: "discussion" | "announcement";
  access: "open" | "product_gated";
  productIds: string[];
};

type Row = { id: string; name: string; slug: string; description: string; kind: string; access: string; products: Array<{ productId: string }> };
const view = (r: Row): ChannelView => ({
  id: r.id, name: r.name, slug: r.slug, description: r.description,
  kind: r.kind as ChannelView["kind"], access: r.access as ChannelView["access"],
  productIds: r.products.map((p) => p.productId).sort(),
});
const include = { products: { select: { productId: true } } } as const;
const ordered = [{ position: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];

function parse(input: unknown) {
  const r = channelSchema.safeParse(input);
  if (!r.success) throw new AppError("invalid", r.error.issues[0]?.message ?? "Check the channel details.");
  return r.data;
}

async function owned(creatorId: string, channelId: string) {
  const ch = await db.channel.findFirst({ where: { id: channelId, creatorId }, include });
  if (!ch) throw new AppError("not_found", "Channel not found.");
  return ch;
}

async function uniqueSlug(creatorId: string, name: string): Promise<string> {
  const base = channelSlug(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (RESERVED_CHANNEL_SLUGS.has(slug)) continue;
    if (!(await db.channel.findUnique({ where: { creatorId_slug: { creatorId, slug } }, select: { id: true } }))) return slug;
  }
  throw new AppError("invalid", "Couldn't find a free link for this channel name. Try another name.");
}

/** First visit only: a creator with no channels yet gets an open #general. Never resurrects a deleted one. */
export async function ensureDefaultChannel(creatorId: string): Promise<void> {
  if ((await db.channel.count({ where: { creatorId } })) > 0) return;
  await db.channel.create({
    data: { creatorId, name: "General", slug: "general", description: "Say hello and ask anything.", kind: "discussion", access: "open", position: 0 },
  });
}

export async function listChannelsFor(creatorId: string, viewer: Viewer): Promise<ChannelView[]> {
  const rows = await db.channel.findMany({ where: { creatorId }, include, orderBy: ordered });
  return rows.map(view).filter((c) => canAccessChannel(c, viewer));
}

export async function getChannelFor(creatorId: string, slug: string, viewer: Viewer): Promise<ChannelView | null> {
  const row = await db.channel.findUnique({ where: { creatorId_slug: { creatorId, slug } }, include });
  if (!row) return null;
  const c = view(row);
  return canAccessChannel(c, viewer) ? c : null;
}

export async function listChannelsAdmin(creatorId: string) {
  const rows = await db.channel.findMany({ where: { creatorId }, include: { ...include, _count: { select: { posts: true } } }, orderBy: ordered });
  return rows.map((r) => ({ ...view(r), postCount: r._count.posts }));
}

export async function createChannel(creatorId: string, input: unknown): Promise<ChannelView> {
  const data = parse(input);
  const last = await db.channel.findFirst({ where: { creatorId }, orderBy: { position: "desc" }, select: { position: true } });
  const row = await db.channel.create({
    data: { ...data, creatorId, slug: await uniqueSlug(creatorId, data.name), position: (last?.position ?? -1) + 1 },
    include,
  });
  return view(row);
}

/** Slug stays stable on rename so existing links keep working. */
export async function updateChannel(creatorId: string, channelId: string, input: unknown): Promise<ChannelView> {
  await owned(creatorId, channelId);
  const data = parse(input);
  return view(await db.channel.update({ where: { id: channelId }, data, include }));
}

export async function deleteChannel(creatorId: string, channelId: string): Promise<void> {
  await owned(creatorId, channelId);
  await db.channel.delete({ where: { id: channelId } });
}

export async function setChannelProducts(creatorId: string, channelId: string, productIds: string[]): Promise<void> {
  await owned(creatorId, channelId);
  const ids = [...new Set(productIds)];
  const mine = await db.product.count({ where: { id: { in: ids }, creatorId } });
  if (mine !== ids.length) throw new AppError("not_found", "Product not found.");
  await db.$transaction([
    db.channelProduct.deleteMany({ where: { channelId } }),
    ...ids.map((productId) => db.channelProduct.create({ data: { channelId, productId } })),
  ]);
}

export async function moveChannel(creatorId: string, channelId: string, dir: "up" | "down"): Promise<void> {
  await owned(creatorId, channelId);
  const all = await db.channel.findMany({ where: { creatorId }, orderBy: ordered, select: { id: true } });
  const i = all.findIndex((c) => c.id === channelId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((c, pos) => db.channel.update({ where: { id: c.id }, data: { position: pos } })));
}
```

- [ ] **Step 5: Reserve the product slug `community`**

`/c/[handle]/community` is a fixed route; a product with slug `community` would be unreachable (`/c/[handle]/[slug]`).

In `src/lib/handles.ts` append:

```ts
/** Product slugs that would be shadowed by a fixed route under /c/[handle]/. */
export const RESERVED_PRODUCT_SLUGS: ReadonlySet<string> = new Set(["community"]);
```

In `src/app/actions/creator.ts` change the import to `import { RESERVED_PRODUCT_SLUGS, slugify } from "@/lib/handles";` and inside `uniqueSlug`'s loop (lines ~34–38) change the success condition to:

```ts
    if (!RESERVED_PRODUCT_SLUGS.has(slug) && (!hit || hit.id === ignoreId)) return slug;
```

(Keep `const hit = ...` as it is; only the `if` changes. The reserved check short-circuits so a reserved slug falls through to `community-2`.)

- [ ] **Step 6: Run test to verify it passes, plus typecheck**

Run: `npx vitest run src/lib/community/channels.test.ts && npm run typecheck`
Expected: PASS and no type errors. (If the `invalid` code assertion for `createChannel` with `kind: "chat"` fails, confirm `parse` throws `AppError("invalid", ...)`.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/community/viewer.ts src/lib/community/channels.ts src/lib/community/channels.test.ts src/lib/handles.ts src/app/actions/creator.ts
git commit -m "feat(community): channels service with product gating; reserve product slug 'community'

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/community/viewer.ts src/lib/community/channels.ts src/lib/community/channels.test.ts src/lib/handles.ts src/app/actions/creator.ts
```

---

## Task 8: Posts, comments, likes, moderation service

**Files:**
- Create: `src/lib/community/posts.ts`
- Test: `src/lib/community/posts.test.ts`

**Interfaces:**
- Consumes: `loadViewer`, `canAccessChannel`, `canPost`, `canComment`, `canModerate`, `postSchema`, `commentSchema`, `LIMITS`, `awardSafely` (`../gamification/hooks`), `AppError`.
- Produces (all throw `AppError("not_found")` when the actor has no access, `AppError("forbidden")` only for access-holders who lack the permission, `AppError("invalid")` for bad input):
  - `type AuthorView = { id: string; name: string; isCreator: boolean }`
  - `type PostView = { id: string; title: string; body: string; pinned: boolean; createdAt: Date; editedAt: Date | null; author: AuthorView; commentCount: number; likeCount: number; likedByMe: boolean; canEdit: boolean; canDelete: boolean }`
  - `listPosts(a: { creatorId: string; channelId: string; userId: string | null; cursor?: string }): Promise<{ posts: PostView[]; nextCursor: string | null }>`
  - `getThread(userId: string | null, postId: string): Promise<{ post: PostView; channel: { id: string; slug: string; name: string; creatorId: string }; comments: CommentView[] }>`
  - `type CommentView = { id: string; body: string; createdAt: Date; author: AuthorView; likeCount: number; likedByMe: boolean; canDelete: boolean }`
  - `createPost(userId: string, channelId: string, input: unknown): Promise<{ id: string }>`
  - `editPost(userId: string, postId: string, input: unknown): Promise<void>`
  - `deletePost(userId: string, postId: string): Promise<void>`
  - `addComment(userId: string, postId: string, input: unknown): Promise<{ id: string }>`
  - `deleteComment(userId: string, commentId: string): Promise<void>`
  - `toggleLike(userId: string, target: { postId: string } | { commentId: string }): Promise<{ liked: boolean; likeCount: number }>`
  - `setPinned(userId: string, postId: string, pinned: boolean): Promise<void>`
  - `banMember(creatorUserId: string, creatorId: string, targetUserId: string): Promise<void>`, `unbanMember(creatorId: string, targetUserId: string): Promise<void>`, `listBans(creatorId: string): Promise<Array<{ userId: string; name: string; createdAt: Date }>>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/community/posts.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { enroll, makeChannel, makeCreatorWithProduct, makeUser } from "@/test/factories";
import {
  addComment, banMember, createPost, deleteComment, deletePost, editPost, getThread, listBans, listPosts,
  setPinned, toggleLike, unbanMember,
} from "./posts";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const member = await makeUser("Meera Learner");
  const member2 = await makeUser("Ravi Kumar");
  const stranger = await makeUser("Stranger Danger");
  await enroll(member.id, product.id);
  await enroll(member2.id, product.id);
  const channel = await makeChannel(creator.id, { slug: "general" });
  return { creatorUser, creator, product, member, member2, stranger, channel };
}
beforeEach(async () => {
  ctx = await setup();
});
const feed = (userId: string | null, cursor?: string) =>
  listPosts({ creatorId: ctx.creator.id, channelId: ctx.channel.id, userId, cursor });
const points = (userId: string) => db.pointEvent.aggregate({ where: { userId }, _sum: { points: true } }).then((r) => r._sum.points ?? 0);

describe("access (server-side, every operation)", () => {
  it("a stranger cannot read, post, comment or like in an open channel", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "hello" });
    await expect(feed(ctx.stranger.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(feed(null)).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.stranger.id, ctx.channel.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(getThread(ctx.stranger.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(addComment(ctx.stranger.id, id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(toggleLike(ctx.stranger.id, { postId: id })).rejects.toMatchObject({ code: "not_found" });
  });

  it("a gated channel is invisible to members of other products", async () => {
    const vip = await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated" });
    await db.channelProduct.create({ data: { channelId: vip.id, productId: ctx.product.id } });
    const other = await db.product.create({ data: { creatorId: ctx.creator.id, slug: "other", type: "course", title: "Other", pricePaise: 0, status: "published" } });
    const outsider = await makeUser();
    await enroll(outsider.id, other.id);
    await expect(createPost(outsider.id, vip.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(listPosts({ creatorId: ctx.creator.id, channelId: vip.id, userId: outsider.id })).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.member.id, vip.id, { body: "x" })).resolves.toBeTruthy();
  });

  it("a refund (enrolment deleted) removes access to existing posts too", async () => {
    const e = await db.enrollment.findFirstOrThrow({ where: { userId: ctx.member.id } });
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "mine" });
    await db.enrollment.delete({ where: { id: e.id } });
    await expect(getThread(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePost(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("a banned member loses read and write access; unban restores it", async () => {
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id);
    await expect(feed(ctx.member.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await unbanMember(ctx.creator.id, ctx.member.id);
    await expect(feed(ctx.member.id)).resolves.toBeTruthy();
  });

  it("only announcement-channel creators post; members cannot (forbidden) but may comment", async () => {
    const ann = await makeChannel(ctx.creator.id, { slug: "news", kind: "announcement" });
    await expect(createPost(ctx.member.id, ann.id, { body: "x" })).rejects.toMatchObject({ code: "forbidden" });
    const { id } = await createPost(ctx.creatorUser.id, ann.id, { body: "Big news" });
    await expect(addComment(ctx.member.id, id, { body: "congrats" })).resolves.toBeTruthy();
  });
});

describe("posts", () => {
  it("creates plain-text posts, trims input, and rejects empty/oversized bodies", async () => {
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "   " })).rejects.toMatchObject({ code: "invalid" });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x".repeat(2001) })).rejects.toMatchObject({ code: "invalid" });
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { title: " T ", body: "  <b>hi</b>  " });
    const row = await db.post.findUniqueOrThrow({ where: { id } });
    expect([row.title, row.body]).toEqual(["T", "<b>hi</b>"]);
  });

  it("feed returns newest first with counts, author names, never emails", async () => {
    const a = await createPost(ctx.member.id, ctx.channel.id, { body: "first" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createPost(ctx.member2.id, ctx.channel.id, { body: "second" });
    await addComment(ctx.member2.id, a.id, { body: "c" });
    await toggleLike(ctx.member2.id, { postId: a.id });
    const { posts } = await feed(ctx.member.id);
    expect(posts.map((p) => p.id)).toEqual([b.id, a.id]);
    const first = posts.find((p) => p.id === a.id)!;
    expect([first.commentCount, first.likeCount, first.likedByMe, first.author.name]).toEqual([1, 1, false, "Meera Learner"]);
    expect(JSON.stringify(posts)).not.toContain("@t.test");
  });

  it("pinned posts come first and appear only on page one; pagination is stable", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) {
      ids.push((await createPost(ctx.creatorUser.id, ctx.channel.id, { body: `p${i}` })).id);
    }
    await setPinned(ctx.creatorUser.id, ids[0], true);
    const page1 = await feed(ctx.member.id);
    expect(page1.posts[0].id).toBe(ids[0]);
    expect(page1.posts).toHaveLength(21); // 1 pinned + 20
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await feed(ctx.member.id, page1.nextCursor!);
    expect(page2.posts).toHaveLength(4);
    expect(page2.nextCursor).toBeNull();
    const seen = new Set([...page1.posts, ...page2.posts].map((p) => p.id));
    expect(seen.size).toBe(25);
  });

  it("only the author edits; edit sets editedAt", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "v1" });
    await expect(editPost(ctx.member2.id, id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(editPost(ctx.creatorUser.id, id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    await editPost(ctx.member.id, id, { body: "v2" });
    const row = await db.post.findUniqueOrThrow({ where: { id } });
    expect(row.body).toBe("v2");
    expect(row.editedAt).not.toBeNull();
  });

  it("author or creator may delete; another member may not", async () => {
    const a = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await expect(deletePost(ctx.member2.id, a.id)).rejects.toMatchObject({ code: "forbidden" });
    await deletePost(ctx.member.id, a.id);
    const b = await createPost(ctx.member.id, ctx.channel.id, { body: "y" });
    await deletePost(ctx.creatorUser.id, b.id);
    expect(await db.post.count({ where: { channelId: ctx.channel.id } })).toBe(0);
  });

  it("pin is creator-only and capped at 3 per channel", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await createPost(ctx.creatorUser.id, ctx.channel.id, { body: `p${i}` })).id);
    await expect(setPinned(ctx.member.id, ids[0], true)).rejects.toMatchObject({ code: "forbidden" });
    for (const id of ids.slice(0, 3)) await setPinned(ctx.creatorUser.id, id, true);
    await expect(setPinned(ctx.creatorUser.id, ids[3], true)).rejects.toMatchObject({ code: "limit" });
    await setPinned(ctx.creatorUser.id, ids[0], false);
    await expect(setPinned(ctx.creatorUser.id, ids[3], true)).resolves.toBeUndefined();
  });
});

describe("comments", () => {
  it("adds, lists oldest-first, and rejects empty bodies", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await expect(addComment(ctx.member2.id, id, { body: " " })).rejects.toMatchObject({ code: "invalid" });
    await addComment(ctx.member2.id, id, { body: "first" });
    await new Promise((r) => setTimeout(r, 5));
    await addComment(ctx.member.id, id, { body: "second" });
    const t = await getThread(ctx.member.id, id);
    expect(t.comments.map((c) => c.body)).toEqual(["first", "second"]);
    expect(t.comments[1].canDelete).toBe(true);
    expect(t.comments[0].canDelete).toBe(false);
  });

  it("author or creator deletes a comment; others cannot", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    const c = await addComment(ctx.member2.id, id, { body: "x" });
    await expect(deleteComment(ctx.member.id, c.id)).rejects.toMatchObject({ code: "forbidden" });
    await deleteComment(ctx.creatorUser.id, c.id);
    expect(await db.comment.count({ where: { postId: id } })).toBe(0);
  });
});

describe("likes", () => {
  it("toggles on and off; counts reflect it", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    expect(await toggleLike(ctx.member2.id, { postId: id })).toEqual({ liked: true, likeCount: 1 });
    expect(await toggleLike(ctx.member2.id, { postId: id })).toEqual({ liked: false, likeCount: 0 });
  });
  it("likes a comment too", async () => {
    const p = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    const c = await addComment(ctx.member.id, p.id, { body: "c" });
    expect(await toggleLike(ctx.member2.id, { commentId: c.id })).toEqual({ liked: true, likeCount: 1 });
  });
});

describe("points from community actions", () => {
  it("post +5, comment +2, like received +1 (to the author); self-like earns nothing", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    expect(await points(ctx.member.id)).toBe(5);
    await addComment(ctx.member2.id, id, { body: "hi" });
    expect(await points(ctx.member2.id)).toBe(2);
    await toggleLike(ctx.member2.id, { postId: id });
    expect(await points(ctx.member.id)).toBe(6);
    await toggleLike(ctx.member.id, { postId: id }); // self-like
    expect(await points(ctx.member.id)).toBe(6);
  });

  it("unlike then re-like does not award again", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await toggleLike(ctx.member2.id, { postId: id });
    await toggleLike(ctx.member2.id, { postId: id });
    await toggleLike(ctx.member2.id, { postId: id });
    expect(await points(ctx.member.id)).toBe(6);
  });

  it("deleting a post removes the points it and its comments and likes earned", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await addComment(ctx.member2.id, id, { body: "hi" });
    await toggleLike(ctx.member2.id, { postId: id });
    await deletePost(ctx.member.id, id);
    expect(await points(ctx.member.id)).toBe(0);
    expect(await points(ctx.member2.id)).toBe(0);
  });

  it("deleting a comment removes its points", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    const c = await addComment(ctx.member2.id, id, { body: "hi" });
    await deleteComment(ctx.member2.id, c.id);
    expect(await points(ctx.member2.id)).toBe(0);
  });

  it("posting still works when gamification is off (and earns nothing)", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x" })).resolves.toBeTruthy();
    expect(await points(ctx.member.id)).toBe(0);
  });
});

describe("bans", () => {
  it("only the creator can ban, never themselves; banning twice is harmless", async () => {
    await expect(banMember(ctx.member.id, ctx.creator.id, ctx.member2.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(banMember(ctx.creatorUser.id, ctx.creator.id, ctx.creatorUser.id)).rejects.toMatchObject({ code: "invalid" });
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id);
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id); // idempotent
    expect((await listBans(ctx.creator.id)).map((b) => b.name)).toEqual(["Meera Learner"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/posts.test.ts`
Expected: FAIL — `./posts` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/community/posts.ts`:

```ts
import { z } from "zod";
import { db } from "../db";
import { AppError } from "../errors";
import { awardSafely } from "../gamification/hooks";
import { canAccessChannel, canComment, canModerate, canPost, type ChannelAccessInfo, type Viewer } from "./access";
import { LIMITS, commentSchema, postSchema } from "./validation";
import { loadViewer } from "./viewer";

export type AuthorView = { id: string; name: string; isCreator: boolean };
export type PostView = {
  id: string; title: string; body: string; pinned: boolean; createdAt: Date; editedAt: Date | null;
  author: AuthorView; commentCount: number; likeCount: number; likedByMe: boolean; canEdit: boolean; canDelete: boolean;
};
export type CommentView = {
  id: string; body: string; createdAt: Date; author: AuthorView; likeCount: number; likedByMe: boolean; canDelete: boolean;
};

const notFound = () => new AppError("not_found", "Not found.");
const forbidden = () => new AppError("forbidden", "You can't do that.");

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError("invalid", r.error.issues[0]?.message ?? "Check what you wrote.");
  return r.data;
}

async function channelInfo(channelId: string) {
  const ch = await db.channel.findUnique({ where: { id: channelId }, include: { products: { select: { productId: true } } } });
  if (!ch) return null;
  const info: ChannelAccessInfo = { access: ch.access as ChannelAccessInfo["access"], kind: ch.kind as ChannelAccessInfo["kind"], productIds: ch.products.map((p) => p.productId) };
  return { ch, info };
}

/** Channel + viewer, or not_found when the channel doesn't exist OR the user can't see it. */
async function gate(userId: string | null, channelId: string) {
  const found = await channelInfo(channelId);
  if (!found) throw notFound();
  const viewer = await loadViewer(found.ch.creatorId, userId);
  if (!canAccessChannel(found.info, viewer)) throw notFound();
  return { ...found, viewer };
}

async function gatePost(userId: string | null, postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw notFound();
  return { post, ...(await gate(userId, post.channelId)) };
}

/* ---------- views ---------- */

type PostRow = { id: string; title: string; body: string; pinned: boolean; createdAt: Date; editedAt: Date | null; authorId: string; author: { id: string; name: string } };

async function toPostViews(rows: PostRow[], viewer: Viewer, userId: string | null, creatorUserId: string): Promise<PostView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [comments, likes, mine] = await Promise.all([
    db.comment.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    db.like.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    userId ? db.like.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } }) : Promise.resolve([]),
  ]);
  const cc = new Map(comments.map((c) => [c.postId, c._count._all]));
  const lc = new Map(likes.map((l) => [l.postId, l._count._all]));
  const liked = new Set(mine.map((m) => m.postId));
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, pinned: r.pinned, createdAt: r.createdAt, editedAt: r.editedAt,
    author: { id: r.author.id, name: r.author.name, isCreator: r.author.id === creatorUserId },
    commentCount: cc.get(r.id) ?? 0, likeCount: lc.get(r.id) ?? 0, likedByMe: liked.has(r.id),
    canEdit: r.authorId === userId, canDelete: r.authorId === userId || canModerate(viewer),
  }));
}

const postSelect = { id: true, title: true, body: true, pinned: true, createdAt: true, editedAt: true, authorId: true, author: { select: { id: true, name: true } } } as const;

export async function listPosts(a: { creatorId: string; channelId: string; userId: string | null; cursor?: string }) {
  const { ch, viewer } = await gate(a.userId, a.channelId);
  if (ch.creatorId !== a.creatorId) throw notFound();
  const creator = await db.creator.findUniqueOrThrow({ where: { id: a.creatorId }, select: { userId: true } });

  // Pinned posts (max 3) lead page one only; the cursor walks the unpinned posts newest-first.
  const pinned = a.cursor ? [] : await db.post.findMany({ where: { channelId: ch.id, pinned: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: postSelect });
  const rest = await db.post.findMany({
    where: { channelId: ch.id, pinned: false },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LIMITS.pageSize + 1,
    ...(a.cursor ? { cursor: { id: a.cursor }, skip: 1 } : {}),
    select: postSelect,
  });
  const hasMore = rest.length > LIMITS.pageSize;
  const page = hasMore ? rest.slice(0, LIMITS.pageSize) : rest;
  const posts = await toPostViews([...pinned, ...page], viewer, a.userId, creator.userId);
  return { posts, nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function getThread(userId: string | null, postId: string) {
  const { post, ch, viewer } = await gatePost(userId, postId);
  const creator = await db.creator.findUniqueOrThrow({ where: { id: ch.creatorId }, select: { userId: true } });
  const row = await db.post.findUniqueOrThrow({ where: { id: post.id }, select: postSelect });
  const [postView] = await toPostViews([row], viewer, userId, creator.userId);
  const rows = await db.comment.findMany({
    where: { postId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { id: true, name: true } } },
  });
  const ids = rows.map((r) => r.id);
  const [likes, mine] = await Promise.all([
    db.like.groupBy({ by: ["commentId"], where: { commentId: { in: ids } }, _count: { _all: true } }),
    userId && ids.length ? db.like.findMany({ where: { userId, commentId: { in: ids } }, select: { commentId: true } }) : Promise.resolve([]),
  ]);
  const lc = new Map(likes.map((l) => [l.commentId, l._count._all]));
  const liked = new Set(mine.map((m) => m.commentId));
  const comments: CommentView[] = rows.map((r) => ({
    id: r.id, body: r.body, createdAt: r.createdAt,
    author: { id: r.author.id, name: r.author.name, isCreator: r.author.id === creator.userId },
    likeCount: lc.get(r.id) ?? 0, likedByMe: liked.has(r.id), canDelete: r.authorId === userId || canModerate(viewer),
  }));
  return { post: postView, channel: { id: ch.id, slug: ch.slug, name: ch.name, creatorId: ch.creatorId }, comments };
}

/* ---------- posts ---------- */

export async function createPost(userId: string, channelId: string, input: unknown): Promise<{ id: string }> {
  const { ch, info, viewer } = await gate(userId, channelId);
  if (!canPost(info, viewer)) throw forbidden();
  const data = parse(postSchema, input);
  const post = await db.post.create({ data: { channelId, authorId: userId, ...data }, select: { id: true } });
  await awardSafely({ userId, creatorId: ch.creatorId, kind: "post_created", refId: post.id, sourceId: post.id });
  return post;
}

export async function editPost(userId: string, postId: string, input: unknown): Promise<void> {
  const { post } = await gatePost(userId, postId);
  if (post.authorId !== userId) throw forbidden();
  const data = parse(postSchema, input);
  await db.post.update({ where: { id: postId }, data: { ...data, editedAt: new Date() } });
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const { post, viewer } = await gatePost(userId, postId);
  if (post.authorId !== userId && !canModerate(viewer)) throw forbidden();
  const comments = await db.comment.findMany({ where: { postId }, select: { id: true } });
  await db.$transaction([
    db.pointEvent.deleteMany({ where: { sourceId: { in: [postId, ...comments.map((c) => c.id)] } } }),
    db.post.delete({ where: { id: postId } }),
  ]);
}

export async function setPinned(userId: string, postId: string, pinned: boolean): Promise<void> {
  const { post, viewer } = await gatePost(userId, postId);
  if (!canModerate(viewer)) throw forbidden();
  if (pinned && !post.pinned) {
    const count = await db.post.count({ where: { channelId: post.channelId, pinned: true } });
    if (count >= LIMITS.maxPinned) throw new AppError("limit", `You can pin up to ${LIMITS.maxPinned} posts per channel.`);
  }
  await db.post.update({ where: { id: postId }, data: { pinned } });
}

/* ---------- comments ---------- */

export async function addComment(userId: string, postId: string, input: unknown): Promise<{ id: string }> {
  const { ch, info, viewer } = await gatePost(userId, postId);
  if (!canComment(info, viewer)) throw forbidden();
  const data = parse(commentSchema, input);
  const c = await db.comment.create({ data: { postId, authorId: userId, body: data.body }, select: { id: true } });
  await awardSafely({ userId, creatorId: ch.creatorId, kind: "comment_created", refId: c.id, sourceId: c.id });
  return c;
}

export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw notFound();
  const { viewer } = await gatePost(userId, comment.postId);
  if (comment.authorId !== userId && !canModerate(viewer)) throw forbidden();
  await db.$transaction([
    db.pointEvent.deleteMany({ where: { sourceId: commentId } }),
    db.comment.delete({ where: { id: commentId } }),
  ]);
}

/* ---------- likes ---------- */

export async function toggleLike(userId: string, target: { postId: string } | { commentId: string }) {
  let postId: string;
  let targetId: string;
  let targetAuthorId: string;
  if ("postId" in target) {
    const p = await db.post.findUnique({ where: { id: target.postId }, select: { id: true, authorId: true } });
    if (!p) throw notFound();
    postId = p.id; targetId = p.id; targetAuthorId = p.authorId;
  } else {
    const c = await db.comment.findUnique({ where: { id: target.commentId }, select: { id: true, postId: true, authorId: true } });
    if (!c) throw notFound();
    postId = c.postId; targetId = c.id; targetAuthorId = c.authorId;
  }
  const { ch, info, viewer } = await gatePost(userId, postId);
  if (!canComment(info, viewer)) throw forbidden();

  const where = "postId" in target ? { userId_postId: { userId, postId: target.postId } } : { userId_commentId: { userId, commentId: target.commentId } };
  const existing = await db.like.findUnique({ where });
  let liked: boolean;
  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await db.like.create({ data: "postId" in target ? { userId, postId: target.postId } : { userId, commentId: target.commentId } });
    liked = true;
    if (targetAuthorId !== userId) {
      // refId is stable per (liker, target): unlike + re-like can never farm points.
      await awardSafely({ userId: targetAuthorId, creatorId: ch.creatorId, kind: "like_received", refId: `${userId}:${targetId}`, sourceId: targetId });
    }
  }
  const likeCount = await db.like.count({ where: "postId" in target ? { postId: target.postId } : { commentId: target.commentId } });
  return { liked, likeCount };
}

/* ---------- moderation ---------- */

export async function banMember(actorUserId: string, creatorId: string, targetUserId: string): Promise<void> {
  const creator = await db.creator.findUnique({ where: { id: creatorId }, select: { userId: true } });
  if (!creator || creator.userId !== actorUserId) throw forbidden();
  if (targetUserId === creator.userId) throw new AppError("invalid", "You can't ban yourself.");
  const user = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!user) throw notFound();
  await db.communityBan.upsert({
    where: { creatorId_userId: { creatorId, userId: targetUserId } },
    create: { creatorId, userId: targetUserId },
    update: {},
  });
}

export async function unbanMember(creatorId: string, targetUserId: string): Promise<void> {
  await db.communityBan.deleteMany({ where: { creatorId, userId: targetUserId } });
}

export async function listBans(creatorId: string) {
  const rows = await db.communityBan.findMany({ where: { creatorId }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
  return rows.map((r) => ({ userId: r.userId, name: r.user.name, createdAt: r.createdAt }));
}
```

Note on `unbanMember`: it takes `creatorId` only because the calling server action already resolved the creator from the session via `requireCreator()` (so the id can only be the caller's). `banMember` additionally checks `actorUserId`, because it is also the function exercised directly in tests.

- [ ] **Step 4: Run test to verify it passes, plus typecheck**

Run: `npx vitest run src/lib/community/posts.test.ts && npm run typecheck`
Expected: PASS and clean types. Likely trip-ups: (a) pagination — the 25-post test needs `createdAt` ties broken by `id`, which the `orderBy` does; (b) `groupBy` typing on nullable `postId`/`commentId` — if tsc complains, cast the map keys with `as string` rather than loosening the query.

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/posts.ts src/lib/community/posts.test.ts
git commit -m "feat(community): posts, comments, likes, pinning, bans with server-side gating

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/lib/community/posts.ts src/lib/community/posts.test.ts
```

---

## Task 9: Member server actions

**Files:**
- Create: `src/app/actions/community.ts`

**Interfaces:**
- Consumes: `createPost`, `editPost`, `deletePost`, `addComment`, `deleteComment`, `toggleLike`, `setPinned` (`@/lib/community/posts`), `checkRate`, `requireUser`, `FormState` (`./auth`).
- Produces (used by Tasks 10–11 UI):
  - `createPostAction(channelId: string, prev: FormState, fd: FormData): Promise<FormState>` — fields `title`, `body`; returns `undefined` on success (so React resets the form).
  - `editPostAction(postId: string, prev: FormState, fd: FormData): Promise<FormState>` — fields `title`, `body`; returns `{ fields: { saved: "1" } }` on success.
  - `addCommentAction(postId: string, prev: FormState, fd: FormData): Promise<FormState>` — field `body`; `undefined` on success.
  - `deletePostAction(postId: string, goToChannel: boolean): Promise<void>`
  - `deleteCommentAction(commentId: string): Promise<void>`
  - `toggleLikeAction(kind: "post" | "comment", targetId: string): Promise<void>`
  - `setPinnedAction(postId: string, pinned: boolean): Promise<void>`

These are thin wrappers: validation, access and permission rules live in the service (Tasks 7–8) and are already tested. They get exercised end to end in Task 14's browser run.

- [ ] **Step 1: Write the actions**

Create `src/app/actions/community.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { checkRate } from "@/lib/community/limits";
import { addComment, createPost, deleteComment, deletePost, editPost, setPinned, toggleLike } from "@/lib/community/posts";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { FormState } from "./auth";

const idSchema = z.string().min(1).max(64);
const TOO_FAST = "You're going too fast. Wait a minute and try again.";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/** Dynamic-route patterns: revalidates every cached community page without looking up handle/slug. */
function refreshCommunity() {
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
  revalidatePath("/c/[handle]/community/leaderboard", "page");
}

function failState(e: unknown): FormState {
  if (e instanceof AppError) return { error: e.code === "not_found" ? "That's no longer available." : e.message };
  throw e;
}

export async function createPostAction(channelId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(channelId);
  if (!id.success) return { error: "Channel not found." };
  if (!checkRate("post", user.id)) return { error: TOO_FAST };
  try {
    await createPost(user.id, id.data, { title: str(fd, "title"), body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return undefined;
}

export async function editPostAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return { error: "Post not found." };
  try {
    await editPost(user.id, id.data, { title: str(fd, "title"), body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return { fields: { saved: "1" } };
}

export async function addCommentAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return { error: "Post not found." };
  if (!checkRate("comment", user.id)) return { error: TOO_FAST };
  try {
    await addComment(user.id, id.data, { body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return undefined;
}

export async function deletePostAction(postId: string, goToChannel: boolean) {
  const user = await requireUser();
  const id = idSchema.parse(postId);
  // Resolve the channel URL from the database BEFORE deleting; never from user input.
  const where = await db.post.findUnique({
    where: { id },
    select: { channel: { select: { slug: true, creator: { select: { handle: true } } } } },
  });
  try {
    await deletePost(user.id, id);
  } catch (e) {
    if (!(e instanceof AppError)) throw e; // not allowed / already gone: the refreshed page shows the truth
  }
  refreshCommunity();
  if (goToChannel && where) redirect(`/c/${where.channel.creator.handle}/community/${where.channel.slug}`);
}

export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  const id = idSchema.parse(commentId);
  try {
    await deleteComment(user.id, id);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refreshCommunity();
}

export async function toggleLikeAction(kind: "post" | "comment", targetId: string) {
  const user = await requireUser();
  const k = z.enum(["post", "comment"]).parse(kind);
  const id = idSchema.parse(targetId);
  if (!checkRate("like", user.id)) return; // silently ignore a flood of clicks
  try {
    await toggleLike(user.id, k === "post" ? { postId: id } : { commentId: id });
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refreshCommunity();
}

export async function setPinnedAction(postId: string, pinned: boolean) {
  const user = await requireUser();
  const id = idSchema.parse(postId);
  try {
    await setPinned(user.id, id, z.boolean().parse(pinned));
  } catch (e) {
    if (!(e instanceof AppError)) throw e; // e.g. the 3-pin limit: the post simply stays unpinned
  }
  refreshCommunity();
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/community.ts
git commit -m "feat(community): member server actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/app/actions/community.ts
```

---

## Task 10: Member UI: layout, channel feed, thread

**Files:**
- Create: `src/components/community/format.ts`, `src/components/community/ChannelNav.tsx`, `src/components/community/LikeButton.tsx`, `src/components/community/PostCard.tsx`, `src/components/community/PostComposer.tsx`, `src/components/community/CommentForm.tsx`, `src/components/community/EditPostForm.tsx`
- Create: `src/app/(site)/c/[handle]/community/layout.tsx`, `.../community/page.tsx`, `.../community/[channel]/page.tsx`, `.../community/[channel]/p/[postId]/page.tsx`

**Interfaces:**
- Consumes: Task 4 `canPost`; Task 7 `resolveCommunity`, `listChannelsFor`, `getChannelFor`, `ensureDefaultChannel`; Task 8 `listPosts`, `getThread`, `PostView`, `CommentView`; Task 9 actions; `banMemberAction(userId: string): Promise<void>` from Task 12 (create the file now with only that export if you build tasks in order; see Step 5).
- Produces: routes `/c/[handle]/community`, `/c/[handle]/community/[channel]`, `/c/[handle]/community/[channel]/p/[postId]`.

Page props are typed inline (not with generated `PageProps<...>`) so typecheck doesn't depend on `.next/types` being regenerated for new routes.

- [ ] **Step 1: Shared small components**

Create `src/components/community/format.ts`:

```ts
const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const stamp = (d: Date) => fmt.format(d);
```

Create `src/components/community/LikeButton.tsx`:

```tsx
import { toggleLikeAction } from "@/app/actions/community";

export function LikeButton({ kind, id, count, liked }: { kind: "post" | "comment"; id: string; count: number; liked: boolean }) {
  return (
    <form action={toggleLikeAction.bind(null, kind, id)}>
      <button
        type="submit"
        aria-pressed={liked}
        aria-label={liked ? `Remove like (${count})` : `Like (${count})`}
        className={`btn btn-sm transition-all duration-150 active:scale-[0.98] ${liked ? "btn-primary" : "btn-secondary"}`}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
          <path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6 2.1c0 4.5-6 8.1-6 8.1Z" strokeLinejoin="round" />
        </svg>
        <span className="tabular-nums">{count}</span>
      </button>
    </form>
  );
}
```

Create `src/components/community/ChannelNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { slug: string; name: string; kind: string; access: string };

export function ChannelNav({ handle, channels, showLeaderboard }: { handle: string; channels: Item[]; showLeaderboard: boolean }) {
  const path = usePathname();
  const base = `/c/${handle}/community`;
  const link = (href: string, label: string, hint?: string) => {
    const active = path === href || path.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-baseline justify-between gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
      >
        <span className="truncate">{label}</span>
        {hint && <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{hint}</span>}
      </Link>
    );
  };
  return (
    <nav aria-label="Community channels" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {channels.map((c) => link(`${base}/${c.slug}`, c.name, c.kind === "announcement" ? "News" : c.access === "product_gated" ? "Gated" : undefined))}
      {showLeaderboard && link(`${base}/leaderboard`, "Leaderboard")}
    </nav>
  );
}
```

Create `src/components/community/PostComposer.tsx`:

```tsx
"use client";

import { createPostAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";

export function PostComposer({ channelId }: { channelId: string }) {
  return (
    <ActionForm action={createPostAction.bind(null, channelId)} className="card space-y-3 px-5 pb-4 pt-5">
      <Field name="title" label="Title (optional)" />
      <Field name="body" label="Start a conversation" as="textarea" rows={4} required hint="Plain text, up to 2,000 characters." />
      <FormError />
      <div className="flex justify-end">
        <SubmitButton pendingText="Posting…">Post</SubmitButton>
      </div>
    </ActionForm>
  );
}
```

Create `src/components/community/CommentForm.tsx`:

```tsx
"use client";

import { addCommentAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";

export function CommentForm({ postId }: { postId: string }) {
  return (
    <ActionForm action={addCommentAction.bind(null, postId)} className="space-y-3">
      <Field name="body" label="Add a comment" as="textarea" rows={3} required hint="Plain text, up to 1,000 characters." />
      <FormError />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Posting…">Comment</SubmitButton>
    </ActionForm>
  );
}
```

Create `src/components/community/EditPostForm.tsx`:

```tsx
"use client";

import { editPostAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";

export function EditPostForm({ postId, title, body }: { postId: string; title: string; body: string }) {
  return (
    <ActionForm action={editPostAction.bind(null, postId)} className="space-y-3">
      <Field name="title" label="Title (optional)" defaultValue={title} />
      <Field name="body" label="Post" as="textarea" rows={5} defaultValue={body} required />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">Save changes</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
```

- [ ] **Step 2: `PostCard`**

Create `src/components/community/PostCard.tsx` (server component):

```tsx
import Link from "next/link";
import { deletePostAction, setPinnedAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { PostView } from "@/lib/community/posts";
import { stamp } from "./format";
import { LikeButton } from "./LikeButton";

export function PostCard({ post, href, viewerIsCreator, thread = false }: { post: PostView; href: string; viewerIsCreator: boolean; thread?: boolean }) {
  return (
    <article className={`card ${post.pinned ? "border-brand/40" : ""}`}>
      <div className="px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="text-sm font-semibold text-ink">{post.author.name}</span>
          {post.author.isCreator && <span className="badge badge-brand">Creator</span>}
          {post.pinned && <span className="badge badge-warn">Pinned</span>}
          <time dateTime={post.createdAt.toISOString()}>{stamp(post.createdAt)}</time>
          {post.editedAt && <span>edited</span>}
        </div>
        {post.title && (
          <h3 className="mt-2 text-lg font-bold leading-snug">
            {thread ? post.title : <Link href={href} className="transition-colors duration-150 hover:text-brand">{post.title}</Link>}
          </h3>
        )}
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
        <LikeButton kind="post" id={post.id} count={post.likeCount} liked={post.likedByMe} />
        {!thread && (
          <Link href={href} className="btn btn-ghost btn-sm">
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </Link>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {viewerIsCreator && (
            <form action={setPinnedAction.bind(null, post.id, !post.pinned)}>
              <button className="btn btn-secondary btn-sm active:scale-[0.98]">{post.pinned ? "Unpin" : "Pin"}</button>
            </form>
          )}
          {viewerIsCreator && !post.author.isCreator && (
            <form action={banMemberAction.bind(null, post.author.id)}>
              <ConfirmButton className="btn btn-danger btn-sm" message={`Remove ${post.author.name} from this community? They lose access to every channel until you unban them.`}>
                Ban author
              </ConfirmButton>
            </form>
          )}
          {post.canDelete && (
            <form action={deletePostAction.bind(null, post.id, thread)}>
              <ConfirmButton className="btn btn-danger btn-sm" message="Delete this post and its comments? Points earned from it are removed too.">Delete</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Layout and channel redirect page**

Create `src/app/(site)/c/[handle]/community/layout.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { ChannelNav } from "@/components/community/ChannelNav";
import { requireUser } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";

export default async function CommunityLayout({ children, params }: { children: React.ReactNode; params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser(`/c/${handle}/community`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const { creator, viewer } = ctx;
  if (viewer.isCreator) await ensureDefaultChannel(creator.id);
  const channels = await listChannelsFor(creator.id, viewer);

  return (
    <BrandScope color={creator.brandColor}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Community</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          <Link href={`/c/${creator.handle}`} className="transition-colors duration-150 hover:text-brand">{creator.displayName}</Link>
        </h1>

        {channels.length === 0 ? (
          <div className="card mt-6 max-w-xl px-6 py-8">
            <p className="text-lg font-semibold">{viewer.banned ? "You've been removed from this community" : "This community is for people who've bought from this creator"}</p>
            <p className="mt-1 text-sm text-muted">
              {viewer.banned
                ? "The creator has removed your access. Contact them if you think this is a mistake."
                : "Buy any of their products and the community opens up here straight away."}
            </p>
            {!viewer.banned && <Link href={`/c/${creator.handle}`} className="btn btn-primary mt-5">See what {creator.displayName} offers</Link>}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <ChannelNav
                handle={creator.handle}
                channels={channels.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind, access: c.access }))}
                showLeaderboard={creator.gamificationEnabled}
              />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        )}
      </div>
    </BrandScope>
  );
}
```

Create `src/app/(site)/c/[handle]/community/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";

export const metadata = { title: "Community" };

export default async function CommunityIndex({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser(`/c/${handle}/community`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) return null; // layout already rendered notFound
  const channels = await listChannelsFor(ctx.creator.id, ctx.viewer);
  if (channels.length > 0) redirect(`/c/${ctx.creator.handle}/community/${channels[0].slug}`);
  return null; // layout shows the "no access" panel
}
```

- [ ] **Step 4: Channel feed page**

Create `src/app/(site)/c/[handle]/community/[channel]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { canPost } from "@/lib/community/access";
import { getChannelFor } from "@/lib/community/channels";
import { listPosts } from "@/lib/community/posts";
import { resolveCommunity } from "@/lib/community/viewer";

export const metadata: Metadata = { title: "Community" };

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; channel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle, channel: slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/c/${handle}/community/${slug}`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const { creator, viewer } = ctx;
  const channel = await getChannelFor(creator.id, slug, viewer);
  if (!channel) notFound(); // missing OR no access: same answer
  const cursor = typeof sp.cursor === "string" ? sp.cursor.slice(0, 64) : undefined;
  const { posts, nextCursor } = await listPosts({ creatorId: creator.id, channelId: channel.id, userId: user.id, cursor });
  const base = `/c/${creator.handle}/community/${channel.slug}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold">{channel.name}</h2>
          {channel.description && <p className="text-sm text-muted">{channel.description}</p>}
        </div>
        <div className="flex gap-2">
          <span className="badge badge-muted">{channel.kind === "announcement" ? "Announcements" : "Discussion"}</span>
          <span className="badge badge-muted">{channel.access === "open" ? "All customers" : "Selected products"}</span>
        </div>
      </div>

      {canPost(channel, viewer) ? (
        <PostComposer channelId={channel.id} />
      ) : (
        <p className="card px-5 py-4 text-sm text-muted">Only {creator.displayName} posts here. You can still comment and like.</p>
      )}

      {posts.length === 0 ? (
        <Empty title="No posts yet" body={canPost(channel, viewer) ? "Be the first to post." : "Check back soon."} />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} href={`${base}/p/${p.id}`} viewerIsCreator={viewer.isCreator} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Link href={`${base}?cursor=${encodeURIComponent(nextCursor)}`} className="btn btn-secondary">Older posts</Link>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Thread page, and the one admin action PostCard imports**

`PostCard` imports `banMemberAction` from `@/app/actions/community-admin`. Task 12 owns that file; to keep this task's typecheck green, create the file now with just this export (Task 12 extends it, keeping this function unchanged):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import { banMember } from "@/lib/community/posts";
import { AppError } from "@/lib/errors";

export async function banMemberAction(userId: string) {
  const { user, creator } = await requireCreator();
  try {
    await banMember(user.id, creator.id, userId);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  revalidatePath("/dashboard/community");
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
}
```

Create `src/app/(site)/c/[handle]/community/[channel]/p/[postId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction } from "@/app/actions/community";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CommentForm } from "@/components/community/CommentForm";
import { EditPostForm } from "@/components/community/EditPostForm";
import { stamp } from "@/components/community/format";
import { LikeButton } from "@/components/community/LikeButton";
import { PostCard } from "@/components/community/PostCard";
import { requireUser } from "@/lib/auth/session";
import { getThread } from "@/lib/community/posts";
import { resolveCommunity } from "@/lib/community/viewer";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Community post" };

export default async function ThreadPage({ params }: { params: Promise<{ handle: string; channel: string; postId: string }> }) {
  const { handle, channel: slug, postId } = await params;
  const user = await requireUser(`/c/${handle}/community/${slug}/p/${postId}`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(user.id, postId);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  // The URL must describe the post's real creator and channel; otherwise it's someone else's link.
  if (thread.channel.creatorId !== ctx.creator.id || thread.channel.slug !== slug) notFound();
  const { post, comments } = thread;
  const back = `/c/${ctx.creator.handle}/community/${slug}`;

  return (
    <div className="space-y-4">
      <Link href={back} className="text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">← {thread.channel.name}</Link>
      <PostCard post={post} href="" viewerIsCreator={ctx.viewer.isCreator} thread />

      {post.canEdit && (
        <details className="card px-5 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Edit your post</summary>
          <div className="mt-3"><EditPostForm postId={post.id} title={post.title} body={post.body} /></div>
        </details>
      )}

      <section aria-label="Comments" className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">{comments.length} {comments.length === 1 ? "comment" : "comments"}</h3>
        {comments.map((c) => (
          <div key={c.id} className="card px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="text-sm font-semibold text-ink">{c.author.name}</span>
              {c.author.isCreator && <span className="badge badge-brand">Creator</span>}
              <time dateTime={c.createdAt.toISOString()}>{stamp(c.createdAt)}</time>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <LikeButton kind="comment" id={c.id} count={c.likeCount} liked={c.likedByMe} />
              {c.canDelete && (
                <form action={deleteCommentAction.bind(null, c.id)} className="ml-auto">
                  <ConfirmButton className="btn btn-danger btn-sm" message="Delete this comment?">Delete</ConfirmButton>
                </form>
              )}
            </div>
          </div>
        ))}
        <div className="card px-5 pb-4 pt-5"><CommentForm postId={post.id} /></div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npx eslint "src/app/(site)/c/[handle]/community" src/components/community src/app/actions/community.ts src/app/actions/community-admin.ts`
Expected: no errors. (If ESLint flags the `<a>`/`Link` or unused `href` prop on the thread `PostCard`, keep `href` required and pass `""`; it is unused when `thread` is true.)

- [ ] **Step 7: Commit**

```bash
git add src/components/community "src/app/(site)/c/[handle]/community" src/app/actions/community-admin.ts
git commit -m "feat(community): member pages: channels, feed, threads, comments, likes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/components/community "src/app/(site)/c/[handle]/community" src/app/actions/community-admin.ts
```

---

## Task 11: Gamification UI + entry points

**Files:**
- Create: `src/components/community/MemberCard.tsx`, `src/app/(site)/c/[handle]/community/leaderboard/page.tsx`
- Modify: `src/app/(site)/c/[handle]/community/layout.tsx`, `src/app/(site)/c/[handle]/page.tsx` (storefront link), `src/app/(site)/library/[productId]/page.tsx` (community link)

**Interfaces:**
- Consumes: Task 5 `getProfile`, `getLeaderboard`; Task 3 `BADGES`.
- Produces: the `MemberCard` (level, points, streak, badges) beside every channel for members; `/c/[handle]/community/leaderboard` with `?period=week|all`.

- [ ] **Step 1: `MemberCard`**

Create `src/components/community/MemberCard.tsx`:

```tsx
import Link from "next/link";
import { BADGES } from "@/lib/gamification/badges";
import type { getProfile } from "@/lib/gamification/service";

type Profile = Awaited<ReturnType<typeof getProfile>>;

export function MemberCard({ profile, leaderboardHref }: { profile: Profile; leaderboardHref: string }) {
  const { level, points, streak, badges } = profile;
  const pct = Math.min(100, Math.round((level.into / level.span) * 100));
  const earned = new Set(badges.map((b) => b.key));
  return (
    <section aria-label="Your progress" className="card px-5 pb-5 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your level</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{level.level}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${level.level + 1}`}>
        <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted tabular-nums">{points} points · {level.next - points} to level {level.level + 1}</p>

      <p className="mt-4 text-sm font-semibold tabular-nums">{streak > 0 ? `${streak}-day streak` : "No active streak"}</p>
      <p className="text-xs text-muted">Complete a lesson today to {streak > 0 ? "keep it going" : "start one"}.</p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Badges</p>
      <ul className="flex flex-wrap gap-1.5">
        {BADGES.map((b) => (
          <li key={b.key} title={b.description} className={`badge ${earned.has(b.key) ? "badge-brand" : "badge-muted opacity-60"}`}>
            {b.label}
          </li>
        ))}
      </ul>
      <Link href={leaderboardHref} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">View leaderboard</Link>
    </section>
  );
}
```

- [ ] **Step 2: Show it in the layout**

In `src/app/(site)/c/[handle]/community/layout.tsx`:

Add imports:

```tsx
import { MemberCard } from "@/components/community/MemberCard";
import { getProfile } from "@/lib/gamification/service";
```

After `const channels = ...` add:

```tsx
  const profile = creator.gamificationEnabled && !viewer.isCreator && channels.length > 0 ? await getProfile(user.id, creator.id) : null;
```

Replace the grid wrapper and aside with:

```tsx
          <div className={`mt-6 grid gap-6 ${profile ? "lg:grid-cols-[200px_minmax(0,1fr)_240px]" : "lg:grid-cols-[200px_minmax(0,1fr)]"}`}>
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <ChannelNav
                handle={creator.handle}
                channels={channels.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind, access: c.access }))}
                showLeaderboard={creator.gamificationEnabled}
              />
            </aside>
            <div className="min-w-0">{children}</div>
            {profile && (
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <MemberCard profile={profile} leaderboardHref={`/c/${creator.handle}/community/leaderboard`} />
              </aside>
            )}
          </div>
```

- [ ] **Step 3: Leaderboard page**

Create `src/app/(site)/c/[handle]/community/leaderboard/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";
import { getLeaderboard } from "@/lib/gamification/service";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/c/${handle}/community/leaderboard`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx || !ctx.creator.gamificationEnabled) notFound();
  if ((await listChannelsFor(ctx.creator.id, ctx.viewer)).length === 0) notFound(); // members only
  const period = sp.period === "all" ? "all" : "week";
  const lb = await getLeaderboard(ctx.creator.id, period, user.id);
  const base = `/c/${ctx.creator.handle}/community/leaderboard`;
  const tab = (p: "week" | "all", label: string) => (
    <Link
      href={`${base}?period=${p}`}
      aria-current={period === p ? "page" : undefined}
      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${period === p ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Leaderboard</h2>
          <p className="text-sm text-muted">Points from lessons, quizzes, courses and community activity. Weeks start Monday, IST.</p>
        </div>
        <div className="flex gap-1">{tab("week", "This week")}{tab("all", "All time")}</div>
      </div>

      {lb.top.length === 0 ? (
        <Empty title="No points yet" body="Complete a lesson or start a conversation to get on the board." />
      ) : (
        <ol className="card divide-y divide-line">
          {lb.top.map((r) => (
            <li key={r.userId} className={`flex items-center gap-4 px-5 py-3 ${r.userId === user.id ? "bg-brand-soft/60" : ""}`}>
              <span className="w-7 text-right text-sm font-bold tabular-nums text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.userId === user.id && <span className="ml-2 text-xs font-medium text-muted">you</span>}</span>
              <span className="badge badge-muted tabular-nums">Level {r.level}</span>
              <span className="w-16 text-right font-bold tabular-nums">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
      {lb.me && !lb.top.some((r) => r.userId === user.id) && (
        <p className="card px-5 py-3 text-sm">You&apos;re ranked <span className="font-bold tabular-nums">#{lb.me.rank}</span> with <span className="font-bold tabular-nums">{lb.me.points}</span> points.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Entry points**

In `src/app/(site)/c/[handle]/page.tsx`: extend `getCreator`'s `include` with `_count: { select: { channels: true } }`, and inside the header `div` that holds the bio line, after the product-count `<p>` add:

```tsx
            {creator._count.channels > 0 && (
              <Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm mt-3">Community</Link>
            )}
```

In `src/app/(site)/library/[productId]/page.tsx`: in the header flex row (the one with the `Invoice` link) replace `{order && <Link ...>Invoice</Link>}` with:

```tsx
        <div className="flex items-center gap-4">
          <Link className="text-sm font-semibold text-brand hover:underline" href={`/c/${course.product.creator.handle}/community`}>Community</Link>
          {order && <Link className="text-sm font-semibold text-brand hover:underline" href={`/orders/${order.orderId}/invoice`}>Invoice</Link>}
        </div>
```

- [ ] **Step 5: Typecheck, lint, run all tests**

Run: `npm run typecheck && npm run lint && npm test`
Expected: clean types, lint passes, all tests pass (357 baseline + new).

- [ ] **Step 6: Commit**

```bash
git add src/components/community/MemberCard.tsx "src/app/(site)/c/[handle]/community" "src/app/(site)/c/[handle]/page.tsx" "src/app/(site)/library/[productId]/page.tsx"
git commit -m "feat(gamification): member card, leaderboard page, community entry points

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/components/community/MemberCard.tsx "src/app/(site)/c/[handle]/community" "src/app/(site)/c/[handle]/page.tsx" "src/app/(site)/library/[productId]/page.tsx"
```

---

## Task 12: Creator console (channels, gating, bans, gamification toggle)

**Files:**
- Modify: `src/app/actions/community-admin.ts` (keep `banMemberAction` exactly as created in Task 10; add the rest)
- Create: `src/components/community/ChannelForm.tsx`, `src/app/dashboard/(console)/community/page.tsx`
- Modify: `src/components/DashNav.tsx`

**Interfaces:**
- Consumes: Task 7 `createChannel`, `updateChannel`, `deleteChannel`, `setChannelProducts`, `moveChannel`, `listChannelsAdmin`; Task 8 `unbanMember`, `listBans`; Task 5 `backfillPoints`.
- Produces (all `requireCreator()`-scoped): `createChannelAction`, `updateChannelAction(channelId, prev, fd)`, `deleteChannelAction(channelId)`, `moveChannelAction(channelId, dir)`, `unbanMemberAction(userId)`, `setGamificationAction(enabled)`, `recalculatePointsAction()`.

- [ ] **Step 1: Extend the admin actions**

Replace the contents of `src/app/actions/community-admin.ts` with:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth/session";
import { createChannel, deleteChannel, moveChannel, setChannelProducts, updateChannel } from "@/lib/community/channels";
import { banMember, unbanMember } from "@/lib/community/posts";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { backfillPoints } from "@/lib/gamification/service";
import type { FormState } from "./auth";

const idSchema = z.string().min(1).max(64);
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const productIds = (fd: FormData) => fd.getAll("productIds").filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 64);
const channelInput = (fd: FormData) => ({ name: str(fd, "name"), description: str(fd, "description"), kind: str(fd, "kind"), access: str(fd, "access") });

function refresh() {
  revalidatePath("/dashboard/community");
  revalidatePath("/c/[handle]/community", "layout");
}
function failState(e: unknown): FormState {
  if (e instanceof AppError) return { error: e.code === "not_found" ? "That channel or product no longer exists." : e.message };
  throw e;
}

export async function createChannelAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  try {
    const ch = await createChannel(creator.id, channelInput(fd));
    if (ch.access === "product_gated") await setChannelProducts(creator.id, ch.id, productIds(fd));
  } catch (e) {
    return failState(e);
  }
  refresh();
  return undefined;
}

export async function updateChannelAction(channelId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const id = idSchema.safeParse(channelId);
  if (!id.success) return { error: "Channel not found." };
  try {
    const ch = await updateChannel(creator.id, id.data, channelInput(fd));
    await setChannelProducts(creator.id, ch.id, ch.access === "product_gated" ? productIds(fd) : []);
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { fields: { saved: "1" } };
}

export async function deleteChannelAction(channelId: string) {
  const { creator } = await requireCreator();
  try {
    await deleteChannel(creator.id, idSchema.parse(channelId));
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
}

export async function moveChannelAction(channelId: string, dir: "up" | "down") {
  const { creator } = await requireCreator();
  try {
    await moveChannel(creator.id, idSchema.parse(channelId), z.enum(["up", "down"]).parse(dir));
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
}

export async function banMemberAction(userId: string) {
  const { user, creator } = await requireCreator();
  try {
    await banMember(user.id, creator.id, idSchema.parse(userId));
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
}

export async function unbanMemberAction(userId: string) {
  const { creator } = await requireCreator();
  await unbanMember(creator.id, idSchema.parse(userId));
  refresh();
}

/** Turning it on also replays existing progress so learners who already finished things aren't left at zero. */
export async function setGamificationAction(enabled: boolean) {
  const { creator } = await requireCreator();
  const on = z.boolean().parse(enabled);
  await db.creator.update({ where: { id: creator.id }, data: { gamificationEnabled: on } });
  if (on) await backfillPoints(creator.id);
  refresh();
}

export async function recalculatePointsAction() {
  const { creator } = await requireCreator();
  if (creator.gamificationEnabled) await backfillPoints(creator.id);
  refresh();
}
```

- [ ] **Step 2: `ChannelForm`**

Create `src/components/community/ChannelForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SavedNote, SubmitButton, useFormValues } from "@/components/form";

type Channel = { name: string; description: string; kind: string; access: string; productIds: string[] };
type ProductOption = { id: string; title: string };

function Fields({ channel, products }: { channel?: Channel; products: ProductOption[] }) {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  const access = picked ?? submitted?.access ?? channel?.access ?? "open";
  return (
    <>
      <Field name="name" label="Channel name" defaultValue={channel?.name} placeholder="Masterclass Q&A" required />
      <Field name="description" label="Description" defaultValue={channel?.description} hint="One line, shown above the feed." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="kind" label="Type" as="select" defaultValue={channel?.kind ?? "discussion"}>
          <option value="discussion">Discussion: everyone can post</option>
          <option value="announcement">Announcements: only you post</option>
        </Field>
        <Field name="access" label="Who can join" as="select" defaultValue={access} onChange={setPicked}>
          <option value="open">Everyone who has bought from me</option>
          <option value="product_gated">Buyers of selected products</option>
        </Field>
      </div>
      {access === "product_gated" && (
        <fieldset className="rounded-xl border border-line px-4 py-3">
          <legend className="px-1 text-sm font-semibold">Products that unlock this channel</legend>
          {products.length === 0 ? (
            <p className="text-sm text-muted">Create a product first.</p>
          ) : (
            <ul className="space-y-1.5">
              {products.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="productIds" value={p.id} defaultChecked={channel?.productIds.includes(p.id)} />
                    {p.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="hint mt-2">With none ticked, only you can see this channel.</p>
        </fieldset>
      )}
    </>
  );
}

export function ChannelForm({ action, channel, products, submitLabel }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  channel?: Channel;
  products: ProductOption[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-3">
      <Fields channel={channel} products={products} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
```

- [ ] **Step 3: Console page and nav link**

Create `src/app/dashboard/(console)/community/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  createChannelAction, deleteChannelAction, moveChannelAction, recalculatePointsAction, setGamificationAction,
  unbanMemberAction, updateChannelAction,
} from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ChannelForm } from "@/components/community/ChannelForm";
import { PageHeader, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsAdmin } from "@/lib/community/channels";
import { listBans } from "@/lib/community/posts";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityConsole() {
  const { creator } = await requireCreator();
  await ensureDefaultChannel(creator.id);
  const [channels, products, bans] = await Promise.all([
    listChannelsAdmin(creator.id),
    db.product.findMany({ where: { creatorId: creator.id }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
    listBans(creator.id),
  ]);
  return (
    <>
      <PageHeader
        title="Community"
        sub="Channels your customers talk in. Open to every buyer, or limited to buyers of chosen products."
        action={<Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm">Open community ↗</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="space-y-3" aria-label="Channels">
            {channels.map((c, i) => (
              <div key={c.id} className="card">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
                    <span className="font-semibold">{c.name}</span>
                    <span className="badge badge-muted">{c.kind === "announcement" ? "Announcements" : "Discussion"}</span>
                    <span className="badge badge-muted">{c.access === "open" ? "All buyers" : `${c.productIds.length} product${c.productIds.length === 1 ? "" : "s"}`}</span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{c.postCount} {c.postCount === 1 ? "post" : "posts"}</span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-5 pb-5 pt-4">
                    <ChannelForm action={updateChannelAction.bind(null, c.id)} channel={c} products={products} submitLabel="Save channel" />
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <form action={moveChannelAction.bind(null, c.id, "up")}><button className="btn btn-secondary btn-sm" disabled={i === 0}>Move up</button></form>
                      <form action={moveChannelAction.bind(null, c.id, "down")}><button className="btn btn-secondary btn-sm" disabled={i === channels.length - 1}>Move down</button></form>
                      <form action={deleteChannelAction.bind(null, c.id)} className="ml-auto">
                        <ConfirmButton className="btn btn-danger btn-sm" message={`Delete "${c.name}" and all ${c.postCount} of its posts? This can't be undone.`}>Delete</ConfirmButton>
                      </form>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </section>

          <section className="card px-5 pb-5 pt-4" aria-label="Banned members">
            <h2 className="font-semibold">Banned members</h2>
            <p className="text-sm text-muted">Banned people can't see any channel. Ban someone from their post.</p>
            {bans.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nobody is banned.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {bans.map((b) => (
                  <li key={b.userId} className="flex items-center gap-3 py-2.5">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted">since {dateFmt(b.createdAt)}</span>
                    <form action={unbanMemberAction.bind(null, b.userId)} className="ml-auto"><button className="btn btn-secondary btn-sm">Unban</button></form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="card px-5 pb-5 pt-4">
            <h2 className="mb-3 font-semibold">New channel</h2>
            <ChannelForm action={createChannelAction} products={products} submitLabel="Create channel" />
          </section>

          <section className="card px-5 pb-5 pt-4" aria-label="Gamification">
            <h2 className="font-semibold">Points, levels and badges</h2>
            <p className="mt-1 text-sm text-muted">
              Learners earn points for lessons, quizzes, finishing a course and taking part in the community. {creator.gamificationEnabled ? "It's on." : "It's off: nothing is awarded and the leaderboard is hidden."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setGamificationAction.bind(null, !creator.gamificationEnabled)}>
                <button className="btn btn-secondary btn-sm">{creator.gamificationEnabled ? "Turn off" : "Turn on"}</button>
              </form>
              {creator.gamificationEnabled && (
                <form action={recalculatePointsAction}>
                  <button className="btn btn-secondary btn-sm" title="Replays existing lesson and quiz progress. Safe to repeat: nothing is awarded twice.">Recalculate from progress</button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
```

In `src/components/DashNav.tsx` add this entry to `links` right after the `Learners` entry:

```tsx
  { href: "/dashboard/community", label: "Community" },
```

- [ ] **Step 4: Typecheck, lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. (If ESLint complains about the unescaped apostrophe in `can't`, use `&apos;`.)

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/community-admin.ts src/components/community/ChannelForm.tsx "src/app/dashboard/(console)/community/page.tsx" src/components/DashNav.tsx
git commit -m "feat(community): creator console for channels, gating, bans and gamification

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- src/app/actions/community-admin.ts src/components/community/ChannelForm.tsx "src/app/dashboard/(console)/community/page.tsx" src/components/DashNav.tsx
```

---

## Task 13: Seed data and spec build notes

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `docs/superpowers/specs/2026-10-15-tysonpe-community-design.md`

- [ ] **Step 1: Seed a demo community**

In `prisma/seed.ts`, immediately before the first `console.log("Seeded. ...")` line add:

```ts
  // Demo community: open #general, a creator-only announcements channel, and a channel gated to the flagship course.
  if ((await db.channel.count({ where: { creatorId: creator.id } })) === 0) {
    const general = await db.channel.create({
      data: { creatorId: creator.id, name: "General", slug: "general", description: "Say hello and ask anything.", position: 0 },
    });
    const news = await db.channel.create({
      data: { creatorId: creator.id, name: "Announcements", slug: "announcements", description: "Updates from Asha.", kind: "announcement", position: 1 },
    });
    const qa = await db.channel.create({
      data: {
        creatorId: creator.id, name: "Masterclass Q&A", slug: "masterclass-q-a", description: "Questions about the Personal Finance Masterclass.",
        access: "product_gated", position: 2, products: { create: [{ productId: course.id }] },
      },
    });
    await db.post.createMany({
      data: [
        { channelId: news.id, authorId: asha.id, title: "Welcome to the community", body: "This is where we talk money and answer questions. Be kind, stay curious.", pinned: true },
        { channelId: general.id, authorId: learner.id, body: "Finished week 1. The 50-30-20 worksheet made my budget click." },
        { channelId: qa.id, authorId: learner.id, title: "SIP date vs salary date?", body: "Should my SIP date match my salary date, or a few days later?" },
      ],
    });
  }
```

- [ ] **Step 2: Record build notes in the spec**

Append to `docs/superpowers/specs/2026-10-15-tysonpe-community-design.md` (after the "Success criteria" section) a new section:

```markdown

## Build notes

- The creator earns no points and is excluded from leaderboards (they are not a member of their own community). Banned members are excluded from the leaderboard too.
- Points are awarded after the learning transaction commits, best-effort (`lib/gamification/hooks.ts`). A failure is logged and never fails the learner's action; `backfillPoints` (Recalculate in the creator console) repairs gaps.
- `like_received` uses `refId = "{likerId}:{targetId}"`: unlike then re-like never awards twice, and a self-like awards nothing.
- Deleting a post removes `PointEvent` rows whose `sourceId` is the post, its comments, or the likes it received.
- Product slug `community` and channel slugs `leaderboard`/`new` are reserved so fixed routes can't be shadowed.
- The leaderboard computes ranks in memory over all earners in the period (one grouped query); fine for thousands of members, revisit with SQL window functions on Postgres.
- Community posts have no uploads, mentions or notifications; see limits above.
```

- [ ] **Step 3: Run the seed against a throwaway copy, then commit**

Run:

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe" && npx tsc --noEmit -p . 2>&1 | head -5; echo "typecheck done"
```

Expected: no errors from `prisma/seed.ts`. (Do **not** run the seed against `prisma/dev.db` yet: Task 14 applies the migration to the dev DB first.)

```bash
git add prisma/seed.ts docs/superpowers/specs/2026-10-15-tysonpe-community-design.md
git commit -m "feat(community): seed demo channels and spec build notes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- prisma/seed.ts docs/superpowers/specs/2026-10-15-tysonpe-community-design.md
```

---

## Task 14: Full verification (tests, types, lint, build, drift, real browser)

**Files:** none (verification only; fix anything found in the files that own it, with a failing test first where the bug is in logic).

- [ ] **Step 1: Automated gate**

Run each and read the real output:

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe"
npm test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "Test Files|Tests "
npm run typecheck
npm run lint
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
npm run build 2>&1 | tail -30
```

Expected: all tests pass (357 baseline + new community/gamification tests); typecheck and lint clean; `No difference detected.`; build succeeds and lists the new routes (`/c/[handle]/community`, `/c/[handle]/community/[channel]`, `.../p/[postId]`, `.../leaderboard`, `/dashboard/community`). If the build fails because another worker's uncommitted landing-page files are broken, confirm with `git stash`-free evidence (`git diff --stat` on their files vs. your errors) and report it; do not fix or commit their files.

- [ ] **Step 2: Mutation check: prove the access tests can fail**

Temporarily change `canAccessChannel` in `src/lib/community/access.ts` so the gated branch returns `true` (`return true;` as its last line). Run `npx vitest run src/lib/community`. Expected: several tests FAIL (access matrix, gated secrecy, posts access). Revert the change (`git checkout -- src/lib/community/access.ts`) and re-run to confirm green again.

Likewise temporarily remove the daily-cap `if (today >= rule.dailyCap) return none;` line in `src/lib/gamification/service.ts`; `npx vitest run src/lib/gamification/service.test.ts` must FAIL on the cap test. Revert (`git checkout -- src/lib/gamification/service.ts`).

- [ ] **Step 3: Apply the migration to the dev database and seed**

```bash
cd "/Users/manojaaa/Tysonpe- Sandbox/tysonpe" && npx prisma migrate deploy && npm run db:seed
```

Expected: `Applying migration 20261015120000_community`, then the seed prints its "Seeded." lines. Seeding is idempotent; the community block only runs when the creator has no channels.

- [ ] **Step 4: Make sure the dev server runs the new code**

The app serves on port 3100 (port 3000 is the CSO dashboard). Another worker may have a `next dev` already running; the regenerated Prisma client requires a restart to be seen. Check: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/`. If the dev server is up, tell the user it needs a restart for the new Prisma client and ask before restarting it. If it is down, start it with `npm run dev` in the background.

- [ ] **Step 5: Browser walkthrough (Claude Browser pane, `http://localhost:3100`)**

Use the login page's one-click demo buttons (local dev accounts from `prisma/seed.ts`). Verify each with `read_page` / `get_page_text`, not screenshots alone; take a screenshot for each of 5, 9 and 12.

1. **Creator console.** Log in as the creator → `/dashboard/community`. Expect 3 seeded channels (General, Announcements, Masterclass Q&A with "1 product"). Create a channel "VIP" with access "Buyers of selected products" and tick the course → appears in the list. Edit its description → "Saved". Move it up/down → order changes. Open the form on an existing channel and switch it to "Everyone who has bought from me" → saves, product ticks gone.
2. **Member feed.** Log out, log in as the learner (Ravi) → `/library` → open the course → "Community" link → lands on `/c/asha-rao/community/general`. Left nav shows General, Announcements, Masterclass Q&A (gated seeded to his course), VIP if linked. Right column shows level 1 and 0 points.
3. **Post, comment, like.** Post a message → it appears at the top, the composer clears, points show 5. Open the post → add a comment → count 1, points 7. Like another member's post (seeded Asha announcement from the Announcements channel) → button shows pressed.
4. **Plain text.** Post `<b>hi</b><script>alert(1)</script>` → it renders literally as text, no bold, no dialog.
5. **Announcements.** In Announcements the composer is replaced by "Only Asha Rao posts here"; commenting still works. Screenshot.
6. **Stranger.** Sign up a fresh local test user (a throwaway local account on localhost is allowed here), visit `/c/asha-rao/community` → "This community is for people who've bought from this creator" and no channel names. Visit `/c/asha-rao/community/masterclass-q-a` directly → 404 page. Visit the post URL of a gated post → 404.
7. **Moderation.** As the creator: in General pin the learner's post (it moves to the top with a "Pinned" badge); try pinning a 4th post (it stays unpinned); delete a comment; "Ban author" on the learner's post → confirm. As the learner reload → "You've been removed from this community". As the creator → `/dashboard/community` lists the ban → Unban → learner has access again.
8. **Refund removes access.** As the creator open `/dashboard/orders`, refund the learner's course order. As the learner, `/c/asha-rao/community` → no-access panel. (Re-enrol by re-running `npm run db:seed` only if later steps need the learner.)
9. **Gamification.** As the learner (re-enrolled), complete a lesson in the course → community card shows +10 and the "First lesson" badge lit; `/c/asha-rao/community/leaderboard` lists the learner as "Ravi K." (never the email), tabs "This week" and "All time" both work. Screenshot.
10. **Toggle off.** As the creator, `/dashboard/community` → "Turn off" gamification → the learner's community page has no member card and no Leaderboard link; the leaderboard URL 404s. Turn it back on.
11. **Responsive.** Resize to mobile (375px) on the feed: channel nav scrolls horizontally, no horizontal page scroll, buttons wrap. Reset to desktop afterwards.
12. **Console and network.** `read_console_messages` and `read_network_requests`: no errors, no 500s.

- [ ] **Step 6: Record results**

Write the actual outcomes (test counts, build output summary, each walkthrough step pass/fail) into the task report. Fix any failures: a logic bug gets a failing test first.

---

## Task 15: Review gate and wrap-up

**Files:** none new.

- [ ] **Step 1: Code review (real agent, opus)**

Dispatch the `code-reviewer` agent with: "Review the community + gamification work (commits from `feat(community): schema…` through `feat(community): seed demo channels`) in `/Users/manojaaa/Tysonpe- Sandbox/tysonpe` against `docs/superpowers/specs/2026-10-15-tysonpe-community-design.md`. Focus: server-side access enforcement on every read/write, secrecy of gated channels, point idempotency and caps, XSS (plain text only), rate limits, migration vs schema, anything in the diff that touches another worker's files." Read-only. Fix every blocker/major finding (test first for logic bugs); re-run the reviewer until verdict APPROVE. Typical rounds in this repo: 2–3.

- [ ] **Step 2: Security pass**

Run `/security-review` on the branch diff (auth/permissions touched: access control, bans, server actions). Fix findings the same way.

- [ ] **Step 3: Design pass**

Run `/design-review` on the live pages (`/c/asha-rao/community/general`, the thread page, `/c/asha-rao/community/leaderboard`, `/dashboard/community`) at desktop and 375px. Fix real issues only (contrast, focus, spacing, reduced motion); keep within `CLAUDE.md`'s rules.

- [ ] **Step 4: Final gate and state**

Re-run the full gate from Task 14 Step 1. Then:

- Update `/Users/manojaaa/.claude/projects/-Users-manojaaa-Tysonpe--Sandbox/memory/project_tysonpe-status.md`: sub-project 3 done (commit hashes), remaining 4–7, known limits (no notifications, no uploads, leaderboard shows "First L." with no opt-out, points kept on refund, per-process rate limits).
- Write the CSO checkpoint (`node "/Users/manojaaa/Agents and Skills/.cso/checkpoint/log-session.cjs" '{...}'`), run `Skill("cso-learn")`, and tell the user what shipped, what was verified, and what is still open (the other worker's uncommitted files, listed in Global Constraints, were never touched).

---

## Self-review (spec coverage)

| Spec requirement | Task |
|---|---|
| Channels: name, slug, kind, access, position; announcement rule | 1, 4, 7, 10 |
| Membership = Enrollment; refund ends access | 7 (`loadViewer`), 8 (refund test), 14.8 |
| Access open / gated / gated-with-no-products / creator / banned | 4, 7, 8 |
| Posts plain text, limits, edit own, creator delete/pin (max 3)/ban | 4, 8, 10, 12 |
| Comments one level, likes toggle | 8, 10 |
| Feed order, pinned first, cursor pagination 20 | 8, 10 |
| Default `#general` lazily | 7, 10 (layout), 12 (console) |
| Points ledger, rules, caps, idempotency, refId rules | 2, 5, 6, 8 |
| Delete removes points (`sourceId`) | 8 |
| Levels incl. above L10 | 2 |
| Badges (5) | 3, 5 |
| Streak (IST, live today/yesterday) | 3, 5 |
| Leaderboard week/all, top 20 + own rank, "First L.", no email | 3, 5, 11 |
| Creator toggle `gamificationEnabled` | 1, 5, 12 |
| Learning hooks post-commit, best-effort, backfill | 5, 6, 12 |
| Rate limits 5/20/60 per minute | 4, 9 |
| Server-side access, `not_found` not `forbidden`, no email serialised | 7, 8, 10 |
| Product slug `community` reserved / channel slugs reserved | 7 |
| Routes + dashboard section + entry points | 10, 11, 12 |
| Tests incl. access matrix, caps, streak edges, week bounds, secrecy, refund, backfill | 2–8 |
| Browser walkthrough | 14 |
| Honest limits (no real-time, uploads, notifications, DMs, challenges, refund keeps points) | spec; nothing built for them |

Type/name consistency checked across tasks: `awardPoints`/`AwardInput`, `awardSafely`, `onLearningProgress`, `ChannelView.productIds`, `PostView`/`CommentView`, `loadViewer`/`resolveCommunity`, `checkRate("post"|"comment"|"like")`, `banMemberAction`/`unbanMemberAction`. Deliberate spec addition: the creator earns no points (recorded in the spec's build notes, Task 13).
