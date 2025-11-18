import { Module } from '@nestjs/common';
import { SupabaseAdminProvider } from './supabase-admin.provider';

@Module({
  providers: [SupabaseAdminProvider],
  exports: [SupabaseAdminProvider],
})
export class DbModule {}

