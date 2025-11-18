import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../db/supabase-admin.provider';

export type TaskRow = {
  id: string; user_id: string; title: string; notes: string | null;
  priority: 'low'|'med'|'high'; due_date: string | null; est_minutes: number; status: string;
};

@Injectable()
export class TasksRepo {
  constructor(@Inject(SUPABASE_ADMIN) private readonly sb: SupabaseClient) {}

  async getSchedulable(userId: string, include?: string[], exclude?: string[]) {
    let q = this.sb.from('tasks').select('*')
      .eq('user_id', userId).eq('status', 'todo');

    if (include?.length) q = q.in('id', include);
    if (exclude?.length) q = q.not('id', 'in', `(${exclude.join(',')})`);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TaskRow[];
  }

  async getUserSettings(userId: string) {
    const { data, error } = await this.sb
      .from('users')
      .select('tz, workday_start, workday_end')
      .eq('id', userId).single();
    if (error) throw error;
    return data ?? { tz: process.env.DEFAULT_TZ || 'America/Chicago', workday_start:'09:00', workday_end:'17:00' };
  }

    async setStatus(userId: string, taskId: string, status: 'todo'|'in_progress'|'done') {
    const { error } = await this.sb.from('tasks')
      .update({ status })
      .eq('user_id', userId).eq('id', taskId);
    if (error) throw error;
  }

  async updateEstimateAndStatus(userId: string, taskId: string, estMinutes: number, status: 'todo'|'in_progress'|'done') {
    const { error } = await this.sb.from('tasks')
      .update({ est_minutes: estMinutes, status })
      .eq('user_id', userId).eq('id', taskId);
    if (error) throw error;
  }

  async bumpActuals(userId: string, taskId: string, minutes: number) {
    const { error } = await this.sb.rpc('bump_task_actuals', { p_user_id: userId, p_task_id: taskId, p_minutes: minutes });
    if (error) throw error;
  }

}


