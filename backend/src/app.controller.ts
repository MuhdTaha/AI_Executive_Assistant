// app.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { InsertMessageDto } from './gemini/dto/insert-message.dto';
import { GeminiService } from './gemini/gemini.service';
import { SupabaseAuthGuard } from './auth/supabase.guard';
import { AuthService } from './auth/auth.service';
import { EnsureUserDto } from './auth/dto/ensure-user.dto';
import { TasksService } from './tasks/tasks.service';
import { ReadyToCreateResponse, ChatResponse } from './gemini/types/chat-response.types';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly geminiService: GeminiService,
    private readonly authService: AuthService,
    private readonly tasksService: TasksService,
  ) {}

  @Post('chat')
  @UseGuards(SupabaseAuthGuard)
  async handleChat(@Body() body: InsertMessageDto, @Req() req: any): Promise<any> {
    console.log(`Received chat request: "${body.message}" from user: ${req.user?.id}`);
    console.log('Received body:', body);
    console.log('Context:', body.context);
    console.log('Partial task:', body.partialTask);

    const response: ChatResponse = await this.geminiService.generateResponse({
      ...body,
      userId: req.user?.id
    });

    // Use type guard to check if response is ReadyToCreateResponse
    if (this.isReadyToCreateResponse(response) && req.user?.id) {
      try {
        const taskData = {
          title: response.parsed_task.title,
          user_id: req.user.id,
          notes: response.parsed_task.notes || `Created from chat: "${body.message}"`,
          due_date: response.parsed_task.due_date || null,
          priority: response.parsed_task.priority || 'med',
          est_minutes: response.parsed_task.est_minutes || null,
          status: 'todo' as const,
        };

        const createdTask = await this.tasksService.createTask(taskData);
        
        // Return a TaskCreatedResponse
        return {
          ...response,
          task_created: true,
          task: createdTask,
          response: `✅ Task created: "${response.parsed_task.title}"${response.parsed_task.due_date ? ` (Due: ${response.parsed_task.due_date})` : ''}${response.parsed_task.priority ? ` [${response.parsed_task.priority} priority]` : ''}${response.parsed_task.est_minutes ? ` ⏱️ ${response.parsed_task.est_minutes}min` : ''}`
        };
      } catch (error) {
        console.error('Error creating task:', error);
        return {
          ...response,
          response: `I understood your task but couldn't save it: ${error.message}`
        };
      }
    }

    return response;
  }

  // Type guard to check if response is ReadyToCreateResponse
  private isReadyToCreateResponse(response: ChatResponse): response is ReadyToCreateResponse {
    return (response as ReadyToCreateResponse).ready_to_create === true;
  }

  @Post('auth/ensure-user')
  @UseGuards(SupabaseAuthGuard)
  async ensureUser(@Body() body: EnsureUserDto, @Req() req: any) {
    body.id = req.user.id;
    body.email = req.user.email;
    return this.authService.ensureUser(body);
  }

  @Get('status')
  getHello(): string {
    return this.appService.getHealthStatus();
  }

  @Post('task/parse')
  async parseTask(@Body('taskText') taskText: string, @Req() req: any) {
    const userId = req.user?.id || 'placeholder-user-id';
    const structuredTask = await this.appService.processTaskWithAI(taskText, userId);
    return structuredTask;
  }
}