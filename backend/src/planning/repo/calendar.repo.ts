import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DateTime, Interval } from 'luxon';
import { SUPABASE_ADMIN } from '../../db/supabase-admin.provider';

@Injectable()
export class CalendarRepo {
  constructor(@Inject(SUPABASE_ADMIN) private readonly sb: SupabaseClient) {}

  async busyIntervals(userId: string, start: DateTime, end: DateTime) {
    const { data, error } = await this.sb
      .from('calendar_events')
      .select('start_ts, end_ts')
      .eq('user_id', userId)
      .lt('start_ts', end.toISO()).gt('end_ts', start.toISO());
    if (error) throw error;
    return (data ?? []).map(r => Interval.fromDateTimes(
      DateTime.fromISO(r.start_ts), DateTime.fromISO(r.end_ts)
    ));
  }

  async eventByGoogleId(userId: string, googleEventId: string) {
  const { data, error } = await this.sb
    .from('calendar_events')
    .select('google_event_id, start_ts, end_ts')
    .eq('user_id', userId)
    .eq('google_event_id', googleEventId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
  }

}

