# GetrDone

A TickTick-style task manager: lists, smart views (Inbox, Today, Next 7 Days), subtasks, a calendar with drag-to-reschedule, and a Kanban board per list. Built with NestJS, PostgreSQL and React.

- **Hosted demo:** _link added after deployment_
- **Demo login:** username `demo`, password `demo-password`

## Run it with Docker (about 5 minutes)

You need [Docker](https://docs.docker.com/get-docker/) with the Compose plugin, and nothing else.

```bash
git clone https://github.com/dtariq1995/GetrDone.git
cd GetrDone
docker compose up --build
```

When the log shows `Nest application successfully started`, open **<http://localhost:8080>** and log in as `demo` / `demo-password`, or sign up for a new account.

This starts PostgreSQL and the app. On every start, the app applies database migrations and makes sure the demo account exists. Stop it with `Ctrl+C`; `docker compose down -v` also deletes the database.

## Features

- **Tasks:** quick-add, notes, due date and time (or all-day), four priority levels, one level of subtasks, search, and sorting by your own order, due date, priority, title or newest.
- **Lists:** coloured lists in the sidebar with live counts; Inbox for tasks without a list.
- **Smart views:** Today (including overdue), Next 7 Days, All and Completed. "Today" uses your own time zone.
- **Calendar:** month and week views. Drag a task to another day with the mouse or keyboard; timed tasks keep their time.
- **Kanban:** sections as columns; drag cards within and between columns.
- **Details:** drag to reorder, optimistic updates with rollback on error, dark mode, keyboard shortcuts (`n` new task, `/` search, `?` all shortcuts), and a mobile layout.
- **Privacy between users:** every query is scoped to the logged-in user. Another user's data returns `404`, the same as data that doesn't exist.

## Develop locally

Requirements: Node 24 ([nvm](https://github.com/nvm-sh/nvm): `nvm use` reads `.nvmrc`) and Docker.

```bash
nvm use
npm install                                   # also generates the Prisma client
cp apps/api/.env.example apps/api/.env        # then set JWT_SECRET to a random string
npm run db:up                                 # Postgres for dev (5432) and tests (5433)
npm run db:migrate                            # create the tables
npm run dev:api                               # terminal 1: API on http://localhost:3000
npm run dev:web                               # terminal 2: app on http://localhost:5173
```

In development, Vite forwards `/api` requests to the API, so the browser sees one origin, just like production.

Optional demo data: `npm run build -w apps/api && npm run seed -w apps/api`.

## Tests

```bash
npm test             # API unit tests (Jest) and web tests (Vitest + Testing Library)
npm run test:e2e     # API end-to-end tests against the test database (needs `npm run db:up`)
```

The end-to-end suite includes a **two-user isolation test**: one user tries to read and change another's lists, tasks, subtasks and sections through every route, and must get the same `404` as for a missing record. Edge-case tests cover bad input, expired or forged tokens, oversized bodies, deleted records and parallel requests. CI (GitHub Actions) runs everything above plus a Docker build that starts the app and logs in.

## Scripts

Run from the repo root.

| Script | What it does |
| --- | --- |
| `npm run dev:api` / `dev:web` | Start the API (watch mode) / the Vite dev server |
| `npm run db:up` / `db:down` | Start / stop the dev and test databases |
| `npm run db:migrate` | Apply migrations (or create one after editing `schema.prisma`: `npm run db:migrate -- --name <name>`) |
| `npm run build` | Build both apps |
| `npm test` / `test:e2e` | Unit and component tests / API end-to-end tests |
| `npm run lint` / `typecheck` | ESLint / TypeScript checks for both apps |
| `npm run format` / `format:check` | Prettier |

## Environment variables (API)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (on Neon: the pooled one) |
| `DATABASE_URL_UNPOOLED` | no | Neon's direct connection; used for migrations when set |
| `JWT_SECRET` | yes | Signs login tokens. Any long random string |
| `PORT` | no | Port to listen on (default `3000`) |
| `NODE_ENV` | no | `production` makes the auth cookie HTTPS-only (set in the Docker image) |
| `COOKIE_SECURE` | no | `false` turns the HTTPS-only cookie off in production; only for plain-http local runs (Docker Compose sets it) |

## Project layout

```
apps/api/          NestJS API
  prisma/          schema.prisma and migrations
  src/auth/        register, login, JWT cookie, global guard, @CurrentUser
  src/lists/       lists        ─┐ each module: controller (HTTP) → service
  src/sections/    Kanban columns├ (rules + userId scoping) → Prisma
  src/tasks/       tasks, smart-view queries (task-query.ts)
  test/            end-to-end tests, including isolation.e2e-spec.ts
apps/web/          React app (Vite)
  src/api/         fetch client and TanStack Query hooks per resource
  src/features/    auth, tasks, lists, calendar, kanban
  src/components/  shared UI (sidebar, dialogs, date picker, ...)
```

## Deploying (Render + Neon)

1. **Database (Neon).** The project is linked with the [Neon CLI](https://neon.com/docs/cli) (`neon.ts`, region AWS us-west-2). `neon deploy` provisions it and writes `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) to `.env.local`, which is git-ignored.
2. **App (Render).** Choose **New → Blueprint** and select this repo. `render.yaml` defines one Docker web service in Render's default Oregon region, next to the database; Render generates `JWT_SECRET`.
3. When Render asks, paste the two Neon connection strings into `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, then deploy.

On every start the container applies migrations over the direct connection (Neon's pooler breaks Prisma Migrate) and makes sure the demo account exists. The app's own queries use the pooled connection.

## More

- [WRITEUP.md](WRITEUP.md): how it's structured, trade-offs, what I'd do next, and how I used AI
- [AI_LOG.md](AI_LOG.md): milestone-by-milestone record of what AI generated and what was changed or fixed
- [docs/PLAN.md](docs/PLAN.md): the original plan
