import { DateTime, Interval } from 'luxon';

export function dayBounds(dateISO: string, tz: string, startHHMM = '09:00', endHHMM = '17:00') {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const day = DateTime.fromISO(dateISO, { zone: tz });
  const start = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  const end = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
  return { start, end };
}

export function buildFreeIntervals(dayStart: DateTime, dayEnd: DateTime, busy: Interval[]) {
  const within = Interval.fromDateTimes(dayStart, dayEnd);
  const blocks = busy
    .map(b => b.intersection(within))
    .filter((x): x is Interval => !!x)
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());

  const out: Interval[] = [];
  let cur = dayStart;
  for (const b of blocks) {
    if (b.start > cur) out.push(Interval.fromDateTimes(cur, DateTime.min(b.start, dayEnd)));
    if (b.end > cur) cur = b.end;
    if (cur >= dayEnd) break;
  }
  if (cur < dayEnd) out.push(Interval.fromDateTimes(cur, dayEnd));
  return out;
}

