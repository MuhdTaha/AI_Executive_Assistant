import { Body, Controller, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ExecService } from './services/exec.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';

@Controller('exec')
@UseGuards(SupabaseAuthGuard)
export class ExecController {
  constructor(private readonly exec: ExecService) {}

  @Post('start')
  async start(@Req() req, @Body() body: { userId: string; taskId: string; blockId?: string }) {
    if (!body?.userId || !body?.taskId) throw new BadRequestException('userId and taskId required');
    return this.exec.start(body.userId, body.taskId, body.blockId);
  }

  @Post('stop')
  async stop(@Req() req, @Body() body: { userId: string; taskId: string }) {
    if (!body?.userId || !body?.taskId) throw new BadRequestException('userId and taskId required');
    return this.exec.stop(body.userId, body.taskId);
  }

  @Post('done')
  async done(@Req() req, @Body() body: { userId: string; taskId: string }) {
    if (!body?.userId || !body?.taskId) throw new BadRequestException('userId and taskId required');
    return this.exec.done(body.userId, body.taskId);
  }
}

