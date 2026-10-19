import { describe, expect, it, vi } from 'vitest';
import {
  formatDue,
  fromInputs,
  isOverdue,
  toDateInput,
  toTimeInput,
} from './dates';

// Dates are built with the local-time constructor (months are 0-based), so
// these tests pass in any time zone the machine is set to.
const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const now = new Date(2026, 9, 19, 15, 0); // Mon Oct 19 2026, 3pm

describe('formatDue', () => {
  it.each([
    [local(2026, 10, 19), 'Today'],
    [local(2026, 10, 20), 'Tomorrow'],
    [local(2026, 10, 18), 'Yesterday'],
    [local(2026, 10, 23), 'Friday'],
    [local(2026, 11, 2), 'Nov 2'],
    [local(2027, 1, 5), 'Jan 5, 2027'],
  ])('shows all-day %s as "%s"', (dueAt, expected) => {
    expect(formatDue(dueAt, true, now)).toBe(expected);
  });

  it('adds the time for timed tasks', () => {
    expect(formatDue(local(2026, 10, 19, 17, 30), false, now)).toBe(
      'Today, 5:30 PM',
    );
  });
});

describe('isOverdue', () => {
  const task = (dueAt: string | null, isAllDay: boolean, done = false) => ({
    dueAt,
    isAllDay,
    completedAt: done ? local(2026, 10, 19) : null,
  });

  it('is never overdue without a due date or once done', () => {
    vi.useFakeTimers({ now });
    expect(isOverdue(task(null, true))).toBe(false);
    expect(isOverdue(task(local(2026, 10, 1), true, true))).toBe(false);
  });

  it('treats an all-day task as overdue only after its day', () => {
    vi.useFakeTimers({ now });
    expect(isOverdue(task(local(2026, 10, 19), true))).toBe(false);
    expect(isOverdue(task(local(2026, 10, 18), true))).toBe(true);
  });

  it('treats a timed task as overdue once its time has passed', () => {
    vi.useFakeTimers({ now });
    expect(isOverdue(task(local(2026, 10, 19, 14, 0), false))).toBe(true);
    expect(isOverdue(task(local(2026, 10, 19, 16, 0), false))).toBe(false);
  });
});

describe('date and time inputs', () => {
  it('makes a task all-day when the time is empty', () => {
    expect(fromInputs('2026-10-20', '')).toEqual({
      dueAt: local(2026, 10, 20),
      isAllDay: true,
    });
  });

  it('keeps the time when one is given', () => {
    expect(fromInputs('2026-10-20', '09:15')).toEqual({
      dueAt: local(2026, 10, 20, 9, 15),
      isAllDay: false,
    });
  });

  it('round-trips back to the input values', () => {
    const { dueAt, isAllDay } = fromInputs('2026-10-20', '09:15');
    expect(toDateInput(dueAt)).toBe('2026-10-20');
    expect(toTimeInput(dueAt, isAllDay)).toBe('09:15');
    expect(toTimeInput(dueAt, true)).toBe('');
  });
});
