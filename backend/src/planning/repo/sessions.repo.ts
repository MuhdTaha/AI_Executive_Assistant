import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../db/supabase-admin.provider';

@Injectable()
export class SessionsRepo {
  constructor(@Inject(SUPABASE_ADMIN) private readonly sb: SupabaseClient) {}

  async start(userId: string, taskId: string, blockId?: string) {
    // end any dangling 'running' sessions for this task (safety)
    await this.sb.from('task_sessions')
      .update({ state: 'stopped', end_ts: new Date().toISOString() })
      .eq('user_id', userId).eq('task_id', taskId).eq('state', 'running');

    const { data, error } = await this.sb.from('task_sessions').insert({
      user_id: userId, task_id: taskId, block_id: blockId ?? null,
      start_ts: new Date().toISOString(), state: 'running'
    }).select('id').single();
    if (error) throw error;
    return data!.id as string;
  }

  async stop(userId: string, taskId: string) {
    const now = new Date().toISOString();
    const { data: running, error: e1 } = await this.sb.from('task_sessions')
      .select('id, start_ts').eq('user_id', userId).eq('task_id', taskId).eq('state', 'running')
      .order('start_ts', { ascending: false }).limit(1).maybeSingle();
    if (e1) throw e1;
    if (!running) return null;

    const start = new Date(running.start_ts).getTime();
    const end = new Date(now).getTime();
    const minutes = Math.max(1, Math.round((end - start) / 60000));

    const { error: e2 } = await this.sb.from('task_sessions')
      .update({ state: 'stopped', end_ts: now, minutes_worked: minutes })
      .eq('id', running.id);
    if (e2) throw e2;
    return minutes;
  }

  async complete(userId: string, taskId: string) {
    // stop if running, then mark that last session completed
    const minutes = await this.stop(userId, taskId);
    // mark last session 'completed'
    const { data: last, error: e1 } = await this.sb.from('task_sessions')
      .select('id').eq('user_id', userId).eq('task_id', taskId)
      .order('end_ts', { ascending: false }).limit(1).single();
    if (e1) throw e1;
    const { error: e2 } = await this.sb.from('task_sessions')
      .update({ state: 'completed' }).eq('id', last.id);
    if (e2) throw e2;
    return minutes ?? 0;
  }

  async sumToday(userId: string, taskId: string) {
    const { data, error } = await this.sb.rpc('sum_today_task_minutes', { p_user_id: userId, p_task_id: taskId });
    if (error) return 0;
    return (data as number) ?? 0;
  }

  async latestForTask(userId: string, taskId: string) {
  const { data, error } = await this.sb
    .from('task_sessions')
    .select('id, task_id, block_id, start_ts, end_ts, minutes_worked, state')
    .eq('user_id', userId).eq('task_id', taskId)
    .order('start_ts', { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
  }

}

