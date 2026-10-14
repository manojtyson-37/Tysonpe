-- Attempt numbers: 1,2,3… per (quiz, learner). The unique index lets the database, not read-then-write
-- code, enforce the attempt cap under concurrency (and on Postgres, which doesn't serialise writers).
ALTER TABLE "QuizAttempt" ADD COLUMN "attemptNo" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows in chronological order (ties broken by id).
UPDATE "QuizAttempt" SET "attemptNo" = (
  SELECT COUNT(*) FROM "QuizAttempt" b
  WHERE b."quizId" = "QuizAttempt"."quizId" AND b."userId" = "QuizAttempt"."userId"
    AND (b."createdAt" < "QuizAttempt"."createdAt" OR (b."createdAt" = "QuizAttempt"."createdAt" AND b."id" <= "QuizAttempt"."id"))
);

CREATE UNIQUE INDEX "QuizAttempt_quizId_userId_attemptNo_key" ON "QuizAttempt"("quizId", "userId", "attemptNo");
