import { Controller, Get, Post, Body, Req, UseGuards, Headers } from '@nestjs/common';
import { AppService } from './app.service';

// NOTE: You would implement a custom AuthGuard to validate JWTs from your React client
// For now, we'll focus on the structure.

/**
 * Controller to handle all task and scheduling API requests.
 */
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Status check endpoint for Cloud Run health checks.
   */
  @Get('status')
  getHello(): string {
    return this.appService.getHealthStatus();
  }

  @Get('calendar/events')
  async getCalendarEvents(@Headers('authorization') authHeader: string) {
    // Extract the Bearer token from headers
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' };
    }
    const accessToken = authHeader.split(' ')[1];

    // Use your service layer to fetch events from Google Calendar
    try {
      const events = await this.appService.fetchGoogleCalendarEvents(accessToken);
      return events; // Return JSON directly to the frontend
    } catch (error) {
      console.error(error);
      return { error: 'Failed to fetch events' };
    }
  }

  /**
   * Secure endpoint for AI Task Parsing and Clarification.
   * This is where you will interact with the Gemini API.
   * @param body The request body containing the user's natural language task (e.g., "finish project by Friday")
   */
  @Post('task/parse')
  // @UseGuards(AuthGuard) // Will be used later to ensure user is logged in
  async parseTask(@Body('taskText') taskText: string, @Req() req: any) {
    // 1. Retrieve the user's encrypted Google Refresh Token from Supabase/database
    //    using the user ID attached to the authenticated session/JWT (not yet implemented).
    const userId = 'placeholder-user-id';

    // 2. Pass the task text, user ID, and Calendar/Tasks context to the service layer.
    const structuredTask = await this.appService.processTaskWithAI(
      taskText,
      userId,
    );

    // 3. Return the structured JSON for the frontend to confirm.
    return structuredTask;
  }
}
