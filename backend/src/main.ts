  import { config } from 'dotenv';
  config();

  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';

  /**
   * The main entry point for the NestJS application.
   */
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // --- Security Configuration for Web Apps ---
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5173'], // Change this to your Cloudflare Pages URL in production
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    const port = process.env.PORT || 8080;
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
  }
  bootstrap();
