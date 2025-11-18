import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../db/supabase-admin.provider';

@Injectable()
export class InsightsRepo {
  constructor(@Inject(SUPABASE_ADMIN) private readonly sb: SupabaseClient) {}

  async blocksInRange(userId: string, startISO: string, endISO: string) {
    const { data, error } = await this.sb
      .from('task_blocks')
      .select('id, task_id, start_ts, end_ts, state, created_at')
      .eq('user_id', userId)
      .gte('start_ts', startISO).lt('end_ts', endISO);
    if (error) throw error;
    return data ?? [];
  }

  async sessionsInRange(userId: string, startISO: string, endISO: string) {
    const { data, error } = await this.sb
      .from('task_sessions')
      .select('id, task_id, start_ts, end_ts, minutes_worked, state, est_snapshot')
      .eq('user_id', userId)
      .gte('start_ts', startISO).lt('start_ts', endISO);
    if (error) throw error;
    return data ?? [];
  }

  async tasksByIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('tasks')
      .select('id, title, status')
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  }

  async calendarBusyMinutes(userId: string, startISO: string, endISO: string) {
    const { data, error } = await this.sb
      .from('calendar_events')
      .select('start_ts, end_ts')
      .eq('user_id', userId)
      .lt('start_ts', endISO).gt('end_ts', startISO);
    if (error) throw error;
    const ms = (data ?? []).reduce((sum, r) => {
      const s = new Date(r.start_ts).getTime();
      const e = new Date(r.end_ts).getTime();
      return sum + Math.max(0, e - s);
    }, 0);
    return Math.round(ms / 60000);
  }
}

