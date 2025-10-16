import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Used for environment variables
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CalendarController } from './calendar/calendar.controller';
import { CalendarService } from './calendar/calendar.service';

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
  ],
  controllers: [AppController, CalendarController],
  providers: [AppService, CalendarService],
})
export class AppModule {}
