import { Prisma } from '../generated/prisma/client';
import { startOfDayInZone } from '../common/time-zone';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';

// Turns the query string of GET /api/tasks into Prisma `where` and `orderBy`
// objects. Kept as plain functions (no database access) so the rules for each
// smart list are in one place and easy to test.

export function buildTaskWhere(
  userId: string,
  query: ListTasksQueryDto,
  now: Date,
): Prisma.TaskWhereInput {
  // Always scoped to the user. Subtasks never appear on their own; they come
  // embedded in their parent.
  const where: Prisma.TaskWhereInput = { userId, parentId: null };

  if (query.q) {
    where.title = { contains: query.q, mode: 'insensitive' };
  }
  if (query.from || query.to) {
    where.dueAt = { gte: query.from, lt: query.to };
  }

  switch (query.view) {
    case 'inbox':
      return { ...where, listId: null };
    case 'list':
      return { ...where, listId: query.listId };
    case 'all':
      return where;
    case 'completed':
      return { ...where, completedAt: { not: null } };
    case 'today':
    case 'next7': {
      const start = startOfDayInZone(now, query.tz);
      const end = startOfDayInZone(
        now,
        query.tz,
        query.view === 'today' ? 1 : 7,
      );
      return {
        ...where,
        OR: [
          // Unfinished and due before the window ends, so overdue tasks show
          // up in Today until they're done.
          { completedAt: null, dueAt: { lt: end } },
          // Finished tasks only if they were due inside the window.
          { completedAt: { not: null }, dueAt: { gte: start, lt: end } },
        ],
      };
    }
  }
}

export function buildTaskOrderBy(
  query: ListTasksQueryDto,
): Prisma.TaskOrderByWithRelationInput[] {
  if (query.view === 'completed') {
    return [{ completedAt: 'desc' }];
  }

  // `position` is the tie-breaker so the order is stable.
  switch (query.sort) {
    case 'manual':
      return [{ position: 'asc' }];
    case 'due':
      return [{ dueAt: { sort: 'asc', nulls: 'last' } }, { position: 'asc' }];
    case 'priority':
      return [{ priority: 'desc' }, { position: 'asc' }];
    case 'title':
      return [{ title: 'asc' }, { position: 'asc' }];
    case 'created':
      return [{ createdAt: 'desc' }];
  }
}

// Unfinished-task counts for the smart lists in the sidebar.
export function buildCountWheres(userId: string, tz: string, now: Date) {
  const active: Prisma.TaskWhereInput = {
    userId,
    parentId: null,
    completedAt: null,
  };
  return {
    inbox: { ...active, listId: null },
    today: { ...active, dueAt: { lt: startOfDayInZone(now, tz, 1) } },
    next7: { ...active, dueAt: { lt: startOfDayInZone(now, tz, 7) } },
  } satisfies Record<string, Prisma.TaskWhereInput>;
}
