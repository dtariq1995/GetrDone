# GetrDone: write-up

## What it is and how it's structured

GetrDone is a TickTick-style task manager: lists, smart views, subtasks, a calendar with drag-to-reschedule and a Kanban board. It's a client-server app: a **NestJS** REST API with **PostgreSQL** (via Prisma), and a **React** single-page app. In production Nest also serves the React build, so everything is on one origin.

The API follows MVC. Each feature (auth, lists, sections, tasks) is a Nest module with a **controller** that only handles HTTP, a **service** that holds the rules, and **Prisma models** for data. React is the view. Requests are validated against DTO classes before they reach a controller, so bad input gets a `400` with field messages and unknown fields (like a `userId`) are rejected.

**User isolation** is the rule everything follows. A global guard protects every route unless it's marked `@Public()`. The user id comes only from the verified JWT (`@CurrentUser()`), never from the request. Every query includes it, and anything that isn't yours returns `404`, the same as something that doesn't exist, so the API never confirms another user's record exists. Moving a task into a list or section re-checks that you own the target. A dedicated test has a second user attack every route.

On the frontend, TanStack Query owns server data. Checkbox ticks, drags and reorders update the screen immediately and roll back with an error toast if the server refuses. The smart-view queries, calendar maths and drag-and-drop ordering are plain functions with unit tests, so the components stay thin.

## Trade-offs

- **JWT in an httpOnly cookie:** JavaScript can't read it, so an XSS bug can't steal it. Logout clears the cookie, but a copied token stays valid until it expires (7 days).
- **Float positions** (insert at 1.5 between 1 and 2) mean reordering updates one row, not the whole list.
- **"Today" is computed in the user's time zone** on the server using the built-in `Intl` API, with tests across daylight-saving changes.
- **Colour tokens instead of `dark:` classes:** dark mode is one block of CSS overrides.
- **Week view is seven day-columns, not an hourly timeline.** It's simpler, and timed tasks still show their time.

## With more time

Rate-limit login and registration; short-lived tokens with refresh and revocation; cursor pagination for Completed; tags and recurring tasks (the schema leaves room); Google sign-in; dragging Kanban columns and lists to reorder them; an hourly calendar timeline; browser end-to-end tests (Playwright) in CI; and a proper accessibility audit.

## How I used AI

I planned first, then built with Claude Code one milestone at a time. Before any code, I worked with it on the plan (stack, data model, API, milestones) and fixed the rules it had to follow in a `CLAUDE.md`: simple, explainable code; scope every query by user; stop after each milestone. I reviewed the early milestones before each commit. For the later ones I had it continue end to end, then reviewed the diffs. [AI_LOG.md](AI_LOG.md) records what was asked, generated and changed at each step.

What I found most useful was making it **prove** things rather than assert them:

- **Driving the real UI** in headless Chrome found bugs the tests missed: logout left the page stuck, a failed background refresh blanked loaded data, and pressing Escape lost unsaved notes.
- **Checking tests that passed too easily** found a test that passed for the wrong reason, which uncovered a real search bug. Deliberately breaking the ownership checks confirmed the isolation tests fail when they should.
- **Running the Docker image**, not just building it, caught a crash in the generated Prisma client that only happened inside the container.

AI also made mistakes I had to catch: wrong test expectations, a string comparison of ISO dates, and seed data that would have shown up a day early in the Americas. Each one is in the log with its fix.
