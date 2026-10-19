# AI Log

How AI (Claude Code) was used to build GetrDone: what was asked, what it generated, and what was kept, rewritten or fixed. This feeds the AI section of WRITEUP.md.

## Planning (before any code)

- **Asked:** Help plan a TickTick-style app that meets backstitch Option 1, and explain why each part of the stack was chosen.
- **Generated:** `docs/PLAN.md` (stack, data model, API, screens, nine milestones) and `CLAUDE.md` (standing rules: simple and explainable code, stop after each milestone, scope every query by `userId`).
- **Decided:** Looked at two popular Claude Code plugins, Caveman (terse replies to save tokens) and Ponytail (rules that push for less code). Skipped both for now. Caveman makes explanations harder to learn from, and Ponytail would argue against libraries the plan already settled on (dnd-kit, date-fns). Ponytail is worth trying after submission.

## Milestone 1: Setup & scaffold

- **Asked:** Start the implementation (Milestone 1).
- **Generated with official tools, not by hand:** `@nestjs/cli new api --strict` and `create-vite` (react-ts template). Using the generators means the base config is the standard one any Nest/Vite developer would recognize.
- **Kept:** Nest's tsconfig, Jest setup and module structure; Vite's tsconfig split (app vs. node) and React ESLint plugins.
- **Removed:** Demo content (Hello World service, Vite/React logos and counter, both generated READMEs, `App.css`).
- **Changed:**
  - One root `.prettierrc` and `format`/`format:check` scripts instead of a per-app copy.
  - In the API, replaced `eslint-plugin-prettier` (runs Prettier inside ESLint) with `eslint-config-prettier` (just turns off clashing style rules), to match the web app. Lint checks code; Prettier checks formatting.
  - Tightened API lint: removed the generator's `no-explicit-any: off`, and `no-floating-promises` is now an error, not a warning (so `bootstrap()` became `void bootstrap()`).
  - `lint` no longer auto-fixes, so CI reports problems instead of silently rewriting files.
  - Aligned TypeScript (`~5.8.3`) across both apps.
- **Added:** npm workspaces root, `.nvmrc` (24), Postgres 16 in `docker-compose.yml` with a healthcheck, `GET /api/health`, global `/api` prefix, Vite dev proxy for `/api` (same-origin in dev, like prod), Tailwind v4 via its Vite plugin, and a placeholder page that shows whether the API is reachable.
- **Fixed during the session:** The first `npm run format` also reformatted `docs/PLAN.md` and `CLAUDE.md`. Reverted those and added `*.md` to `.prettierignore`, so hand-written docs aren't churned.
- **Verified:** format check, lint, typecheck, unit and e2e tests (health endpoint), production build of both apps, Postgres container healthy, and `/api/health` returning `{"status":"ok"}` both directly and through the Vite proxy.
- **Noted, not changed:** `npm audit` reports 20 moderate advisories, all in Jest's dev-only dependency tree (`sprintf-js`). Production dependencies report 0. The suggested `--force` fix downgrades ts-jest, so it was left alone.

## Milestone 2: Auth

- **Asked:** Build Milestone 2: Prisma User model, register/login/logout/me, argon2, JWT cookie, guard, `@CurrentUser`, frontend auth pages with a protected-route wrapper, and e2e tests.
- **Generated:** Prisma schema, config and first migration; `PrismaService`; `UsersService`; the `auth/` module (DTOs, service, controller, JWT strategy, guard, `@Public`, `@CurrentUser`, cookie settings); a shared `configureApp()`; a test database in Compose; 18 auth e2e tests. Frontend: `apiFetch` client, auth hooks (TanStack Query), `AuthForm` shared by `LoginPage`/`RegisterPage`, `ProtectedRoute`/`GuestRoute`, a placeholder home page and a 404 page.
- **Design choices made along the way (walkthrough points):**
  - **Global guard + `@Public()`** instead of `@UseGuards` on each controller. Routes are protected by default, so a new controller can't be left open by mistake.
  - **`@CurrentUser()` reads the id from the verified token**, never from the body or URL. That's what makes `userId` scoping trustworthy.
  - **`passwordHash` can't leak:** `UsersService` returns users through a `select` that leaves it out. Only login uses the method that includes it.
  - **Case-insensitive usernames:** lowercased (and trimmed) in the DTO, so the plain unique index enforces it. No `citext` or extra column needed.
  - **Duplicate usernames are caught from the database's unique error (P2002)**, not with a check-then-insert, which would race.
  - **Login gives one message** ("Invalid username or password") whether the user or the password was wrong.
  - **The JWT is pinned to HS256** on verify, so a token can't choose a weaker algorithm.
  - **`app.setup.ts`** holds the global prefix, cookie parser and ValidationPipe, so e2e tests run with exactly the production config.
  - **Env loading uses Node's built-in `process.loadEnvFile()`** instead of adding `dotenv` or `@nestjs/config` (neither is in the plan).
  - **e2e tests use their own Postgres** (`db-test`, in-memory tmpfs, port 5433) so tests can never touch dev data.
  - **Frontend redirects happen in one place:** `GuestRoute` and `ProtectedRoute` react to the `me` query. The forms don't navigate themselves.
- **Problems hit and fixed:**
  - `@nestjs/jwt` and `@nestjs/passport` v12 are ES-module-only and Jest couldn't load them. Switched to v11, which targets Nest 11 (what the plan specifies) and keeps all `@nestjs/*` on one major version.
  - Prisma 7 loads its query engine with a dynamic `import()`, which Jest only allows with `--experimental-vm-modules`. Added that flag to the `test:e2e` script (the warning it prints is silenced).
  - npm's `latest` tag for Prisma points at an 8.0 release candidate. Pinned stable 7.10.x.
  - `nest build` emitted `dist/src/main.js` instead of `dist/main.js` because `prisma.config.ts` sits beside `src/`. Excluded it in `tsconfig.build.json`.
  - First version of the "tampered token" test changed the signature's last character, which can hit unused base64 bits and leave the token valid. Rewrote it to forge the payload instead.
  - **Logout bug found by driving the UI in headless Chrome:** `queryClient.clear()` deleted the `me` query the mounted components were subscribed to, so they never saw the logged-out state and the page stuck on "Hi, ". Now `me` is set to `null` first and only the other queries are removed.
- **Verified:** lint, typecheck, build, 1 unit + 19 e2e tests, a manual curl run against the built server (argon2id hash confirmed in the database), and a scripted headless-Chrome run of the UI: redirect when logged out, client-side validation, sign up, redirect away from /login when logged in, 404, logout, duplicate username, wrong password, log in.

## Milestone 3: Lists & tasks CRUD

- **Asked:** Commit Milestone 2, add Google login to the plan as a post-build item, and build Milestone 3: lists and tasks scoped by `userId`, DTO validation, the smart-list query builder, and the frontend layout, sidebar, list view, quick-add, detail panel and subtasks.
- **Generated:**
  - API: `List` and `Task` models + migration; `ListsService`/`TasksService` with an ownership check (`findOwnedOrThrow`) behind every id from the client; `task-query.ts` (pure functions for each smart list's `where`/`orderBy`); `time-zone.ts` (day boundaries in the user's zone) with unit tests; `PrismaExceptionFilter`; `IsOptionalButNotNull`/`Trim` validators; 56 new e2e tests.
  - Web: data hooks for lists and tasks (optimistic task updates with rollback), `queryClient.ts` with a global error toast, `AppLayout`, `Sidebar`, `TaskListView`, `TaskRow`, `QuickAdd`, `TaskDetailPanel`, `SubtaskList`, `ListDialog`, plus `Modal`/`ConfirmDialog` (native `<dialog>`), `Checkbox`, `DatePicker` (native date/time inputs), `EmptyState`, `PriorityFlag`, `Toaster`.
- **Scope decisions (each flagged before building):** Sections are left for Milestone 6 with Kanban; drag-to-reorder waits for dnd-kit (the API already accepts `position`); subtasks are one level deep, set only at creation, and embedded in their parent; "Today" includes overdue tasks.
- **Design choices (walkthrough points):**
  - **Timezones without a library:** `startOfDayInZone` uses `Intl.DateTimeFormat` to find local midnight, checking twice so daylight-saving switches don't shift it. Unit tests cover UTC, Chicago, Kolkata (+5:30) and both New York DST changes.
  - **`IsOptionalButNotNull`:** class-validator's `@IsOptional()` also lets `null` through, so `{"title": null}` would have reached the database and returned a 500. Non-clearable PATCH fields now return a 400 for null.
  - **Subtasks share their parent's list,** and moving a parent moves its subtasks in the same transaction.
  - **A list view for someone else's list returns 404,** not an empty list.
  - **Optimistic updates** patch every cached task view and the open task, snapshot first, and restore the snapshot on error. A global `MutationCache.onError` shows the toast, so components don't each handle errors. The login and register forms opt out with `meta.inlineError`.
  - **The open task lives in the URL** (`?task=<id>`), so a refresh keeps it open and Back closes it.
- **Problems hit and fixed:**
  - In Prisma 7, `migrate dev` no longer regenerates the client, so new models showed up as type errors. `npm run db:migrate` now runs `prisma migrate dev && prisma generate`.
  - **Found by driving the UI in headless Chrome (via the DevTools protocol):**
    - A failed *background refetch* replaced already-loaded tasks and lists with error screens. Views now show the error state only when there is no cached data.
    - Server errors showed as "Request failed (500)". 5xx responses now read "Something went wrong on our end. Please try again."
    - Pressing Escape while typing in the title or notes closed the panel without saving, because removing a focused field doesn't fire `blur`. The Escape handler now blurs first.
  - Two failures were test-script problems, not app bugs: headless Chrome doesn't fire blur events unless page focus is emulated, and a reused browser profile was still logged in.
- **Verified:** lint, typecheck, build, 7 unit + 75 e2e tests; a scripted browser run of sign-up → quick-add in Today → Inbox → create list → add tasks → detail panel (priority, due date, notes, title, subtasks) → complete from row and panel → Completed view → Next 7 Days/All → search (case-insensitive, no-match state) → optimistic toggle checked mid-request, then a 500 → rollback + toast with lists kept → delete list (redirects off it) → unknown list URL.

## Milestone 4: Isolation & edge-case tests

- **Asked:** Commit Milestone 3, then keep working through the milestones, committing each one, until the session runs out.
- **Generated:**
  - `isolation.e2e-spec.ts`: Alice owns a list, a task, a subtask and an Inbox task. Bob tries every read and write against them: lists, all five smart views, search, counts, a list view, GET/PATCH/DELETE on each task, creating a task in Alice's list, adding a subtask to her task, moving his own task into her list, and sending a `userId`. Every attempt must return the **same 404 body a non-existent id gets**, and a helper re-reads Alice's data afterwards to prove nothing changed.
  - `edge-cases.e2e-spec.ts`: 401 on every protected route; expired, wrongly signed and non-JWT tokens; invalid JSON; a JSON array body; oversized notes (400) and an oversized body (413); an impossible date (Feb 30); an empty PATCH; acting on just-deleted records; 10 parallel quick-adds; three simultaneous registrations of one username (exactly one 201 and two 409s).
  - Web tests with Vitest + Testing Library (named in the plan): date formatting and overdue rules, the date/time input conversions, AuthForm validation (no request is sent when input is invalid) and server error display, TaskRow (checkbox sends the PATCH and doesn't open the task; clicking the title does), and TaskListView (empty state, collapsed Completed group, unknown list).
- **Reviewed, not just accepted:** All 123 API tests passed on the first run, so each assertion was checked to make sure it tests the right thing:
  - "Treats a search of only spaces as no search" was expecting **0** results, so it passed while the API searched for two spaces. That was a real bug: the search text wasn't trimmed. Added `@Trim()` to `q` and corrected the test to expect the task back.
  - A test called "rejects an empty PATCH" was really checking that it's accepted. Renamed.
- **Proved the isolation tests can fail:** Temporarily removed `userId` from the two ownership checks (`findOwnedOrThrow` in the tasks and lists services). 10 of the 23 isolation tests failed, then the services were restored from git. The 13 that kept passing cover queries that filter by `userId` separately (list views, counts, search).
- **Timezone-proof web tests:** The date tests build dates with local-time constructors and were run under `TZ=Asia/Kolkata`, `Pacific/Auckland` and `UTC`, all passing.
- **Verified:** lint, typecheck, build; API 7 unit + 123 e2e; web 21 tests.

## Milestone 5: Calendar view

- **Generated:**
  - API: optional `from`/`to` due-date window on `GET /api/tasks` (`from` inclusive, `to` exclusive), with a 400 when the window is empty. 5 new e2e tests.
  - Web: `calendar.ts` (plain functions: visible days, grouping by day, the new due date after a drop, navigation, range titles) with 13 unit tests; `CalendarView` (month/week toggle, prev/today/next, dnd-kit context), `DayCell` (drop target, "+N more"), `TaskChip` (draggable, opens on click), `AddTaskOnDayDialog`; a sidebar link and the `/calendar` route. Added `@dnd-kit/core` (named in the plan); chose the stable 6.x line over the pre-1.0 `@dnd-kit/react`.
- **Design choices (walkthrough points):**
  - **Rescheduling reuses `useUpdateTask`.** The calendar's query lives under the same `['tasks', 'list', …]` key as every other view, so the existing optimistic update and rollback move the chip instantly with no calendar-specific code.
  - **A timed task keeps its time of day when dragged** (a 3pm appointment moved to Friday stays at 3pm on Friday); all-day tasks stay all-day.
  - **Click vs drag:** the pointer sensor only starts a drag after 5px of movement, so a click still opens the task. For keyboards, Space picks up and Enter opens, so the two don't clash (dnd-kit's default uses Enter for both).
  - **Only the visible grid is fetched** (`from`/`to`), which is the plan's "date-range queries for the calendar" answer to scaling.
  - **Week view is seven day-columns, not an hourly timeline:** simpler to explain, and timed tasks already show their time.
- **Caught and fixed:**
  - The API first compared `from` and `to` as **strings**, which gives the wrong order when they use different offsets (`T01:00+05:00` is earlier than `T00:30Z`). Now compares as dates. The first test written for it didn't actually tell the two approaches apart; it was replaced with one that does.
  - A unit-test expectation was wrong ("Oct 25 – Oct 31" is all one month); swapped in a real cross-month week.
  - Self-review before testing: removed a leftover hidden `<span>` and a screen-reader live region that duplicated dnd-kit's built-in announcements, and made done chips use one text colour instead of two competing Tailwind classes.
- **Verified:** calendar unit tests under `America/New_York` (including the Nov 1 DST change), `Asia/Kolkata` and `UTC`. A headless-Chrome run with real mouse and keyboard events: month grid placement, "+2 more", a mouse drag (chip on the new day immediately; server kept 3pm), click opens the panel, a keyboard drag (Space, arrow keys, Space), "+N more" switching to that week, adding from a day's "+", and navigation. Lint, typecheck, build; API 7 unit + 128 e2e; web 34 tests.

## Milestone 6: Sections + Kanban

- **Generated:**
  - API: a `Section` model (list → sections cascade; deleting a section sets its tasks' `sectionId` to null), `Task.sectionId`, a sections module (`GET/POST /api/lists/:id/sections`, `PATCH/DELETE /api/sections/:id`), and section rules in `TasksService`. 16 new e2e tests, including Bob vs Alice's sections.
  - Web: `useSections` hooks; `lib/position.ts` (`positionBetween`) and `kanban/board.ts` (`buildColumns`, `dropResult`) as plain, unit-tested functions; `KanbanView` / `KanbanColumn` / `KanbanCard` with dnd-kit sortable; a List/Board toggle (`/lists/:id` vs `/lists/:id/board`); a Section picker in the task panel; **drag-to-reorder in list views** (deferred from Milestone 3 until dnd-kit was in).
- **Design choices (walkthrough points):**
  - **Sections have no `userId`.** As the plan's data model says, they're owned through their list, so the ownership check is `where: { id, list: { userId } }`. Tested by removing that filter: both section isolation tests failed, then it was restored.
  - **A task's section must be in the task's own list:** another user's section is 404, a section from a different list of yours is 400, and an Inbox task or a subtask can't have one. Moving a task to another list clears its section unless the same request names a section in the new list.
  - **Only the moved item is written.** `positionBetween` gives it a float halfway between its new neighbours (a unit test halves the same gap 50 times and the order still holds). `dropResult` uses dnd-kit's own `arrayMove`, so the drop lands exactly where the sortable preview showed it.
  - **Drag handles, not draggable rows:** a grip starts the drag, so Space and Enter keep their normal jobs on the checkbox and title. Reordering is turned off where "my order" has no meaning (smart views mixing lists, other sort orders, while searching).
  - **The board shares the list view's query,** so a change in one appears in the other, and the existing optimistic update moves cards instantly.
- **Caught and fixed:**
  - `npm run db:migrate -- --name x` hung: npm appends arguments to the *last* command in a script, so `--name` went to `prisma generate` while `migrate dev` waited at an interactive prompt. Split into `db:migrate` + `postdb:migrate`.
  - Self-review: the first reorder code sorted `active` in place, which in the Completed view *is* TanStack Query's cached array, so it would have mutated the cache. It now sorts a copy.
  - Lint: supertest's `any` was being passed into a typed helper. Typed the variables instead of loosening another rule.
- **Verified:** headless-Chrome run: board columns; a mouse drag into an empty column (optimistic, then confirmed by the server); a mouse reorder within a column; a keyboard move to the next column (Space, ArrowRight, Space); add section; add a task in a column; rename and delete a section (its task goes to "No section"); section via the panel; List/Board toggle; reordering a list row by its grip survives a reload; grips hidden while searching. Lint, typecheck, build; API 7 unit + 144 e2e; web 45 tests.
