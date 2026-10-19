import { startOfDayInZone } from './time-zone';

const at = (iso: string) => new Date(iso);

describe('startOfDayInZone', () => {
  it('uses midnight UTC for the UTC zone', () => {
    expect(startOfDayInZone(at('2026-10-19T15:30:00Z'), 'UTC')).toEqual(
      at('2026-10-19T00:00:00Z'),
    );
  });

  it('finds the local day, not the UTC day', () => {
    // 02:00 UTC on the 20th is still 9pm on the 19th in Chicago (UTC-5).
    expect(
      startOfDayInZone(at('2026-10-20T02:00:00Z'), 'America/Chicago'),
    ).toEqual(at('2026-10-19T05:00:00Z'));
  });

  it('handles zones ahead of UTC and half-hour offsets', () => {
    // 20:00 UTC on the 19th is already the 20th in India (UTC+5:30).
    expect(
      startOfDayInZone(at('2026-10-19T20:00:00Z'), 'Asia/Kolkata'),
    ).toEqual(at('2026-10-19T18:30:00Z'));
  });

  it('adds whole days, rolling over the month', () => {
    expect(startOfDayInZone(at('2026-10-31T12:00:00Z'), 'UTC', 1)).toEqual(
      at('2026-11-01T00:00:00Z'),
    );
  });

  it('keeps local midnight when a window crosses the end of DST', () => {
    // New York leaves DST on 2026-11-01: midnight is 04:00 UTC before and
    // 05:00 UTC after.
    const now = at('2026-10-30T16:00:00Z');
    expect(startOfDayInZone(now, 'America/New_York')).toEqual(
      at('2026-10-30T04:00:00Z'),
    );
    expect(startOfDayInZone(now, 'America/New_York', 7)).toEqual(
      at('2026-11-06T05:00:00Z'),
    );
  });

  it('keeps local midnight on the day DST starts', () => {
    // New York enters DST at 2am on 2026-03-08; that day is 23 hours long.
    const now = at('2026-03-08T15:00:00Z');
    expect(startOfDayInZone(now, 'America/New_York')).toEqual(
      at('2026-03-08T05:00:00Z'),
    );
    expect(startOfDayInZone(now, 'America/New_York', 1)).toEqual(
      at('2026-03-09T04:00:00Z'),
    );
  });
});
