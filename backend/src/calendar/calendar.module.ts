import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService], // ⬅️ planner will use this
})
export class CalendarModule {}

