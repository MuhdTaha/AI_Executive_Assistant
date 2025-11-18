import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../db/supabase-admin.provider';

@Injectable()
export class TaskBlocksRepo {
  constructor(@Inject(SUPABASE_ADMIN) private readonly sb: SupabaseClient) {}

  async persistPlanned(userId: string, proposalId: string, blocks: {
    id: string; task_id: string; start_ts: string; end_ts: string; buffer_minutes: number;
  }[]) {
    if (!blocks.length) return;
    const { error } = await this.sb.from('task_blocks').insert(
      blocks.map(b => ({ ...b, user_id: userId, proposal_id: proposalId, state: 'planned' }))
    );
    if (error) throw error;
  }

  async markConfirmed(blockId: string, googleEventId: string) {
    const { error } = await this.sb.from('task_blocks').update({
      google_event_id: googleEventId, state: 'confirmed'
    }).eq('id', blockId);
    if (error) throw error;
  }

  async confirmedInWindow(userId: string, startISO: string, endISO: string) {
  const { data, error } = await this.sb
    .from('task_blocks')
    .select('id, start_ts, end_ts')
    .eq('user_id', userId).eq('state', 'confirmed')
    .lt('start_ts', endISO).gt('end_ts', startISO);
  if (error) throw error;
  return data ?? [];
  }
  
  async deletePlannedInWindow(userId: string, startISO: string, endISO: string) {
  const { error } = await this.sb
    .from('task_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('state', 'planned')
    .lt('start_ts', endISO)
    .gt('end_ts', startISO);
  if (error) throw error;
  }

  async deletePlannedForTaskInWindow(userId: string, taskId: string, startISO: string, endISO: string) {
  const { error } = await this.sb
    .from('task_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('state', 'planned')
    .eq('task_id', taskId)
    .lt('start_ts', endISO)
    .gt('end_ts', startISO);
  if (error) throw error;
  }
  
  async markExecuted(blockId: string) {
  const { error } = await this.sb
    .from('task_blocks')
    .update({ state: 'executed' })
    .eq('id', blockId);
  if (error) throw error;
  }
  
  async getByProposal(userId: string, proposalId: string, acceptIds?: string[]) {
  let q = this.sb
    .from('task_blocks')
    .select('id, task_id, start_ts, end_ts, google_event_id, state')
    .eq('user_id', userId)
    .eq('proposal_id', proposalId)
    .eq('state', 'planned');               // only planned are confirmable
  if (acceptIds && acceptIds.length > 0) {
    q = q.in('id', acceptIds);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
  }

  async deleteUnacceptedForProposal(userId: string, proposalId: string, acceptIds: string[]) {
  const { error } = await this.sb
    .from('task_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('proposal_id', proposalId)
    .eq('state', 'planned')
    .not('id', 'in', `(${acceptIds.map((s) => `'${s}'`).join(',') || "''"})`);
  if (error) throw error;
  }
  
  async deletePlannedForDay(userId: string, dayStartISO: string, dayEndISO: string) {
  const { error } = await this.sb
    .from('task_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('state', 'planned')
    .lt('start_ts', dayEndISO)
    .gt('end_ts', dayStartISO);
  if (error) throw error;
  }

}

