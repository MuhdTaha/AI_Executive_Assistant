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
import { GeminiService } from './gemini/gemini.service';
import { GeminiController } from './gemini/gemini.controller';
import { AuthService } from './auth/auth.service';
import { TasksService } from './tasks/tasks.service';
import { SupabaseAdminProvider } from './db/supabase-admin.provider';
/**
 * The root module definition for the NestJS application.
 */
@Module({
  imports: [
    // Load environment variables from a .env file (for local development)
    // This is managed by Cloud Run in production.
    ConfigModule.forRoot({
      isGlobal: true, // Makes environment variables accessible everywhere
    }),
    DbModule,
    CalendarModule,
    PlanningModule,
  ],
  // Calendar & planning controllers are registered in their own modules,
  // so we only list the root + Gemini here.
  controllers: [AppController, CalendarController, GeminiController],
  // CalendarService & SupabaseAdminProvider are provided by their modules.
  providers: [AppService, CalendarService, GeminiService, AuthService, TasksService, SupabaseAdminProvider],
})
export class AppModule {}
