# GetrDone: write-up

## What it is and how it's structured

GetrDone is a TickTick-style task manager: lists, smart views, subtasks, a calendar with drag-to-reschedule and a Kanban board. A **NestJS** REST API with **PostgreSQL** (via Prisma) serves a **React** single-page app, and in production Nest serves the React build too, so everything is on one origin.

The API follows MVC. Each feature (auth, lists, sections, tasks) is a Nest module: a **controller** handles HTTP, a **service** holds the rules, and **Prisma models** hold the data. React is the view. DTO validation turns bad input into a `400` with field messages and rejects unknown fields (like a `userId`). Passwords are hashed with argon2id and never sent back. A new feature such as tags would follow the same path: model and migration, Nest module, then an `api/` hook and a component.

**User isolation** is the rule everything follows. A global guard protects every route not marked `@Public()`. The user id comes only from the verified JWT, every query includes it, and anything that isn't yours returns `404`, so the API never confirms another user's record exists. A dedicated test has a second user attack every route.

On the frontend, TanStack Query owns server data. Ticks, drags and reorders update the screen immediately and roll back with an error toast if the server refuses.

## Trade-offs

- **JWT in an httpOnly cookie:** an XSS bug can't steal it, but a copied token stays valid until it expires (7 days).
- **Float positions** (1.5 between 1 and 2) mean a reorder updates one row, not the whole list.
- **"Today" uses the user's time zone**, computed on the server with `Intl` and tested across daylight-saving changes.
- **Sized for thousands of tasks:** composite indexes keep the views fast and the calendar fetches only its visible range, but Completed isn't paginated yet.

## With more time

Rate-limit login; short-lived tokens with refresh; pagination for Completed; tags and recurring tasks; an hourly calendar timeline; Playwright tests in CI; and an accessibility audit.

## How I used AI

I built it with Claude Code one milestone at a time. Before any code, we agreed the plan (stack, data model, API, milestones) and wrote the rules into a `CLAUDE.md`: simple, explainable code, every query scoped by user, stop after each milestone for my review. [AI_LOG.md](AI_LOG.md) records what was asked, generated and changed at each step.

The most useful habit was making it **prove** things rather than assert them:

- **Driving the real UI** in headless Chrome found bugs the tests missed, like logout leaving the page stuck and Escape losing unsaved notes.
- **Breaking the code on purpose** confirmed the isolation tests fail when they should, and exposed a test that passed for the wrong reason, which hid a real search bug.
- **Debugging the live deploy from evidence:** when a sign-up on the hosted site failed, Render's logs showed the request never reached the app. Reproducing it locally traced it to Node closing idle connections sooner than Render's proxy expects, fixed by raising the keep-alive timeout.

AI also made mistakes I had to catch, such as a string comparison of ISO dates and seed data that would have shown up a day early in the Americas. Each is in the log with its fix.
