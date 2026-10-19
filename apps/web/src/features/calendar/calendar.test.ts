import { describe, expect, it } from 'vitest';
import { makeTask } from '../../test/helpers';
import {
  dayKey,
  groupByDay,
  moveToDay,
  rangeTitle,
  shiftCursor,
  visibleDays,
} from './calendar';

// Local-time constructor (months 1-based here), so tests pass in any zone.
const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min);

describe('visibleDays', () => {
  it('fills whole weeks around the month', () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const days = visibleDays('month', local(2026, 10, 19));
    expect(dayKey(days[0])).toBe('2026-09-27');
    expect(dayKey(days[days.length - 1])).toBe('2026-10-31');
    expect(days).toHaveLength(35);
  });

  it('shows Sunday to Saturday for a week', () => {
    const days = visibleDays('week', local(2026, 10, 21));
    expect(days.map(dayKey)).toEqual([
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
  });

  it('gives 7 distinct days across a DST change', () => {
    // US clocks go back on Nov 1 2026; days must not repeat or skip.
    const days = visibleDays('week', local(2026, 11, 2)).map(dayKey);
    expect(new Set(days).size).toBe(7);
    expect(days[0]).toBe('2026-11-01');
  });
});

describe('groupByDay', () => {
  it('buckets by local day, all-day first, then by time', () => {
    const tasks = [
      makeTask({ id: 'late', dueAt: local(2026, 10, 20, 17).toISOString() }),
      makeTask({ id: 'early', dueAt: local(2026, 10, 20, 9).toISOString() }),
      makeTask({
        id: 'allday',
        dueAt: local(2026, 10, 20).toISOString(),
        isAllDay: true,
      }),
      makeTask({ id: 'other', dueAt: local(2026, 10, 21, 9).toISOString() }),
      makeTask({ id: 'undated', dueAt: null }),
    ];
    const byDay = groupByDay(tasks);
    expect(byDay.get('2026-10-20')?.map((t) => t.id)).toEqual([
      'allday',
      'early',
      'late',
    ]);
    expect(byDay.get('2026-10-21')?.map((t) => t.id)).toEqual(['other']);
    expect([...byDay.keys()]).toHaveLength(2);
  });
});

describe('moveToDay', () => {
  it('keeps the time of day for a timed task', () => {
    const task = {
      dueAt: local(2026, 10, 20, 15, 30).toISOString(),
      isAllDay: false,
    };
    expect(moveToDay(task, local(2026, 10, 23))).toEqual({
      dueAt: local(2026, 10, 23, 15, 30).toISOString(),
      isAllDay: false,
    });
  });

  it('keeps an all-day task all-day', () => {
    const task = { dueAt: local(2026, 10, 20).toISOString(), isAllDay: true };
    expect(moveToDay(task, local(2026, 10, 23))).toEqual({
      dueAt: local(2026, 10, 23).toISOString(),
      isAllDay: true,
    });
  });

  it('keeps local wall-clock time across a DST change', () => {
    const task = {
      dueAt: local(2026, 10, 30, 9).toISOString(),
      isAllDay: false,
    };
    const moved = new Date(moveToDay(task, local(2026, 11, 2)).dueAt);
    expect(moved.getHours()).toBe(9);
    expect(dayKey(moved)).toBe('2026-11-02');
  });
});

describe('navigation', () => {
  it('moves by a month or a week', () => {
    expect(dayKey(shiftCursor('month', local(2026, 1, 31), 1))).toBe(
      '2026-02-28',
    );
    expect(dayKey(shiftCursor('week', local(2026, 10, 19), -1))).toBe(
      '2026-10-12',
    );
  });

  it.each([
    ['month', local(2026, 10, 19), 'October 2026'],
    ['week', local(2026, 10, 21), 'Oct 18 – 24, 2026'],
    ['week', local(2026, 9, 30), 'Sep 27 – Oct 3, 2026'],
    ['week', local(2026, 11, 2), 'Nov 1 – 7, 2026'],
    ['week', local(2026, 12, 30), 'Dec 27, 2026 – Jan 2, 2027'],
  ] as const)('titles %s view of %s as "%s"', (mode, cursor, expected) => {
    expect(rangeTitle(mode, cursor)).toBe(expected);
  });
});
