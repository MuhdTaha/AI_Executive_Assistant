import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { InsightsRepo } from '../repo/insights.repo';

function minutesBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

@Injectable()
export class InsightsService {
  constructor(private readonly r: InsightsRepo) {}

  async daily(userId: string, dateISO: string, tz = process.env.DEFAULT_TZ || 'America/Chicago') {
    const day = DateTime.fromISO(dateISO, { zone: tz });
    const startISO = day.startOf('day').toISO();
    const endISO = day.endOf('day').toISO();

    const blocks = await this.r.blocksInRange(userId, startISO!, endISO!);
    const sessions = await this.r.sessionsInRange(userId, startISO!, endISO!);

    // minutes
    const plannedMin = blocks.reduce((m, b) => m + minutesBetween(b.start_ts, b.end_ts), 0);
    const confirmedMin = blocks
      .filter(b => b.state === 'confirmed' || b.state === 'executed')
      .reduce((m, b) => m + minutesBetween(b.start_ts, b.end_ts), 0);
    const executedMin = sessions
      .filter(s => s.minutes_worked != null)
      .reduce((m, s) => m + (s.minutes_worked || 0), 0);

    // slipped: had a block today but zero minutes recorded and task not done
    const taskIds = Array.from(new Set(blocks.map(b => b.task_id)));
    const tasks = await this.r.tasksByIds(taskIds);
    const workedByTask = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.task_id] = (acc[s.task_id] || 0) + (s.minutes_worked || 0);
      return acc;
    }, {});
    const slipped = tasks
      .filter(t => (workedByTask[t.id] || 0) === 0 && t.status !== 'done')
      .map(t => ({ taskId: t.id, title: t.title }));

    const calendarBusy = await this.r.calendarBusyMinutes(userId, startISO!, endISO!);

    // bias for completed sessions today with an estimate snapshot
    const completedWithSnap = sessions.filter(s => s.minutes_worked != null && s.est_snapshot != null && s.state === 'completed');
    const bias =
      completedWithSnap.length
        ? completedWithSnap.reduce((sum, s) => sum + (s.minutes_worked! / Math.max(1, s.est_snapshot!) - 1), 0) / completedWithSnap.length
        : 0;

    return {
      date: dateISO,
      minutes: {
        planned: plannedMin,
        confirmed: confirmedMin,
        executed: executedMin,
        calendarBusy,
      },
      slipped,
      estimationBias: Number(bias.toFixed(3)),
    };
  }

  async weekly(userId: string, anyDateISO: string, tz = process.env.DEFAULT_TZ || 'America/Chicago') {
    const day = DateTime.fromISO(anyDateISO, { zone: tz });
    const weekStart = day.startOf('week'); // Monday by Luxon default; adjust if you prefer
    const startISO = weekStart.toISO();
    const endISO = weekStart.plus({ days: 7 }).toISO();

    const blocks = await this.r.blocksInRange(userId, startISO!, endISO!);
    const sessions = await this.r.sessionsInRange(userId, startISO!, endISO!);

    const plannedMin = blocks.reduce((m, b) => m + minutesBetween(b.start_ts, b.end_ts), 0);
    const confirmedMin = blocks
      .filter(b => b.state === 'confirmed' || b.state === 'executed')
      .reduce((m, b) => m + minutesBetween(b.start_ts, b.end_ts), 0);
    const executedMin = sessions
      .filter(s => s.minutes_worked != null)
      .reduce((m, s) => m + (s.minutes_worked || 0), 0);

    const completedWithSnap = sessions.filter(s => s.minutes_worked != null && s.est_snapshot != null && s.state === 'completed');
    const bias =
      completedWithSnap.length
        ? completedWithSnap.reduce((sum, s) => sum + (s.minutes_worked! / Math.max(1, s.est_snapshot!) - 1), 0) / completedWithSnap.length
        : 0;

    return {
      weekStart: weekStart.toISODate(),
      minutes: {
        planned: plannedMin,
        confirmed: confirmedMin,
        executed: executedMin,
      },
      estimationBias: Number(bias.toFixed(3)),
    };
  }
}

