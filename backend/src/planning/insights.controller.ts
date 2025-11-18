import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { InsightsService } from './services/insights.service';

@Controller('insights')
@UseGuards(SupabaseAuthGuard)
export class InsightsController {
  constructor(private readonly svc: InsightsService) {}

  @Post('daily')
  async daily(@Body() body: { userId: string; date: string }) {
    if (!body?.userId || !body?.date) throw new BadRequestException('userId and date required');
    return this.svc.daily(body.userId, body.date);
  }

  @Post('weekly')
  async weekly(@Body() body: { userId: string; date: string }) {
    if (!body?.userId || !body?.date) throw new BadRequestException('userId and date required');
    return this.svc.weekly(body.userId, body.date);
  }
}

