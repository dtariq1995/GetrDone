import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

// Boots the real app (real database, real guards and validation) the same way
// main.ts does.
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

// Wipes all rows so every test starts from an empty database. Deleting the
// users cascades to their lists and tasks.
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.user.deleteMany();
}

// Registers a user and returns a supertest agent that keeps their auth
// cookie, so every request made with it is "logged in as" that user.
export async function loggedInAgent(
  app: INestApplication<App>,
  username: string,
) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);
  return agent;
}
