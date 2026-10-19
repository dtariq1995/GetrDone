# GetrDone

A TickTick-style task manager. It's a personal project that also serves as Daanyaal's **Option 1 submission for the backstitch developer exercise**. The full approved plan is in [docs/PLAN.md](docs/PLAN.md). Read it before starting any work.

## Why it matters how this gets built
In a live walkthrough, reviewers will open random files and ask Daanyaal to explain them line by line. They rank in this order: he can explain the code, it works and handles edge cases (bad input, empty states, **user isolation**), code organization, visual polish, then thoughtful AI use. So:
- Keep code simple and explainable. Prefer clear and explicit over clever. Don't add libraries the plan doesn't name without asking.
- **Stop after each milestone in docs/PLAN.md** so Daanyaal can review before moving on. Commit once per milestone, after he's reviewed it.
- Keep `AI_LOG.md` up to date as you go: what was asked, what was generated, and what was kept, rewritten or fixed. It feeds the required write-up.

## Decisions (settled, don't re-litigate)
- Backend: NestJS + TypeScript, REST, Prisma + PostgreSQL, argon2id, JWT in an httpOnly cookie
- Frontend: React + Vite + TypeScript, TanStack Query, React Router, Tailwind, dnd-kit, date-fns
- Monorepo with npm workspaces: `apps/api`, `apps/web`
- v1 scope: core tasks & lists + Calendar + Kanban. Tags/recurring and Pomodoro/habits come after submission.
- Run: `docker compose up` locally, plus a hosted demo (Render + Neon). In prod, Nest serves the React build (single origin).
- Every query is scoped by `userId`. Another user's records return 404.

## Environment
Development is on Kubuntu: Node 24 LTS (nvm), Docker Engine + Compose plugin.

## Status
- [x] Plan approved
- [x] Milestone 1: setup & scaffold
- [x] Milestone 2: auth
- [x] Milestone 3: lists & tasks CRUD
- [x] Milestone 4: isolation & edge-case tests
- [x] Milestone 5: calendar view
- [ ] Milestone 6: sections + Kanban (next)
