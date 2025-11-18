import { Provider } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

export const SupabaseAdminProvider: Provider = {
  provide: SUPABASE_ADMIN,
  useFactory: (): SupabaseClient => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(url, key, { auth: { persistSession: false } });
  },
};

