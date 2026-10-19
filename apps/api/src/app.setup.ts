import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

// App-wide settings, shared by main.ts and the e2e tests so tests run against
// exactly the same configuration as the real server.
export function configureApp(app: INestApplication): void {
  // Every API route lives under /api, so in production the same server can
  // serve the React app on every other path (single origin).
  app.setGlobalPrefix('api');

  // Parses the Cookie header into req.cookies, where the JWT strategy reads
  // the auth token.
  app.use(cookieParser());

  // Validates every request body against its DTO class before it reaches a
  // controller. whitelist + forbidNonWhitelisted reject unknown fields with a
  // 400 (so a client can't slip in e.g. a userId); transform runs the DTOs'
  // @Transform hooks and gives controllers real DTO instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
