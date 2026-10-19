// "Today" depends on where the user is: at 8pm in Chicago it is already
// tomorrow in UTC. These helpers find day boundaries in the user's IANA time
// zone (e.g. "America/Chicago") using only the built-in Intl API.

// Splits an instant into the wall-clock date and time shown in `timeZone`.
function wallClock(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

// How far ahead of UTC the zone's clocks are at that instant, in ms
// (e.g. -5h for Chicago in summer). It changes with daylight saving time.
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const t = wallClock(instant, timeZone);
  const wallAsUtc = Date.UTC(
    t.year,
    t.month - 1,
    t.day,
    t.hour,
    t.minute,
    t.second,
  );
  const instantToTheSecond = Math.floor(instant.getTime() / 1000) * 1000;
  return wallAsUtc - instantToTheSecond;
}

// The UTC instant of midnight that starts the day containing `instant` in
// `timeZone`, moved forward by `addDays` days. With addDays = 1 that's the
// end of today (the start of tomorrow).
export function startOfDayInZone(
  instant: Date,
  timeZone: string,
  addDays = 0,
): Date {
  const { year, month, day } = wallClock(instant, timeZone);

  // Midnight of the target day as if the zone were UTC. Date.UTC handles
  // overflow, so day 32 rolls into the next month.
  const midnightAsUtc = Date.UTC(year, month - 1, day + addDays);

  // Shift by the zone's offset. Done twice because the offset at the first
  // guess can differ from the offset at the answer when daylight saving time
  // changes in between (e.g. the 7-day window that crosses a DST switch).
  let result = midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone);
  result = midnightAsUtc - zoneOffsetMs(new Date(result), timeZone);
  return new Date(result);
}
