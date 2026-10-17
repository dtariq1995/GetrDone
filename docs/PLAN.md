# GetrDone — TickTick-style task manager (backstitch Option 1 submission)

## Context
Daanyaal wants a TickTick clone as a personal project, and wants to submit it as **Option 1** of the backstitch developer exercise (the interview team has approved this). Option 1 requires: a client-server web app, an MVC framework on the frontend or backend, more functionality than a tutorial, solo work, and a working demo. Reviewers rank in this order: (1) Daanyaal can explain every line, (2) it works and handles edge cases (bad input, empty states, a **second user can't see the first user's data**), (3) code organization, (4) visual polish, (5) thoughtful AI use. They also want a README that runs from a clean machine in about 10 minutes, plus a half-page to one-page write-up covering the structure, what he'd do with more time, and how he used AI.

The repo (`GetrDone/`) is empty, with no commits. Development moved to Kubuntu (Linux): Node 24 LTS via nvm, Docker Engine + Compose plugin.

**Decisions made:** NestJS backend (the MVC piece), REST API, React + TS frontend, PostgreSQL, Docker Compose for local runs plus a hosted demo.
**v1 scope:** core tasks & lists, plus Calendar & Kanban views. Tags/recurring tasks and Pomodoro/habits come **after** submission (the schema leaves room for them).

## Stack
| Layer | Choice | Why (walkthrough talking point) |
|---|---|---|
| Backend | NestJS 11 + TypeScript | Controllers (C) → services (business logic) → Prisma models (M). The React client is the view layer (V). |
| ORM / DB | Prisma + PostgreSQL 16 | Typed queries, readable schema file, migrations in git |
| Validation | `class-validator` DTOs + global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) | Malformed input is rejected with a 400 before it reaches a service |
| Auth | argon2id password hashing, JWT in an **httpOnly, SameSite=Lax cookie** | The token can't be read by JS (XSS); same-origin in prod |
| Frontend | React 19 + Vite + TypeScript, React Router, TanStack Query | Server state is cached and invalidated per mutation, with optimistic updates for checkboxes and drag |
| UI | Tailwind CSS + hand-built components, `lucide-react` icons, `@dnd-kit` (drag), `date-fns` | Polished look without a heavy component library he'd have to explain |
| Tests | Jest + Supertest (API e2e against a test DB), Vitest + Testing Library (a few UI tests) | |
| Tooling | npm workspaces, ESLint + Prettier, GitHub Actions CI (lint, typecheck, test) | |

## Repo layout
```
GetrDone/
  apps/api/            NestJS app
    prisma/schema.prisma, migrations/, seed.ts
    src/
      main.ts, app.module.ts
      prisma/          PrismaService (global module)
      auth/            auth.controller, auth.service, jwt.strategy, jwt-auth.guard, current-user.decorator, dto/
      users/           users.service
      lists/           lists.controller, lists.service, dto/
      sections/        sections.controller, sections.service, dto/   (Kanban columns)
      tasks/           tasks.controller, tasks.service, task-query.ts (smart-list filters), dto/
      common/          exception filter, ownership helper
    test/              e2e specs (auth, isolation, tasks)
  apps/web/            React + Vite
    src/
      api/             fetch client + per-resource hooks (useTasks, useLists…)
      features/auth/   LoginPage, RegisterPage
      features/tasks/  TaskListView, TaskRow, TaskDetailPanel, QuickAdd
      features/calendar/ CalendarView (month/week)
      features/kanban/   KanbanView
      components/      Sidebar, AppLayout, EmptyState, PriorityFlag, DatePicker, Modal…
      lib/             date formatting, priority colors
  docker-compose.yml, Dockerfile (multi-stage: builds web + api into one image)
  README.md, WRITEUP.md, AI_LOG.md
  .github/workflows/ci.yml
```

## Data model (Prisma)
- **User**: id, username (unique, case-insensitive), passwordHash, createdAt
- **List**: id, userId → User, name, color, position, createdAt. Each user's "Inbox" is not a row; it's tasks with `listId = null`.
- **Section**: id, listId → List (cascade), name, position. These are the Kanban columns. Tasks with no section show in a default "No section" column.
- **Task**: id, userId → User, listId? → List (cascade), sectionId? → Section (set null), parentId? → Task (cascade, subtasks one level deep), title, notes, dueAt (UTC), isAllDay, priority (0 none / 1 low / 2 med / 3 high), completedAt?, position (float, so drag-reorder updates one row), createdAt, updatedAt
- Indexes: `Task(userId, dueAt)`, `Task(userId, listId, position)`, `Task(parentId)`
- `userId` lives on Task (denormalized) so every task query can be scoped in one `WHERE` without a join.

## API (all routes except auth require `JwtAuthGuard`; `@CurrentUser()` supplies userId)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/lists`, `PATCH/DELETE /api/lists/:id`
- `GET/POST /api/lists/:id/sections`, `PATCH/DELETE /api/sections/:id`
- `GET /api/tasks?view=inbox|today|next7|all|completed&listId=&from=&to=&q=&sort=due|priority|title|created&tz=`
- `POST /api/tasks`, `PATCH /api/tasks/:id` (covers complete/uncomplete, move list/section, reschedule, reorder), `DELETE /api/tasks/:id`

**Isolation rule (key walkthrough point):** every service method takes `userId` and puts it in the Prisma `where` (`findFirst({ where: { id, userId } })`). If the record belongs to someone else, the API returns **404, not 403**, so it doesn't reveal that the record exists. When a task is moved to a list or section, the service checks that the target is also owned by the user.

**Timezones:** dates are stored in UTC. The client sends its IANA `tz`, and the server computes "today" and "next 7 days" boundaries in that zone.

## Frontend screens
1. **Auth**: register/login with inline validation errors and a friendly message for a duplicate username.
2. **App layout**: a left sidebar (smart lists Inbox / Today / Next 7 Days / Completed with counts, user lists with color dots, "+ List"), a center task pane, and a right detail panel.
3. **List view**: a quick-add bar at the top (Enter to add), task rows with a checkbox, priority flag color, due-date chip (red when overdue) and subtask count, sort dropdown, search, drag to reorder, and a collapsible "Completed" group.
4. **Task detail panel**: edit title and notes, date/time picker, priority, list selector, subtasks checklist, delete.
5. **Calendar view**: month grid and week view, tasks placed by dueAt, drag a task to another day to reschedule (optimistic update), click a day to quick-add with that date.
6. **Kanban view** (per list): a column per Section, drag cards between columns and reorder within one, add/rename/delete columns.
7. **Empty states** for every view (no lists, no tasks today, nothing completed), a loading skeleton, an error toast on a failed mutation with rollback, a 404 page, and light/dark theme.

## Build milestones (commit at each one; a real history helps prove ownership)
1. **Setup**: Node 24 LTS (nvm) and Docker Engine on Kubuntu. Scaffold the workspaces, ESLint/Prettier, docker-compose (Postgres), and the Nest + Vite apps.
2. **Auth**: Prisma User, register/login/logout/me, argon2, cookie JWT, guard, `@CurrentUser`. Frontend auth pages and a protected-route wrapper. e2e tests.
3. **Lists & tasks CRUD**: services scoped by userId, DTO validation, smart-list query builder (`task-query.ts`). Frontend layout, sidebar, list view, quick-add, detail panel, subtasks.
4. **Isolation & edge-case tests**: user B can't GET/PATCH/DELETE user A's lists or tasks (404), can't move a task into A's list, and bad payloads get a 400.
5. **Calendar view** with drag-to-reschedule.
6. **Sections + Kanban view** with dnd-kit.
7. **Polish**: design pass (typography, spacing, priority colors, transitions), dark mode, empty states, keyboard shortcuts (`n` new task, `/` search), responsive sidebar.
8. **Ship**: multi-stage Dockerfile (Nest serves the built React app via `ServeStaticModule`, so it's a single origin and cookies just work), `docker compose up` runs db + app with migrations and a seed demo user. Deploy to Render (one web service) + Neon Postgres. GitHub Actions CI.
9. **Docs**: README (one-command run, demo credentials, env vars, scripts), WRITEUP.md (structure and rationale, more-time list, AI usage). Keep **AI_LOG.md** up to date *throughout* the build (prompts, what was kept, rewritten or fixed) so the write-up stays honest and specific.

**Post-submission backlog** (the schema is ready for it): Tags (`Tag`, `TaskTag`), recurring tasks (an `rrule` field on Task, with the next occurrence created on completion), Pomodoro sessions, habits and streaks, a stats dashboard.

## Walkthrough prep (answer these in WRITEUP.md and know them cold)
- **Password storage**: argon2id with a per-hash salt. The hash is never returned (it's stripped from response DTOs).
- **Malformed input**: the ValidationPipe whitelist returns 400 with field messages. Prisma `P2025`/`P2002` are mapped to 404/409 by the exception filter.
- **Scale (1,000s of tasks)**: composite indexes, date-range queries for the calendar, and cursor pagination for the Completed view as the next step.
- **Where a new feature goes**: e.g. tags would be a new Nest module (controller + service + DTOs), a Prisma model + migration, then an `api/` hook and a component. It follows the same pattern as lists.

## Verification
- `npm run test -w apps/api`: e2e suite covering auth, CRUD, the **two-user isolation spec**, and validation errors, run against a disposable Postgres from docker-compose.
- `npm run test -w apps/web`: component tests (TaskRow toggle, empty state, date formatting).
- Manual: `docker compose up` on a clean clone, register two users in two browsers, and confirm each sees only their own data. Exercise quick-add, the detail panel, calendar drag, Kanban drag and dark mode.
- Fresh-machine check: follow the README in a clean clone and time it (target well under 10 minutes). Confirm the hosted URL and demo login work.
- CI is green on GitHub.
