import { Injectable } from '@nestjs/common';
import { DateTime, Interval } from 'luxon';
import { v4 as uuid } from 'uuid';
import { TaskRow } from '../repo/tasks.repo';

@Injectable()
export class PlacementService {
  private splitMinutes(total: number, maxChunk = 60) {
    if (total <= 90) return [total];
    const chunks: number[] = [];
    let remain = total;
    while (remain > 0) {
      const s = Math.min(maxChunk, remain);
      chunks.push(s);
      remain -= s;
    }
    return chunks;
  }

  place(
    scored: { task: TaskRow; score: number }[],
    free: Interval[],
    prefs: { bufferMin?: number; maxChunk?: number },
    reasonFor: (t: TaskRow, idx: number | null, after?: string) => string
  ) {
    const out: {
      id: string; task_id: string; start_ts: string; end_ts: string; buffer_minutes: number; reason: string; splitIndex?: number;
    }[] = [];
    const miss: { taskId: string; reason: string }[] = [];
    const buffer = prefs.bufferMin ?? 5;
    const maxChunk = prefs.maxChunk ?? 60;
    const freeList = free.slice();

    for (const { task } of scored) {
      const chunks = this.splitMinutes(task.est_minutes, maxChunk);
      let chunkIndex = 0;
      for (const ch of chunks) {
        const i = freeList.findIndex(f => f.length('minutes') >= ch + buffer);
        if (i < 0) { miss.push({ taskId: task.id, reason: 'No room today' }); break; }
        const slot = freeList[i];
        const start = slot.start;
        const end = start.plus({ minutes: ch });

        out.push({
          id: uuid(),
          task_id: task.id,
          start_ts: start.toISO(),
          end_ts: end.toISO(),
          buffer_minutes: buffer,
          splitIndex: chunks.length > 1 ? ++chunkIndex : undefined,
          reason: reasonFor(task, chunks.length > 1 ? chunkIndex : null,
            `${slot.start.toFormat('h:mm a')}–${slot.end.toFormat('h:mm a')}`)
        });

        const newStart = end.plus({ minutes: buffer });
        if (newStart >= slot.end) freeList.splice(i, 1);
        else freeList[i] = Interval.fromDateTimes(newStart, slot.end);
      }
    }
    return { placed: out, unplaceable: dedupe(miss) };

    function dedupe(arr: {taskId:string;reason:string}[]) {
      const seen = new Set<string>(); return arr.filter(x => !seen.has(x.taskId) && seen.add(x.taskId));
    }
  }
}

