import { BadRequestException, Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { PlannerService } from './services/planner.service';
import { PlanConfirmRequestZ, PlanProposeRequestZ, ReplanRequestZ } from './types/dto';
import { SupabaseAuthGuard } from '../auth/supabase.guard';

@Controller('planning')
@UseGuards(SupabaseAuthGuard)
export class PlanningController {
  constructor(private readonly planner: PlannerService) {}

  @Post('propose')
  async propose(@Body() body: unknown) {
    const parsed = PlanProposeRequestZ.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.format());
    return this.planner.propose(parsed.data);
  }

  @Post('confirm')
  async confirm(@Req() req, @Body() body: unknown) {
    const parsed = PlanConfirmRequestZ.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.format());
    return this.planner.confirmWithUser(parsed.data, req.user);
  }

  @Post('replan')
  async replan(@Body() body: unknown) {
    const parsed = ReplanRequestZ.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.format());
    return this.planner.replan(parsed.data);
  }
}

