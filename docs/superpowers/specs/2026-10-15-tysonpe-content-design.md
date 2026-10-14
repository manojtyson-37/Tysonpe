# Tysonpe — Content (Sub-project 2)

Builds on [core commerce](2026-10-15-tysonpe-core-commerce-design.md). Turns the flat lesson list into a real course: curriculum sections, drip release, quizzes, progress, and certificates.

## Reference bar

Teachable, Thinkific and Tagmango all ship: sections + lessons builder, drip (by days after enrolment or fixed date), quizzes with pass mark and retake limit, completion progress, auto-issued certificates. Thinkific adds randomised options and per-answer explanations; Tagmango adds assignments and DRM video. We match the first set and add public certificate verification.

## Scope

| Area | Behaviour |
|---|---|
| Curriculum | Sections (title, order) containing lessons. Lessons keep their kinds (video, pdf, text, link) and gain **quiz**. Move up/down, edit, delete. Lessons not in a section show under "Lessons". |
| Drip | Per lesson: `none`, `days_after_enroll` (N days), `on_date` (fixed instant, entered as an IST date), `after_previous` (unlocks once the previous lesson in course order is complete). Locked lessons are visible with their unlock rule; content is withheld server-side. |
| Required | Per lesson `requiredForCompletion` (default true). Optional lessons don't count toward progress or certificates. |
| Progress | Learner marks non-quiz lessons complete (idempotent). A quiz lesson completes when passed. Progress = completed required / total required. |
| Quizzes | Questions: single-choice or multi-choice (exact set must match), 2–6 options each, optional explanation. Quiz settings: pass mark % (default 70), max attempts (blank = unlimited), shuffle options. Every attempt stored. Correct answers are revealed only after passing (or when attempts run out), so retakes can't be used to harvest answers. |
| Certificates | Per product toggle. Issued automatically the moment 100% of required lessons are complete. Unique public id, public verify page `/certificates/{id}` (printable). Snapshots learner name, course title, creator name. Revoked when the buyer's last paid order for the product is refunded. |
| Creator insight | Per product: learners enrolled, completion rate, certificates issued, per-lesson completion % (drop-off view). |
| Watermark | Video lessons overlay the learner's email, a standard piracy deterrent. |

## Honest limits (not in this sub-project)

- **True DRM** (Widevine/FairPlay, device limits) needs a video host with DRM; lessons stay URL-based (YouTube/Vimeo/any https link). Planned with the hosting integration.
- **File upload** (video/PDF hosting) needs object storage; later.
- **Assignments** (file/text submissions with creator review) are deferred to 2b.
- Certificate design is one clean template (brand colour, name, course, date, id); no template editor yet.

## Data model (additions)

```
Section        id, productId, title, position
ContentItem    + sectionId?, dripType, dripDays?, dripAt?, requiredForCompletion
Quiz           id, itemId (unique), passPct, maxAttempts?, shuffle
QuizQuestion   id, quizId, position, prompt, kind (single|multi), explanation
QuizOption     id, questionId, position, text, correct
LessonProgress id, userId, itemId (unique w/ userId), productId, completedAt
QuizAttempt    id, userId, quizId, scorePct, passed, answers(JSON string), createdAt
Certificate    id, publicId (unique), userId, productId (unique w/ userId), learnerName,
               courseTitle, creatorName, issuedAt, revokedAt?
Product        + certificateEnabled
```

All existing data stays valid (new columns have defaults / are nullable).

## Architecture

- `lib/learning/drip.ts`, `quiz.ts`, `progress.ts`: pure and unit-tested (no DB).
- `lib/learning/service.ts`: DB-backed `loadCourse`, `markComplete`, `submitQuiz`, `maybeIssueCertificate`, `revokeCertificates`. Every learner call re-checks enrolment and unlock state server-side.
- `refundOrder` revokes certificates when no other paid order keeps the buyer enrolled.
- Server actions stay thin; creator mutations scope by `creatorId` like sub-project 1.

## Security rules

- Locked or unenrolled lessons never reach the client: no URL, body, or quiz questions.
- Quiz answer keys never serialised to the learner. A failed attempt returns only the score and attempts left (no per-question marks, so retakes can't be used to eliminate options); per-question results, correct answers and explanations are returned only after passing or when attempts run out.
- Answers validated against the question's own option ids; unknown ids ignored; attempts counted atomically.
- Public certificate page shows only name, course, creator, date, id; never the email.

## Testing

Pure logic: every drip mode and boundary, grading (single/multi/partial/unknown ids), progress with optional lessons. Service on real SQLite: lock enforcement, idempotent completion, attempt limits, answer-key secrecy, certificate issue once, revoke on refund. Browser run of the whole creator → learner → certificate loop.

## Build notes

- Publishing goes only through `publishProduct`, which refuses a course containing a quiz that can't be answered (no questions, no correct option); `setProductStatus` can only unpublish.
- A lesson can't be converted to or from a quiz (it would orphan or fabricate questions).
- Adding a required lesson later lowers existing learners' progress; certificates already earned stay valid.
- `after_previous` drips off the nearest earlier *required* lesson, so optional lessons never deadlock a course.

## Success criteria

A creator builds a sectioned course with drip and a quiz, enables certificates; a learner works through it with correct locking and progress, passes the quiz, receives a certificate with a public verify link; a refund revokes it.
