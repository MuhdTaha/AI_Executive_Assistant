import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import { ScoringService } from './scoring.service';
import { PlacementService } from './placement.service';
import { FreeTimeService } from './freetime.service';
import { TaskBlocksRepo } from '../repo/task-blocks.repo';
import { TasksRepo } from '../repo/tasks.repo';
import { PlanConfirmRequest, PlanConfirmResponse, PlanProposeRequest, PlanProposeResponse, ReplanRequest } from '../types/dto';
import { CalendarService } from '../../calendar/calendar.service';
import { CalendarRepo } from '../repo/calendar.repo';

@Injectable()
export class PlannerService {
  constructor(
    private readonly scoring: ScoringService,
    private readonly placement: PlacementService,
    private readonly freetime: FreeTimeService,
    private readonly blocks: TaskBlocksRepo,
    private readonly tasks: TasksRepo,
    private readonly calendar: CalendarService,
    private readonly calendarRepo: CalendarRepo,
  ) {}

  async propose(req: PlanProposeRequest): Promise<PlanProposeResponse> {
    const today = DateTime.now();
    
    // Use userDay to get tz, start, end
    const { tz, start: dayStart, end: dayEnd } = await this.freetime.userDay(req.userId, req.date);

    // clear stale planned for this day (keep confirmed/executed)
    await this.blocks.deletePlannedForDay(req.userId, dayStart.toISO()!, dayEnd.toISO()!);

    const free = await this.freetime.freeIntervals(req.userId, dayStart, dayEnd);

    const list = await this.tasks.getSchedulable(req.userId, req.includeTaskIds, req.excludeTaskIds);
    const scored = list.map(t => ({ task: t, score: this.scoring.score(t, today) }))
      .sort((a,b) => b.score - a.score);

    const { placed, unplaceable } = this.placement.place(
      scored, free, { bufferMin: 5, maxChunk: 60 },
      (t, idx, after) => this.scoring.reason(t, idx ?? null, after)
    );

    const proposalId = uuid();
    await this.blocks.persistPlanned(
      req.userId,
      proposalId,
      placed.map(p => ({
        id: p.id, task_id: p.task_id, start_ts: p.start_ts, end_ts: p.end_ts, buffer_minutes: p.buffer_minutes
      }))
    );

    return {
      proposalId,
      date: req.date,
      blocks: placed.map(b => ({
        blockId: b.id, taskId: b.task_id, start: b.start_ts, end: b.end_ts,
        bufferMinutes: b.buffer_minutes, reason: b.reason, splitIndex: b.splitIndex
      })),
      unplaceable,
    };
  }

  async confirmWithUser(req: PlanConfirmRequest, user: any): Promise<PlanConfirmResponse> {
  const planned = await this.blocks.getByProposal(req.userId, req.proposalId, req.acceptBlockIds);
  const created: { blockId: string; googleEventId: string }[] = [];
  const skipped: { blockId: string; reason: string }[] = [];

  for (const b of planned) {
    if (b.google_event_id) { skipped.push({ blockId: b.id, reason: 'already-created' }); continue; }
    try {
      const ev = await this.calendar.createEvent(user, {
        start: b.start_ts, end: b.end_ts,
        summary: 'Focus block', description: '',
        extendedPrivate: { task_id: b.task_id, block_id: b.id },
      });
      if (!ev?.id) { skipped.push({ blockId: b.id, reason: 'no-event-id' }); continue; }
      await this.blocks.markConfirmed(b.id, ev.id);
      created.push({ blockId: b.id, googleEventId: ev.id });
    } catch (e: any) {
      skipped.push({ blockId: b.id, reason: e?.message || 'calendar-error' });
    }
  }

  // If caller provided an allowlist, delete any other planned blocks from that proposal
  if (req.acceptBlockIds && req.acceptBlockIds.length > 0) {
    try {
      await this.blocks.deleteUnacceptedForProposal(req.userId, req.proposalId, req.acceptBlockIds);
    } catch {}
  }
  return { created, skipped };
  }

  // Kept for compatibility; not used by controller now
  async confirm(_: PlanConfirmRequest): Promise<PlanConfirmResponse> {
    return { created: [], skipped: [{ blockId: 'all', reason: 'use confirmWithUser' }] };
  }

  async replan(req: ReplanRequest) {
  const { start: dayStart, end: dayEnd } = await this.freetime.userDay(req.userId, req.date);

  if (req.cause.type === 'calendar_changed') {
    const ev = await this.calendarRepo?.eventByGoogleId?.(req.userId, req.cause.googleEventId);
    if (ev) {
      await this.blocks.deletePlannedInWindow(req.userId, ev.start_ts, ev.end_ts);
    }
    return this.propose({ userId: req.userId, date: req.date });
  }

  if (req.cause.type === 'shift_by') {
    // MVP: drop all planned blocks for the day and re-propose
    await this.blocks.deletePlannedInWindow(req.userId, dayStart.toISO()!, dayEnd.toISO()!);
    return this.propose({ userId: req.userId, date: req.date });
  }

  if (req.cause.type === 'task_updated') {
    await this.blocks.deletePlannedForTaskInWindow(
      req.userId, req.cause.taskId, dayStart.toISO()!, dayEnd.toISO()!
    );
    return this.propose({ userId: req.userId, date: req.date });
  }

  // Fallback
  return this.propose({ userId: req.userId, date: req.date });
  }

}

