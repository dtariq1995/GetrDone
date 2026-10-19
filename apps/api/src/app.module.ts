import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ListsModule } from './lists/lists.module';
import { PrismaModule } from './prisma/prisma.module';
import { SectionsModule } from './sections/sections.module';
import { TasksModule } from './tasks/tasks.module';

// In production this server also serves the built React app (apps/web/dist),
// so the browser talks to one origin and the auth cookie needs no CORS
// setup. In development Vite serves the app instead, so this only switches
// on when a build exists.
const webDist = join(__dirname, '..', '..', 'web', 'dist');
const serveWeb = existsSync(join(webDist, 'index.html'))
  ? [
      ServeStaticModule.forRoot({
        rootPath: webDist,
        // Unknown /api routes stay JSON 404s; any other unknown path gets
        // index.html so React Router can handle it (e.g. /today on refresh).
        exclude: ['/api/{*path}'],
      }),
    ]
  : [];

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ListsModule,
    SectionsModule,
    TasksModule,
    ...serveWeb,
  ],
  controllers: [AppController],
  providers: [
    // Every route requires a logged-in user unless it is marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
