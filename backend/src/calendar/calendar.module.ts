import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { DbModule } from '../db/db.module';
import { GoogleAuthService } from '../auth/google-auth.service';

/**
 * CalendarModule
 *
 * - Imports DbModule so SUPABASE_ADMIN is available for injection.
 * - Provides CalendarService and GoogleAuthService inside this module.
 * - Exports CalendarService so the planner / other modules can use it.
 */
@Module({
  imports: [DbModule],
  controllers: [CalendarController],
  providers: [CalendarService, GoogleAuthService],
  exports: [CalendarService],
})
export class CalendarModule { }
