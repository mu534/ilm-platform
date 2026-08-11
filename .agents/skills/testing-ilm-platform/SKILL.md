---
name: testing-ilm-platform
description: How to run and end-to-end test the ilm-platform Next.js/Prisma/NextAuth app locally (dev server, Postgres, seeding, creating users/roles, onboarding gating, scholar applications, course moderation).
---

# Testing ilm-platform locally

## Runtime setup
- Node: `source ~/.nvm/nvm.sh && nvm use 22.12.0`. Prisma 7 rejects Node 20.x, so the default node will fail.
- Postgres runs in Docker: `docker start ilm-pg` (db `ilm_platform`, shadow `ilm_shadow`, port 5432, user/pass `postgres`).
- Dev server: `npm run dev` on http://localhost:3000. First hit of each route compiles (5-10s) — reload once if a page renders logged-out or half-empty.
- Do NOT run `prisma migrate reset` / `db push` on a shared box; migrations are usually already applied.

## Seeding gotcha
`prisma/seed.mjs` imports `../generated/prisma/client.ts` and fails under Node 22 with
`ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".ts"`. Workaround: insert the few rows you need
directly, e.g. categories:
`docker exec ilm-pg psql -U postgres -d ilm_platform -c "insert into categories (id,name,slug,icon,\"order\") values ('cat_quran','Quran','quran','📖',1) on conflict do nothing;"`

## DB conventions
Table names are lowercase plural snake/camel hybrids: `users`, `courses`, `modules`, `lectures`,
`enrollments`, `learner_profiles`, `scholar_applications`, `scholars`, `course_reviews`.
Column names are camelCase and must be double-quoted: `select "approvalStatus" from courses;`.

## Creating test users / roles
- Register via `POST /api/auth/register` with
  `{name,email,password,confirmPassword,country,termsAccepted:true,privacyAccepted:true}`
  (both consent flags are required; in the UI the two checkboxes are separate and easy to miss).
- Registration shows an "email verification" message but credentials login still works when
  `REQUIRE_EMAIL_VERIFICATION=false` in `.env`.
- Promote roles with `UPDATE users SET role='ADMIN' WHERE email='...';` then sign out/in so the JWT refreshes.
- Sign out reliably via `http://localhost:3000/api/auth/signout` and confirming, rather than UI menus.

## Environment limitations to expect
- No real Google OAuth credentials → Google sign-in is untestable.
- Cloudinary credentials are placeholders → any real document/photo upload fails with
  `cloud_name is disabled` (401) surfaced in the UI as "An unexpected internal error occurred".
  Treat this as environment-limited; still verify the client-side validation paths.

## Key flows and where they live
- Onboarding gating is enforced in `proxy.ts` using `token.onboardingCompleted`, which `app/lib/auth.ts`
  derives from `learner_profiles.onboardingCompleted` (non-USER roles are always treated as complete).
  New learners land on `/onboarding`; partially-complete state resumes at the saved `onboardingStep`.
- Scholar application: `/scholar-application`. Submission requires `teachingExperience` to be a non-empty
  string, otherwise the API returns `422 Validation failed`.
- Admin scholar review: `/admin/scholar-applications`. Rejection requires an applicant-visible reason;
  internal notes are never returned by the applicant-facing API.
- Course moderation: create via `/admin/courses/new`, curriculum via `/admin/courses/<id>/builder`,
  modules via `POST /api/courses/<id>/modules` (NOT `/api/modules`), submit for review from the
  "Publishing" panel on the Settings tab of `/admin/courses/<id>/edit`, admin decides at
  `/admin/courses/<id>/review`.

## Known trouble spots (may still be broken)
- `PATCH /api/courses/[id]` returns 409 "Course moderation and publication changes must use the review
  workflow" if the body contains `status`, `published`, or `approvalStatus`. The Edit Course form used to
  spread its whole state (always including `published`), so ordinary metadata saves 409'd. If you need a
  metadata change purely as test setup, change it in Postgres and clearly label it as a workaround.
- **Zod `.partial()` does NOT strip `.default()`.** A handler that does `someSchema.partial().parse(raw)`
  will re-inject every `.default(...)` the client omitted, silently overwriting live DB values
  (`published`/`featured` → false, `order` → 0, `tags` → []). Stripping a field client-side is NOT enough
  to protect it. As of commit 55ec36e the PATCH handlers for courses, modules, lectures, scholars, quizzes
  and quiz-questions guard against this with `pickProvided(raw, parsed)` (app/lib/validations.ts), which
  keeps only the keys literally present in the request body; `app/api/courses/[id]/route.ts` additionally
  uses `courseEditSchema = courseSchema.omit({published, featured}).partial()`.
  This trap can reappear in any NEW route that mixes `.partial()` with `.default()`, so when testing a
  partial-update endpoint:
  1. Seed the record's defaulted fields to NON-default values first (e.g. `order=3`, `tags={a,b}`),
     otherwise a broken build looks identical to a fixed one.
  2. Save through a UI control that sends a genuinely partial body. Good ones in the course builder:
     module rename (sends `{title, description, courseId}`, omits `order`) and the lecture publish toggle
     (sends only `{published}`). The lecture *edit form* sends the whole form, so it proves nothing.
  3. Re-read the sibling columns from Postgres and check the course still appears on public `/courses`.
- `featured` is admin-only and no longer flows through the course body schema: it is applied via the
  separate `adminUpdateSchema` (`z.boolean().optional()`, no default) only when the caller is an admin.
  A non-admin PATCHing `{"featured":true}` gets `success:true` but the column stays false — verify in the DB
  rather than trusting the response.
- A non-admin owner editing an APPROVED+PUBLISHED course intentionally triggers re-review
  (`approvalStatus=PENDING`, `status=PENDING_REVIEW`, `published=false`) via `needsRereview` in
  `app/api/courses/[id]/route.ts`. This is by design — don't report it as the 409 bug. It also means the
  course vanishes from `/courses`, so run any public-catalog assertions BEFORE an instructor metadata save.
- `app/components/courses/CourseCard.tsx` enrollment states (0% Complete / Start Learning / progress bar /
  ✓ Completed / View Certificate) require `app/courses/page.tsx` to pass the `enrollment` prop. CTA
  precedence is: no enrollment → `View Course`; `certificateId` → `View Certificate`; `COMPLETED` →
  `View Course`; `progress > 0` → `Continue Learning`; else `Start Learning`. The `✓ Completed` badge and
  the CTA are independent. `/dashboard/my-courses` uses a *different* card component — don't confuse them.

## Verifying course-card states quickly
The percentage badge is real text, but the CTA lives in a decorative hover-reveal overlay that does not
repaint under synthetic mouse moves — screenshots will not show it. Assert the badge and the progress bar
from pixels, and read the CTA text from the DOM. Drive the four states straight from Postgres:
`update enrollments set progress=40 where "userId"='<id>';`, then `status='COMPLETED'`, then
`insert into certificates (id,"userId","courseId",title) values (...)`. Progress bar is
`role="progressbar"` with `aria-valuenow` and an inner element whose inline `width` matches the percent;
it is omitted entirely when status is COMPLETED. Reset the fixtures afterwards.

## Reaching a REJECTED scholar application
Admins cannot review their own application (403), so use a separate plain USER account: submit at
`/scholar-application` (bio, city, education, ≥1 qualification, ≥1 specialization, non-empty
`teachingExperience`, ≥1 subject category), then reject as admin at `/admin/scholar-applications`.
"Confirm rejection" stays disabled until the applicant-visible reason is non-empty. The applicant then
sees a "Your application needs changes." banner with `decisionReason`; `internalNotes` must never appear.

## Devin Secrets Needed
None for local testing. Real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and
`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` would be required to exercise
Google sign-in and real file uploads.
