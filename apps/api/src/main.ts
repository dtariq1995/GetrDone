import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
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
  // On SIGTERM (e.g. Render or Docker stopping the container), run
  // onModuleDestroy hooks so the database pool closes cleanly.
  app.enableShutdownHooks();

  // Behind a proxy (Render), keep idle connections open longer than the
  // proxy does. Node's default is 5s: the proxy can then reuse a connection
  // Node has just closed, and the request fails with no response (a browser
  // shows ERR_CONNECTION_CLOSED). Browsers don't retry POSTs, so this hit a
  // sign-up on the hosted demo. headersTimeout must be the larger of the two.
  const server = app.getHttpServer() as Server;
  server.keepAliveTimeout = 120_000;
  server.headersTimeout = 121_000;

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
