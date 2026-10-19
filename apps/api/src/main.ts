import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // Local dev reads apps/api/.env; in production the host sets the variables.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
