// src/auth/auth.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../db/supabase-admin.provider';
import { EnsureUserDto } from './dto/ensure-user.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabaseAdmin: SupabaseClient) {}

  async ensureUser(body: EnsureUserDto) {
    const { id, email } = body;

    // Check if the user already exists
    const { data: existingUser, error: lookupError } = await this.supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (existingUser) return existingUser;

    if (lookupError && lookupError.code !== 'PGRST116') {
      // Any error other than "no rows found"
      throw lookupError;
    }

    // Insert the user
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .insert({ id, email })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
