import { Injectable } from '@nestjs/common';
import { SessionsRepo } from '../repo/sessions.repo';
import { TasksRepo } from '../repo/tasks.repo';

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

@Injectable()
export class ExecService {
  private alpha = Number(process.env.EMA_ALPHA ?? 0.3);   // learning rate
  private minEst = Number(process.env.EMA_MIN ?? 15);     // minutes
  private maxEst = Number(process.env.EMA_MAX ?? 480);

  constructor(
    private readonly sessions: SessionsRepo,
    private readonly tasks: TasksRepo,
  ) {}

  async start(userId: string, taskId: string, blockId?: string) {
    // mark task in_progress
    await (this.tasks as any).setStatus?.(userId, taskId, 'in_progress');
    const sessionId = await this.sessions.start(userId, taskId, blockId);
    return { sessionId };
  }

  async stop(userId: string, taskId: string) {
    const minutes = await this.sessions.stop(userId, taskId);
    if (minutes === null) return { minutes: 0, note: 'no running session' };
    // bump counters
    await (this.tasks as any).bumpActuals?.(userId, taskId, minutes);
    return { minutes };
  }

  async done(userId: string, taskId: string) {
  // stop current session (if running) & mark that last session 'completed'
  const minutes = await this.sessions.complete(userId, taskId);

  // fetch task to read current estimate BEFORE learning update
  const list = await this.tasks.getSchedulable(userId, [taskId]);
  const task = list.find(t => t.id === taskId);
  const oldEst = task?.est_minutes ?? 30;
  const actual = Math.max(1, minutes ?? 0);

  // snapshot the estimate on the latest session
  const latest = await this.sessions.latestForTask(userId, taskId);
  if (latest?.id) {
    await (this as any).sessions.sb.from('task_sessions')
      .update({ est_snapshot: oldEst })
      .eq('id', latest.id);
  }

  // try to mark the planned/confirmed block as executed (if session was tied to a block)
  if (latest?.block_id) {
    try { await (this as any).blocks.markExecuted(latest.block_id); } catch {}
  }

  // learn with EMA and clamp
  const updated = clamp(Math.round(this.alpha * actual + (1 - this.alpha) * oldEst), this.minEst, this.maxEst);

  // writeback task fields
  await (this.tasks as any).updateEstimateAndStatus?.(userId, taskId, updated, 'done');
  await (this.tasks as any).bumpActuals?.(userId, taskId, actual);

  return { oldEst, actual, newEst: updated };
  }

}

