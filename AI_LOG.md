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
