import {
  differenceInCalendarDays,
  format,
  isBefore,
  isThisYear,
  parse,
  startOfDay,
  startOfToday,
} from 'date-fns';

// Due dates arrive from the API in UTC and are shown in the browser's local
// time. All-day tasks are stored as local midnight, so they read back as the
// right calendar day.

// "Today", "Tomorrow", "Friday", "Oct 24", "Oct 24, 2027"; plus ", 3:00 PM"
// when the task has a time.
export function formatDue(
  dueAt: string,
  isAllDay: boolean,
  now = new Date(),
): string {
  const date = new Date(dueAt);
  const days = differenceInCalendarDays(date, now);

  let day: string;
  if (days === 0) day = 'Today';
  else if (days === 1) day = 'Tomorrow';
  else if (days === -1) day = 'Yesterday';
  else if (days > 1 && days < 7) day = format(date, 'EEEE');
  else if (isThisYear(date)) day = format(date, 'MMM d');
  else day = format(date, 'MMM d, yyyy');

  return isAllDay ? day : `${day}, ${format(date, 'h:mm a')}`;
}

// An all-day task is overdue once its day has passed; a timed task once its
// time has passed. Finished tasks are never overdue.
export function isOverdue(task: {
  dueAt: string | null;
  isAllDay: boolean;
  completedAt: string | null;
}): boolean {
  if (!task.dueAt || task.completedAt) {
    return false;
  }
  const due = new Date(task.dueAt);
  return isBefore(due, task.isAllDay ? startOfToday() : new Date());
}

// Converting between a due date and the values of <input type="date"> and
// <input type="time"> (local "yyyy-MM-dd" and "HH:mm" strings).
export function toDateInput(dueAt: string): string {
  return format(new Date(dueAt), 'yyyy-MM-dd');
}

export function toTimeInput(dueAt: string, isAllDay: boolean): string {
  return isAllDay ? '' : format(new Date(dueAt), 'HH:mm');
}

export function fromInputs(
  date: string,
  time: string,
): { dueAt: string; isAllDay: boolean } {
  if (!time) {
    const day = parse(date, 'yyyy-MM-dd', new Date());
    return { dueAt: startOfDay(day).toISOString(), isAllDay: true };
  }
  const dateTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
  return { dueAt: dateTime.toISOString(), isAllDay: false };
}

// An all-day due date of today, used by quick-add in the Today view.
export function todayAllDay(): { dueAt: string; isAllDay: boolean } {
  return { dueAt: startOfToday().toISOString(), isAllDay: true };
}
