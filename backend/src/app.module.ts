import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CalendarController } from './calendar/calendar.controller';
import { CalendarService } from './calendar/calendar.service';

import { DbModule } from './db/db.module';
import { CalendarModule } from './calendar/calendar.module';
import { PlanningModule } from './planning/planning.module';
import { PlanningController } from './planning.controller';

import { GoogleAuthController } from './auth/google-auth.controller';
import { GoogleAuthService } from './auth/google-auth.service';
import { SupabaseAuthGuard } from './auth/supabase.guard';

/**
 * Root NestJS module.
 *
 * For your section:
 *  - Registers GoogleAuthService + GoogleAuthController
 *  - Registers SupabaseAuthGuard so it’s injectable for @UseGuards()
 */
@Module({
  imports: [
    // Load environment variables (global)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    CalendarModule,
    PlanningModule,
  ],
  controllers: [
    AppController,
    CalendarController,
    PlanningController,
    GoogleAuthController,
  ],
  providers: [
    AppService,
    CalendarService,
    GoogleAuthService,
    SupabaseAuthGuard,
  ],
})
export class AppModule { }
