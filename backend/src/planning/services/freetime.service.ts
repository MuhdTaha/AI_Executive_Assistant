import { Injectable } from '@nestjs/common';
import { DateTime, Interval } from 'luxon';
import { TasksRepo } from '../repo/tasks.repo';
import { CalendarRepo } from '../repo/calendar.repo';
import { TaskBlocksRepo } from '../repo/task-blocks.repo';
import { buildFreeIntervals, dayBounds } from '../utils/time';

@Injectable()
export class FreeTimeService {
  constructor(
    private readonly tasks: TasksRepo,
    private readonly cal: CalendarRepo,
    private readonly blocks: TaskBlocksRepo,   // ⬅️ add
  ) {}

  async userDay(userId: string, dateISO: string) {
    const settings = await this.tasks.getUserSettings(userId);
    const tz = settings.tz || process.env.DEFAULT_TZ || 'America/Chicago';
    const { start, end } = dayBounds(dateISO, tz, settings.workday_start, settings.workday_end);
    return { tz, start, end, settings };
  }

  async freeIntervals(userId: string, start: DateTime, end: DateTime) {
    const busyCal = await this.cal.busyIntervals(userId, start, end);
    const confirmed = await this.blocks.confirmedInWindow(userId, start.toISO()!, end.toISO()!);
    const busyConfirmed = confirmed.map(b =>
      Interval.fromDateTimes(DateTime.fromISO(b.start_ts), DateTime.fromISO(b.end_ts))
    );
    const busy = busyCal.concat(busyConfirmed);
    return buildFreeIntervals(start, end, busy);
  }
}

