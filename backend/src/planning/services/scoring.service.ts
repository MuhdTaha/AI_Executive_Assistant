import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { TaskRow } from '../repo/tasks.repo';

const PRIORITY = { low: 1, med: 2, high: 3 } as const;

@Injectable()
export class ScoringService {
  score(task: TaskRow, today: DateTime) {
    const p = PRIORITY[(task.priority || 'med') as keyof typeof PRIORITY] ?? 2;
    const due = task.due_date ? DateTime.fromISO(task.due_date) : null;
    const daysToDue = due ? Math.floor(due.diff(today.startOf('day'), 'days').days) : 999;
    const urgency = Math.max(0, 4 - daysToDue);
    const overdue = daysToDue < 0 ? 3 : 0;
    const longness = task.est_minutes > 90 ? 0.5 : 0;
    return 2 * p + urgency + overdue - longness;
  }

  reason(task: TaskRow, idx: number | null, placedAfter?: string) {
    if (task.due_date) {
      return `High relevance${idx ? ` (chunk ${idx})` : ''}; due ${task.due_date}${placedAfter ? `; placed after ${placedAfter}` : ''}.`;
    }
    return `Prioritized${idx ? ` (chunk ${idx})` : ''} by importance; scheduled early.`;
  }
}

