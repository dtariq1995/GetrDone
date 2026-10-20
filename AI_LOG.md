# AI Log

I built GetrDone with Claude Code. This log records, milestone by milestone, what I asked for, what Claude drafted, and what was kept, rewritten or fixed. It feeds the AI section of [WRITEUP.md](WRITEUP.md).

**How I worked:** before any code, I agreed the plan with Claude ([docs/PLAN.md](docs/PLAN.md)) and wrote standing rules into [CLAUDE.md](CLAUDE.md): keep the code simple enough that I can explain any line, add no libraries the plan doesn't name, scope every query by `userId`, stop after each milestone. Claude wrote first drafts. Nothing was accepted just because the tests passed: tests were checked to see whether they test the right thing, isolation checks were broken on purpose to prove the tests catch it, and the UI was driven in a real (headless) browser.

**Highlights** (details in each section):

- A passing test hid a real bug: the "search of only spaces" test expected 0 results, so it passed while the API searched for two spaces ([Milestone 4](#milestone-4-isolation--edge-case-tests)).
- The `userId` ownership checks were removed on purpose to prove the isolation tests fail without them ([Milestone 4](#milestone-4-isolation--edge-case-tests), [Milestone 6](#milestone-6-sections--kanban)).
- Comparing ISO dates as strings gave the wrong order across time-zone offsets ([Milestone 5](#milestone-5-calendar-view)).
- The Docker image built, but the server crashed on start, so CI now starts the stack and logs in instead of only building it ([Milestone 8](#milestone-8-ship)).
- A failed sign-up on the live site was traced from the logs to a proxy keep-alive race and proved locally before it was fixed ([Render deploy](#render-deploy-and-a-failed-sign-up)).

## Planning (before any code)

- **Asked:** Help plan a TickTick-style app that meets backstitch Option 1, and explain why each part of the stack was chosen.
- **Result:** `docs/PLAN.md` (stack, data model, API, screens, nine milestones) and `CLAUDE.md` (the standing rules above).
- **Decided:** I looked at two popular Claude Code plugins, Caveman (terse replies to save tokens) and Ponytail (rules that push for less code), and skipped both for now. Caveman makes explanations harder to learn from, and Ponytail would argue against libraries the plan had already settled on (dnd-kit, date-fns). Ponytail is worth trying after submission.

## Milestone 1: Setup & scaffold

- **Asked:** Start Milestone 1 from the approved plan.
- **Generated with the official tools, not by hand:** `@nestjs/cli new api --strict` and `create-vite` (react-ts template), so the base config is the standard one any Nest or Vite developer would recognize. Kept Nest's tsconfig, Jest setup and module structure, and Vite's tsconfig split (app vs. node) and React ESLint plugins. Removed the demo content (Hello World service, Vite/React logos and counter, both generated READMEs, `App.css`).
- **Added:** npm workspaces root, `.nvmrc` (24), Postgres 16 in `docker-compose.yml` with a healthcheck, `GET /api/health`, a global `/api` prefix, a Vite dev proxy for `/api` (same origin in dev, like prod), Tailwind v4 via its Vite plugin, and a placeholder page that shows whether the API is reachable.
- **Changed from the generators' defaults:**
  - One root `.prettierrc` and `format`/`format:check` scripts instead of a copy per app.
  - In the API, replaced `eslint-plugin-prettier` (runs Prettier inside ESLint) with `eslint-config-prettier` (just turns off clashing style rules), to match the web app. Lint checks code; Prettier checks formatting.
  - Tighter API lint: removed the generator's `no-explicit-any: off`, and `no-floating-promises` is an error, not a warning (so `bootstrap()` became `void bootstrap()`).
  - `lint` no longer auto-fixes, so CI reports problems instead of silently rewriting files.
  - The same TypeScript version (`~5.8.3`) in both apps.
- **Caught and fixed:** the first `npm run format` also reformatted `docs/PLAN.md` and `CLAUDE.md`. Reverted those and added `*.md` to `.prettierignore` so hand-written docs aren't churned.
- **Noted, not changed:** `npm audit` reports 20 moderate advisories, all in Jest's dev-only dependency tree (`sprintf-js`). Production dependencies report 0. The suggested `--force` fix downgrades ts-jest, so it was left alone.
- **Verified:** format check, lint, typecheck, unit and e2e tests (health endpoint), production build of both apps, Postgres container healthy, and `/api/health` returning `{"status":"ok"}` directly and through the Vite proxy.

## Milestone 2: Auth

- **Asked:** Build Milestone 2: Prisma User model, register/login/logout/me, argon2, JWT cookie, guard, `@CurrentUser`, frontend auth pages with a protected-route wrapper, and e2e tests.
- **Drafted by Claude:** the Prisma schema and first migration, `PrismaService`, `UsersService`, the `auth/` module (DTOs, service, controller, JWT strategy, guard, `@Public`, `@CurrentUser`, cookie settings), a shared `configureApp()`, a test database in Compose and 18 auth e2e tests. On the web side: the `apiFetch` client, auth hooks (TanStack Query), `AuthForm` shared by `LoginPage`/`RegisterPage`, `ProtectedRoute`/`GuestRoute`, a placeholder home page and a 404 page.
- **Design choices:**
  - **Global guard + `@Public()`** instead of `@UseGuards` on each controller. Routes are protected by default, so a new controller can't be left open by mistake.
  - **`@CurrentUser()` reads the id from the verified token**, never from the body or URL. That's what makes `userId` scoping trustworthy.
  - **`passwordHash` can't leak:** `UsersService` returns users through a `select` that leaves it out. Only login uses the method that includes it.
  - **Case-insensitive usernames:** lowercased and trimmed in the DTO, so the plain unique index enforces it. No `citext` or extra column needed.
  - **Duplicate usernames are caught from the database's unique error (P2002)**, not with a check-then-insert, which would race.
  - **Login gives one message** ("Invalid username or password") whether the username or the password was wrong.
  - **The JWT is pinned to HS256** on verify, so a token can't choose a weaker algorithm.
  - **`app.setup.ts`** holds the global prefix, cookie parser and ValidationPipe, so the e2e tests run with exactly the production config.
  - **Env loading uses Node's built-in `process.loadEnvFile()`** instead of adding `dotenv` or `@nestjs/config` (neither is in the plan).
  - **e2e tests use their own Postgres** (`db-test`, in-memory tmpfs, port 5433), so tests can never touch dev data.
  - **Frontend redirects happen in one place:** `GuestRoute` and `ProtectedRoute` react to the `me` query. The forms don't navigate themselves.
- **Caught and fixed:**
  - `@nestjs/jwt` and `@nestjs/passport` v12 are ES-module-only and Jest couldn't load them. Switched to v11, which targets Nest 11 (what the plan specifies) and keeps every `@nestjs/*` package on one major version.
  - Prisma 7 loads its query engine with a dynamic `import()`, which Jest only allows with `--experimental-vm-modules`. Added that flag to the `test:e2e` script (and silenced the warning it prints).
  - npm's `latest` tag for Prisma pointed at an 8.0 release candidate. Pinned stable 7.10.x.
  - `nest build` emitted `dist/src/main.js` instead of `dist/main.js` because `prisma.config.ts` sits beside `src/`. Excluded it in `tsconfig.build.json`.
  - The first "tampered token" test changed the signature's last character, which can land on unused base64 bits and leave the token valid. Rewrote it to forge the payload instead.
  - **A logout bug found by driving the UI in headless Chrome:** `queryClient.clear()` deleted the `me` query the mounted components were subscribed to, so they never saw the logged-out state and the page got stuck on "Hi, ". Now `me` is set to `null` first and only the other queries are removed.
- **Verified:** lint, typecheck, build, 1 unit + 19 e2e tests, a manual curl run against the built server (argon2id hash confirmed in the database), and a scripted headless-Chrome run: redirect when logged out, client-side validation, sign up, redirect away from /login when logged in, 404, logout, duplicate username, wrong password, log in.

## Milestone 3: Lists & tasks CRUD

- **Asked:** Commit Milestone 2, add Google login to the plan as a post-build item, and build Milestone 3: lists and tasks scoped by `userId`, DTO validation, the smart-list query builder, and the frontend layout, sidebar, list view, quick-add, detail panel and subtasks.
- **Drafted by Claude:**
  - API: `List` and `Task` models + migration; `ListsService`/`TasksService` with an ownership check (`findOwnedOrThrow`) behind every id that comes from the client; `task-query.ts` (pure functions for each smart list's `where`/`orderBy`); `time-zone.ts` (day boundaries in the user's zone) with unit tests; `PrismaExceptionFilter`; the `IsOptionalButNotNull`/`Trim` validators; 56 new e2e tests.
  - Web: data hooks for lists and tasks (optimistic task updates with rollback), `queryClient.ts` with a global error toast, `AppLayout`, `Sidebar`, `TaskListView`, `TaskRow`, `QuickAdd`, `TaskDetailPanel`, `SubtaskList`, `ListDialog`, plus `Modal`/`ConfirmDialog` (native `<dialog>`), `Checkbox`, `DatePicker` (native date/time inputs), `EmptyState`, `PriorityFlag` and `Toaster`.
- **Scope decisions (flagged before building):** sections wait for Milestone 6 with Kanban; drag-to-reorder waits for dnd-kit (the API already accepts `position`); subtasks are one level deep, set only at creation, and embedded in their parent; "Today" includes overdue tasks.
- **Design choices:**
  - **Time zones without a library:** `startOfDayInZone` uses `Intl.DateTimeFormat` to find local midnight, checking twice so daylight-saving switches don't shift it. Unit tests cover UTC, Chicago, Kolkata (+5:30) and both New York DST changes.
  - **`IsOptionalButNotNull`:** class-validator's `@IsOptional()` also lets `null` through, so `{"title": null}` would have reached the database and returned a 500. Fields that can't be cleared now return a 400 for null.
  - **Subtasks share their parent's list,** and moving a parent moves its subtasks in the same transaction.
  - **Viewing someone else's list returns 404,** not an empty list.
  - **Optimistic updates** take a snapshot, patch every cached task view and the open task, and restore the snapshot on error. A global `MutationCache.onError` shows the toast, so components don't each handle errors. The login and register forms opt out with `meta.inlineError`.
  - **The open task lives in the URL** (`?task=<id>`), so a refresh keeps it open and Back closes it.
- **Caught and fixed:**
  - In Prisma 7, `migrate dev` no longer regenerates the client, so new models showed up as type errors. `npm run db:migrate` now runs `prisma migrate dev && prisma generate`.
  - **Found by driving the UI in headless Chrome (DevTools protocol):**
    - A failed *background refetch* replaced already-loaded tasks and lists with error screens. Views now show the error state only when there's no cached data.
    - Server errors showed as "Request failed (500)". 5xx responses now say "Something went wrong on our end. Please try again."
    - Pressing Escape while typing in the title or notes closed the panel without saving, because removing a focused field doesn't fire `blur`. The Escape handler now blurs first.
  - Two failures turned out to be problems in the test script, not the app: headless Chrome doesn't fire blur events unless page focus is emulated, and a reused browser profile was still logged in.
- **Verified:** lint, typecheck, build, 7 unit + 75 e2e tests, and a scripted browser run of the main flows: sign-up, quick-add, lists, every detail-panel field, completing tasks, each smart view, search (case-insensitive, no-match state), a 500 mid-request rolling back with a toast, deleting a list, and an unknown list URL.

## Milestone 4: Isolation & edge-case tests

- **Asked:** Commit Milestone 3, then keep working through the milestones, committing each one, until the session runs out.
- **Drafted by Claude:**
  - `isolation.e2e-spec.ts`: Alice owns a list, a task, a subtask and an Inbox task. Bob tries every read and write against them: lists, all five smart views, search, counts, a list view, GET/PATCH/DELETE on each task, creating a task in Alice's list, adding a subtask to her task, moving his own task into her list, and sending a `userId`. Every attempt must get **the same 404 body as an id that doesn't exist**, and a helper re-reads Alice's data afterwards to prove nothing changed.
  - `edge-cases.e2e-spec.ts`: 401 on every protected route; expired, wrongly signed and non-JWT tokens; invalid JSON; a JSON array body; oversized notes (400) and an oversized body (413); an impossible date (Feb 30); an empty PATCH; acting on just-deleted records; 10 parallel quick-adds; three simultaneous registrations of one username (exactly one 201 and two 409s).
  - Web tests with Vitest + Testing Library: date formatting and overdue rules, the date/time input conversions, AuthForm validation (no request is sent when input is invalid) and server error display, TaskRow (the checkbox sends the PATCH and doesn't open the task; clicking the title does), and TaskListView (empty state, collapsed Completed group, unknown list).
- **All 123 API tests passed on the first run, so each assertion was checked to make sure it tests the right thing:**
  - "Treats a search of only spaces as no search" expected **0** results, so it passed while the API searched for two spaces. That was a real bug: the search text wasn't trimmed. Added `@Trim()` to `q` and corrected the test to expect the task back.
  - A test called "rejects an empty PATCH" was really checking that it's accepted. Renamed.
- **Proved the isolation tests can fail:** temporarily removed `userId` from the two ownership checks (`findOwnedOrThrow` in the tasks and lists services). 10 of the 23 isolation tests failed, then the services were restored from git. The 13 that kept passing cover queries that filter by `userId` on their own (list views, counts, search).
- **Time-zone-proof web tests:** the date tests build dates with local-time constructors and were run under `TZ=Asia/Kolkata`, `Pacific/Auckland` and `UTC`. All passed.
- **Verified:** lint, typecheck, build; API 7 unit + 123 e2e; web 21 tests.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Milestone 5: Calendar view

- **Drafted by Claude:**
  - API: an optional `from`/`to` due-date window on `GET /api/tasks` (`from` inclusive, `to` exclusive), with a 400 when the window is empty. 5 new e2e tests.
  - Web: `calendar.ts` (plain functions: visible days, grouping by day, the new due date after a drop, navigation, range titles) with 13 unit tests; `CalendarView` (month/week toggle, prev/today/next, dnd-kit context), `DayCell` (drop target, "+N more"), `TaskChip` (draggable, opens on click), `AddTaskOnDayDialog`; a sidebar link and the `/calendar` route. Added `@dnd-kit/core` (named in the plan), choosing the stable 6.x line over the pre-1.0 `@dnd-kit/react`.
- **Design choices:**
  - **Rescheduling reuses `useUpdateTask`.** The calendar's query lives under the same `['tasks', 'list', …]` key as every other view, so the existing optimistic update and rollback move the chip instantly with no calendar-specific code.
  - **A timed task keeps its time of day when dragged** (a 3pm appointment moved to Friday stays at 3pm). All-day tasks stay all-day.
  - **Click vs. drag:** the pointer sensor only starts a drag after 5px of movement, so a click still opens the task. On the keyboard, Space picks a chip up and Enter opens it, so the two don't clash (dnd-kit's default uses Enter for both).
  - **Only the visible grid is fetched** (`from`/`to`), which is the plan's answer to scaling the calendar.
  - **Week view is seven day-columns, not an hourly timeline:** simpler to explain, and timed tasks already show their time.
- **Caught and fixed:**
  - The API first compared `from` and `to` as **strings**, which gives the wrong order when they use different offsets (`T01:00+05:00` is earlier than `T00:30Z`). It now compares them as dates. The first test written for this couldn't tell the two approaches apart, so it was replaced with one that does.
  - A unit-test expectation was wrong ("Oct 25 – Oct 31" is all one month). Swapped in a real cross-month week.
  - Self-review before testing: removed a leftover hidden `<span>` and a screen-reader live region that duplicated dnd-kit's built-in announcements, and made done chips use one text colour instead of two competing Tailwind classes.
- **Verified:** calendar unit tests under `America/New_York` (including the Nov 1 DST change), `Asia/Kolkata` and `UTC`. A headless-Chrome run with real mouse and keyboard events: grid placement, "+2 more", a mouse drag (the chip moves instantly and the server keeps 3pm), click to open, a keyboard drag, adding from a day's "+", and navigation. Lint, typecheck, build; API 7 unit + 128 e2e; web 34 tests.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Milestone 6: Sections + Kanban

- **Drafted by Claude:**
  - API: a `Section` model (deleting a list deletes its sections; deleting a section sets its tasks' `sectionId` to null), `Task.sectionId`, a sections module (`GET/POST /api/lists/:id/sections`, `PATCH/DELETE /api/sections/:id`), and section rules in `TasksService`. 16 new e2e tests, including Bob vs. Alice's sections.
  - Web: `useSections` hooks; `lib/position.ts` (`positionBetween`) and `kanban/board.ts` (`buildColumns`, `dropResult`) as plain, unit-tested functions; `KanbanView`/`KanbanColumn`/`KanbanCard` with dnd-kit sortable; a List/Board toggle (`/lists/:id` vs. `/lists/:id/board`); a Section picker in the task panel; and drag-to-reorder in list views (held back from Milestone 3 until dnd-kit was in).
- **Design choices:**
  - **Sections have no `userId`.** As the plan's data model says, they're owned through their list, so the ownership check is `where: { id, list: { userId } }`. Tested by removing that filter: both section isolation tests failed, then it was restored.
  - **A task's section must belong to the task's own list:** another user's section is a 404, a section from a different list of yours is a 400, and an Inbox task or a subtask can't have one. Moving a task to another list clears its section unless the same request names a section in the new list.
  - **Only the moved item is written.** `positionBetween` gives it a float halfway between its new neighbours (a unit test halves the same gap 50 times and the order still holds). `dropResult` uses dnd-kit's own `arrayMove`, so the drop lands exactly where the preview showed it.
  - **Drag handles, not draggable rows:** a grip starts the drag, so Space and Enter keep their normal jobs on the checkbox and title. Reordering is turned off where "my order" has no meaning (smart views that mix lists, other sort orders, while searching).
  - **The board shares the list view's query,** so a change in one appears in the other, and the existing optimistic update moves cards instantly.
- **Caught and fixed:**
  - `npm run db:migrate -- --name x` hung: npm appends arguments to the *last* command in a script, so `--name` went to `prisma generate` while `migrate dev` waited at an interactive prompt. Split it into `db:migrate` + `postdb:migrate`.
  - Self-review: the first reorder code sorted `active` in place, and in the Completed view that array *is* TanStack Query's cached array, so it would have mutated the cache. It now sorts a copy.
  - Lint: supertest's `any` was being passed into a typed helper. Typed the variables instead of loosening another rule.
- **Verified:** a headless-Chrome run: board columns; a mouse drag into an empty column (optimistic, then confirmed by the server); reordering within a column; a keyboard move to the next column; adding, renaming and deleting a section (its tasks go to "No section"); setting a section from the panel; the List/Board toggle; a list-row reorder that survives a reload; grips hidden while searching. Lint, typecheck, build; API 7 unit + 144 e2e; web 45 tests.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Milestone 7: Polish

- **Drafted by Claude:**
  - **Dark mode through semantic colour tokens.** `index.css` defines `surface`, `line`, `ink`, `accent` and `danger` tokens with light values in `@theme` and dark values in one `.dark { … }` block, plus `color-scheme: dark` so native date pickers, selects and scrollbars match. A one-off Python codemod (kept outside the repo) replaced 246 raw palette classes across 29 files, matching whole class names only and keeping `hover:`/`focus:` prefixes and `/opacity` suffixes. The only raw colours left on purpose are the toast, the modal and menu backdrops, white text on solid buttons, and the priority colours. `lib/theme.ts` + `ThemeToggle` cycle System → Light → Dark (saved in `localStorage`), and a small inline script in `index.html` applies the theme before first paint, so there's no white flash.
  - **Keyboard shortcuts:** `useShortcut` (`n` focuses quick-add, or adds on today in the calendar; `/` focuses search; `?` opens a shortcuts dialog). Shortcuts are ignored while typing in a field, with Ctrl/Cmd/Alt held, or with a dialog open.
  - **Responsive layout:** below 768px the sidebar becomes a slide-over menu (it closes on navigation, on the X, or on a backdrop tap) and the task panel covers the screen. Uses `h-dvh` so mobile browser toolbars don't cut it off.
  - **Smaller touches:** a slide-in for the task panel and fades for dialogs and toasts (only with `motion-safe:`, so they're off for users who ask for reduced motion), a tab title per view ("Today · GetrDone"), an SVG favicon, and swatch ring offsets that use the surface colour in dark mode.
  - Tests for `useShortcut` (fires; ignored while typing, with Ctrl, with a dialog open) and `ThemeToggle` (cycles and saves; follows a dark OS).
- **Why tokens instead of `dark:` variants:** with `dark:`, every element needs two sets of colours (around 150 edits that can drift apart). With tokens, components say what a colour is *for*, and the light and dark values live in one file.
- **Checked against test artifacts:** two headless-Chrome results looked like bugs but weren't. "n" seemed to type an "n" into the box, because the script sent a separate synthetic `char` event that real browsers don't send after `preventDefault`. The mobile menu seemed to stay open, because `querySelector` clicked the hidden desktop sidebar's link. Re-running with realistic key events and the right link confirmed both work.
- **Verified:** screenshots of Today with the panel, the calendar, the board and the login page in dark mode, and of the list, menu and panel at 390px wide. Shortcuts, the theme surviving a reload, and the menu closing after navigation. Lint, typecheck, build; API 7 unit + 144 e2e; web 51 tests.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Milestone 8: Ship

- **Drafted by Claude:** a two-stage `Dockerfile` (build both apps and prune dev dependencies, then a slim runtime image running as the `node` user that applies migrations, seeds the demo account and starts the server); `.dockerignore`; an `app` service in `docker-compose.yml` (waits for the database's healthcheck, served on port 8080 so it doesn't clash with the dev API), with `db-test` moved into a `test` profile; `ServeStaticModule` so Nest serves the React build (single origin) with `/api/*` excluded, so unknown API routes stay JSON 404s; an idempotent seed (`demo` / `demo-password`); `render.yaml` (Render Blueprint, Neon for Postgres); and a GitHub Actions workflow (format, lint, typecheck, unit + e2e against a Postgres service container, build, and a Docker job).
- **Decisions:**
  - `prisma` moved from dev dependencies to dependencies, because the container runs `prisma migrate deploy` on start.
  - The web app's packages are all build-time (`devDependencies`): Vite bundles them into `dist/`, so the server never loads them. This took about 100 MB off the image.
  - `COOKIE_SECURE=false` only for `docker compose` on plain-http localhost. The hosted demo keeps `Secure` cookies.
  - `app.enableShutdownHooks()` so the database pool closes when Render or Docker stops the container.
- **Caught and fixed:**
  - **The image built, but the server crashed on start** with `Cannot find module './internal/class.ts'`. In Docker, `prisma generate` runs during `npm ci`, before `tsconfig.json` is copied, so Prisma guessed `.ts` import extensions and `tsc` kept them. Fixed by setting `importFileExtension = "js"` in the schema instead of relying on detection. **The CI Docker job now starts the stack and logs in as the demo user**, because a build-only check wouldn't have caught this.
  - **The seed's all-day tasks would have shown up a day early in the Americas:** midnight inside a UTC container is the previous evening there. The seed now uses midday UTC, which is the same calendar day from UTC−11 to UTC+11. (The seed can't know the reviewer's zone; real users' all-day tasks use their own local midnight.)
- **Verified:** a clean-machine run under a separate Compose project with a fresh volume, ready in about a minute from `docker compose up --build` with cached layers. Migrations applied, demo seeded, demo login works, the SPA route `/calendar` serves the app, and the counts are right for Chicago and Tokyo. A restart skips the seed and finds no pending migrations. The full local suite is green.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Milestone 9: Docs

- **Drafted by Claude:** `README.md` (Docker quick start with the demo login, features, local development, tests, scripts, environment variables, layout, Render + Neon deploy steps) and `WRITEUP.md` (structure, isolation, trade-offs, a more-time list, AI use; about 650 words, within the one-page limit), both written from this log and the code.
- **The README was tested, not trusted:** a fresh `git clone` into a scratch folder, the Docker build cache cleared, then exactly the README's `docker compose up --build`. The app was up and the demo login worked in **69 seconds**. On a brand-new machine, the base image and npm downloads add a few minutes, still well inside the 10-minute target.
- **Left as a placeholder on purpose:** the hosted demo URL, since there was no deployment yet and a made-up link would be worse than none.
- **Reviewed:** I reviewed this milestone's changes in its own commit.

## Neon setup (deploy step 1)

- **Asked:** Set up the app on Neon using Neon's onboarding prompt: install the Neon CLI and agent skills, `neon init` against the existing org and project, `neon deploy`, wire the services into the code, and prove it works.
- **Who ran what:** Claude Code's safety classifier blocked Claude from installing and running the third-party CLI and skills, so I ran `neon init` / `neon deploy` and the browser sign-in myself. Before that, Claude confirmed the `neon` npm package is published by Neon (`neondatabase/neon-pkgs`) and added `.env.local` to `.gitignore` *before* `neon deploy` wrote the connection strings there (the old `.gitignore` only covered `.env`).
- **Wiring, following Neon's Postgres skill:**
  - **No driver change.** The skill says to keep the existing ORM and driver, and node-postgres suits a long-running server like Render (Neon's serverless driver is for serverless and edge runtimes).
  - **Pooled vs. direct.** `neon deploy` writes `DATABASE_URL` (pooled, PgBouncer) and `DATABASE_URL_UNPOOLED` (direct). The app keeps using `DATABASE_URL`. `prisma.config.ts`, which only the Prisma CLI reads, prefers `DATABASE_URL_UNPOOLED`, because Prisma Migrate over the pooler fails with misleading errors. Locally only `DATABASE_URL` exists, so Docker dev is unchanged. `render.yaml` asks for both.
  - **Not adopted:** `@neon/env`'s `parseEnv`. It's optional per the skill, the API would have to import the root `neon.ts` across workspaces, and `requireEnv` already fails fast. Removed the unused `@neon/env` and moved `@neon/config` (read only by the CLI through `neon.ts`) to root `devDependencies` so the Docker image doesn't ship it. Ran Prettier over `neon.ts` (quote style only) so CI's format check passes.
- **Proved it:** `npm run build` passed. `prisma migrate deploy` applied all three migrations to Neon over the direct connection, and the seed created `demo`. The production build (`node dist/main`, serving the web app) on Neon's pooled connection passed an HTTP run of health, pages, demo login, registering, creating a list/section/task/subtask, the calendar window, search, a second user getting 404 on GET/PATCH/DELETE and seeing no lists, cascading deletes, 400 on bad input and 401 when logged out. No errors in the app log. The two test users were then deleted; only `demo` remains.
- **Watch item:** `pg` warns that `sslmode=require` is currently treated as `verify-full` (the strictest check) and will mean plain `require` in pg v9. If that upgrade happens, set `sslmode=verify-full` in the Neon URLs to keep full certificate checking.
- **Never run the e2e suite against Neon:** its `resetDatabase` deletes every user. It only ever points at the `db-test` container, via `.env.test`.

## Render deploy and a failed sign-up

- **Deployed** to <https://getrdone.onrender.com> (Render Blueprint, Neon database). Checked from outside: health, pages, demo login, and the auth cookie is `HttpOnly; Secure; SameSite=Lax`.
- **Problem I hit and reported:** my first sign-up on the live site failed with "Could not reach the server", and the retry worked. Console: `api/auth/register: net::ERR_CONNECTION_CLOSED`, plus two expected `401`s from `/api/auth/me` (logged out).
- **Diagnosed from evidence, not guesses:**
  - The `401`s showed the server was up, so it wasn't waking from sleep. Render's logs showed no restart or crash after start-up, and the app's first database connection (which prints a `pg` warning) came only with the successful attempt, so the failed POST never reached Nest.
  - That fits a known proxy keep-alive race: Node closes idle connections after **5 s** by default, the proxy in front reuses connections for longer, and a request sent on a just-closed socket gets no response. Browsers retry failed GETs but not POSTs, which is why only sign-up failed. No official Render documentation was found; a Render community thread reports the same fix.
  - It couldn't be reproduced against the live site (0 failures in 20 timed POSTs; the window is tiny), so **the mechanism was proved locally** with one raw TCP connection: request, idle 8 s, request again. Before the fix, the server closed the socket at about 6 s and the second request got **no response**. After `keepAliveTimeout = 120s` / `headersTimeout = 121s`, both were answered. Same result inside the final Docker image.
- **A second bug in the same logs:** `Prisma failed to detect the libssl/openssl version`. Adding OpenSSL to the runtime stage alone made things *worse*: Prisma then tried to download a different engine on start into read-only `node_modules` ("Can't write to /app/node_modules/@prisma/engines"). The build stage, without OpenSSL, had fetched an OpenSSL 1.1 engine, so the old image only worked because there were no migrations to apply. **Fix:** a shared `base` stage with OpenSSL for both build and runtime. Verified by running `prisma migrate deploy` inside the image against an *empty* database (all three migrations applied, no warnings), then a full container start.
- **Left alone:** the `pg` "sslmode=require is treated as verify-full" warning. It's informational, and the current behaviour is the strictest.

## Local setup on a new machine and write-up pass

- **Asked:** Get the app running locally and help with WRITEUP.md.
- **Setup without Docker or sudo:** this machine had Node 22 and no Docker. Installed Node 24 into `~/.local` and ran Postgres 16 from the `@embedded-postgres/linux-x64` binaries on port 5432 with the Compose credentials, then followed the README's dev steps (migrate, seed, `dev:api`, `dev:web`). Demo login and task fetch worked through the Vite proxy, and `npm test` passed.
- **Found:** npm 11.19 (bundled with Node 24.22) blocks dependency install scripts unless they're approved, so `npm install` skipped argon2's native build and Prisma's engines. Approved the six packages, which adds an `allowScripts` block to `package.json`. Docker (`node:24`) and CI (`.nvmrc` = 24) will get this npm on their next fresh build, so the block needs committing.
- **Write-up:** checked each claim against the code (token lifetime, indexes, error mapping, `Intl` time zones); all accurate. Added the walkthrough-prep answers PLAN.md asks for that were missing (argon2id, `P2025`/`P2002` mapping, indexes and scale, where a new feature goes) and the Render keep-alive debugging as an AI-use example.
