import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Task } from '../../api/tasks';

// The calendar's date logic, kept as plain functions so it can be unit
// tested without rendering anything. All in the browser's local time.

export type CalendarMode = 'month' | 'week';

// The days shown in the grid. A month view starts on the Sunday on or
// before the 1st and ends on the Saturday on or after the last day, so
// every row is a full week.
export function visibleDays(mode: CalendarMode, cursor: Date): Date[] {
  const start =
    mode === 'month' ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor);
  const end =
    mode === 'month' ? endOfWeek(endOfMonth(cursor)) : endOfWeek(cursor);
  return eachDayOfInterval({ start, end });
}

// A day as "yyyy-MM-dd". Used as the key for grouping and as the drop
// target id when dragging.
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Buckets tasks by the local day they're due. Within a day: all-day tasks
// first, then by time, then higher priority first.
export function groupByDay(tasks: Task[]): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const key = dayKey(new Date(task.dueAt));
    byDay.set(key, [...(byDay.get(key) ?? []), task]);
  }
  for (const dayTasks of byDay.values()) {
    dayTasks.sort(
      (a, b) =>
        Number(b.isAllDay) - Number(a.isAllDay) ||
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime() ||
        b.priority - a.priority,
    );
  }
  return byDay;
}

// The new due date when a task is dropped on `day`. A timed task keeps its
// time of day (a 3pm meeting moved to Friday is at 3pm on Friday); an
// all-day task stays all-day.
export function moveToDay(
  task: Pick<Task, 'dueAt' | 'isAllDay'>,
  day: Date,
): { dueAt: string; isAllDay: boolean } {
  if (!task.dueAt || task.isAllDay) {
    return { dueAt: startOfDay(day).toISOString(), isAllDay: true };
  }
  const due = new Date(task.dueAt);
  const moved = set(day, {
    hours: due.getHours(),
    minutes: due.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
  return { dueAt: moved.toISOString(), isAllDay: false };
}

// Moves the cursor one month or week back (-1) or forward (1).
export function shiftCursor(
  mode: CalendarMode,
  cursor: Date,
  direction: 1 | -1,
): Date {
  return mode === 'month'
    ? addMonths(cursor, direction)
    : addWeeks(cursor, direction);
}

// "October 2026", or for a week "Oct 18 – 24, 2026", "Oct 25 – Nov 1, 2026",
// "Dec 27, 2026 – Jan 2, 2027".
export function rangeTitle(mode: CalendarMode, cursor: Date): string {
  if (mode === 'month') {
    return format(cursor, 'MMMM yyyy');
  }
  const start = startOfWeek(cursor);
  const end = endOfWeek(cursor);
  if (!isSameYear(start, end)) {
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }
  if (!isSameMonth(start, end)) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
}
