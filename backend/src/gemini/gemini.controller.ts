import { Body, Controller, Post } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { InsertMessageDto } from './dto/insert-message.dto';

@Controller('api/gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post()
  async sendMessage(@Body() body: InsertMessageDto) {
    return await this.geminiService.generateResponse(body);
  }
}
