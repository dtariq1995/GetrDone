import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, loggedInAgent, resetDatabase } from './test-app';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Lists (e2e)', () => {
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

  it('requires login', async () => {
    await request(app.getHttpServer()).get('/api/lists').expect(401);
  });

  it('starts empty', async () => {
    const res = await agent.get('/api/lists').expect(200);
    expect(res.body).toEqual([]);
  });

  it('creates lists in order, trimming the name and picking a colour', async () => {
    const work = await agent
      .post('/api/lists')
      .send({ name: '  Work  ' })
      .expect(201);
    expect(work.body).toEqual({
      id: expect.any(String),
      name: 'Work',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      position: 1,
      createdAt: expect.any(String),
    });

    await agent
      .post('/api/lists')
      .send({ name: 'Home', color: '#123abc' })
      .expect(201);

    const res = await agent.get('/api/lists').expect(200);
    expect(res.body.map((l: { name: string }) => l.name)).toEqual([
      'Work',
      'Home',
    ]);
    expect(res.body[1].color).toBe('#123abc');
  });

  it('counts only unfinished top-level tasks', async () => {
    const list = await agent.post('/api/lists').send({ name: 'Work' });
    const listId = list.body.id;
    const open = await agent.post('/api/tasks').send({ title: 'Open', listId });
    const done = await agent.post('/api/tasks').send({ title: 'Done', listId });
    await agent.patch(`/api/tasks/${done.body.id}`).send({ completed: true });
    await agent
      .post('/api/tasks')
      .send({ title: 'Subtask', parentId: open.body.id });

    const res = await agent.get('/api/lists').expect(200);
    expect(res.body[0].taskCount).toBe(1);
  });

  it('renames, recolours and reorders a list', async () => {
    const list = await agent.post('/api/lists').send({ name: 'Work' });
    const res = await agent
      .patch(`/api/lists/${list.body.id}`)
      .send({ name: 'Job', color: '#000000', position: 5.5 })
      .expect(200);
    expect(res.body).toMatchObject({
      name: 'Job',
      color: '#000000',
      position: 5.5,
    });
  });

  it('deletes a list along with its tasks', async () => {
    const list = await agent.post('/api/lists').send({ name: 'Work' });
    const task = await agent
      .post('/api/tasks')
      .send({ title: 'Task', listId: list.body.id });

    await agent.delete(`/api/lists/${list.body.id}`).expect(204);

    await agent.get(`/api/tasks/${task.body.id}`).expect(404);
    const res = await agent.get('/api/lists').expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 for a list that does not exist', async () => {
    await agent
      .patch(`/api/lists/${MISSING_ID}`)
      .send({ name: 'x' })
      .expect(404);
    await agent.delete(`/api/lists/${MISSING_ID}`).expect(404);
    await agent.delete('/api/lists/not-a-uuid').expect(404);
  });

  it.each([
    ['a missing name', {}],
    ['a blank name', { name: '   ' }],
    ['a name that is too long', { name: 'x'.repeat(101) }],
    ['a bad colour', { name: 'Work', color: 'red' }],
    ['an unknown field', { name: 'Work', userId: MISSING_ID }],
  ])('rejects creating with %s', async (_label, body) => {
    await agent.post('/api/lists').send(body).expect(400);
  });

  it.each([
    ['a null name', { name: null }],
    ['a blank name', { name: '' }],
    ['a non-number position', { position: 'first' }],
  ])('rejects updating with %s', async (_label, body) => {
    const list = await agent.post('/api/lists').send({ name: 'Work' });
    await agent.patch(`/api/lists/${list.body.id}`).send(body).expect(400);
  });
});
