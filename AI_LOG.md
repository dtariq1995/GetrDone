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
