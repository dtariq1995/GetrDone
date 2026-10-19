import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, loggedInAgent, resetDatabase } from './test-app';

// Requests that are malformed, unauthenticated, or arrive in an awkward
// order. None of them should ever produce a 500.

describe('Edge cases (e2e)', () => {
  let app: INestApplication<App>;
  let agent: Awaited<ReturnType<typeof loggedInAgent>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    agent = await loggedInAgent(app, 'alice');
  });

  afterAll(async () => {
    await app.close();
  });

  const anonymous = () => request(app.getHttpServer());

  describe('authentication', () => {
    it.each([
      ['GET', '/api/auth/me'],
      ['GET', '/api/lists'],
      ['POST', '/api/lists'],
      ['PATCH', '/api/lists/some-id'],
      ['DELETE', '/api/lists/some-id'],
      ['GET', '/api/tasks?view=all'],
      ['GET', '/api/tasks/counts'],
      ['GET', '/api/tasks/some-id'],
      ['POST', '/api/tasks'],
      ['PATCH', '/api/tasks/some-id'],
      ['DELETE', '/api/tasks/some-id'],
    ])('%s %s returns 401 when logged out', async (method, path) => {
      await anonymous()
        [method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](path)
        .expect(401);
    });

    it('rejects an expired token', async () => {
      const me = await agent.get('/api/auth/me').expect(200);
      const expired = app
        .get(JwtService)
        .sign({ sub: me.body.id }, { expiresIn: -60 });
      await anonymous()
        .get('/api/auth/me')
        .set('Cookie', `access_token=${expired}`)
        .expect(401);
    });

    it('rejects a token signed with a different secret', async () => {
      const me = await agent.get('/api/auth/me').expect(200);
      const forged = new JwtService({ secret: 'not-the-real-secret' }).sign({
        sub: me.body.id,
      });
      await anonymous()
        .get('/api/auth/me')
        .set('Cookie', `access_token=${forged}`)
        .expect(401);
    });

    it('rejects a token that is not a JWT at all', async () => {
      await anonymous()
        .get('/api/lists')
        .set('Cookie', 'access_token=hello')
        .expect(401);
    });
  });

  describe('malformed requests', () => {
    it('rejects invalid JSON with 400', async () => {
      await agent
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": ')
        .expect(400);
    });

    it('rejects a JSON array instead of an object with 400', async () => {
      await agent
        .post('/api/tasks')
        .send([{ title: 'x' }])
        .expect(400);
    });

    it('rejects notes over the limit with 400', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', notes: 'x'.repeat(10_001) })
        .expect(400);
    });

    it('rejects a body over the size limit with 413', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', notes: 'x'.repeat(200_000) })
        .expect(413);
    });

    it('rejects an invalid calendar date with 400', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', dueAt: '2026-02-30T00:00:00Z' })
        .expect(400);
    });

    it('accepts an empty PATCH body as a no-op', async () => {
      const task = (await agent.post('/api/tasks').send({ title: 'Task' }))
        .body;
      const res = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({})
        .expect(200);
      expect(res.body.title).toBe('Task');
    });

    it('treats a search of only spaces as no search', async () => {
      await agent.post('/api/tasks').send({ title: 'Task' });
      const res = await agent.get('/api/tasks?view=all&q=%20%20').expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('awkward ordering', () => {
    it('returns 404 when changing a task that was just deleted', async () => {
      const task = (await agent.post('/api/tasks').send({ title: 'Task' }))
        .body;
      await agent.delete(`/api/tasks/${task.id}`).expect(204);
      await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ completed: true })
        .expect(404);
      await agent.delete(`/api/tasks/${task.id}`).expect(404);
    });

    it('returns 404 when adding a task to a list that was just deleted', async () => {
      const list = (await agent.post('/api/lists').send({ name: 'Work' })).body;
      await agent.delete(`/api/lists/${list.id}`).expect(204);
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', listId: list.id })
        .expect(404);
    });

    it('handles many quick-adds in parallel without losing any', async () => {
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          agent
            .post('/api/tasks')
            .send({ title: `Task ${i}` })
            .expect(201),
        ),
      );
      const res = await agent.get('/api/tasks?view=inbox').expect(200);
      expect(res.body).toHaveLength(10);
    });

    it('returns 409 when two people register the same name at once', async () => {
      const attempts = await Promise.all(
        [1, 2, 3].map(() =>
          anonymous()
            .post('/api/auth/register')
            .send({ username: 'racer', password: 'password123' }),
        ),
      );
      const statuses = attempts.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409, 409]);
    });
  });
});
