import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, loggedInAgent, resetDatabase } from './test-app';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';
const DAY = 24 * 60 * 60 * 1000;

// Midday UTC, `days` from today. Midday keeps the dates clear of midnight
// boundaries for the UTC-based view tests.
function middayUtc(days: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  return new Date(d.getTime() + days * DAY).toISOString();
}

type TaskBody = { id: string; title: string };
const titles = (res: request.Response) =>
  (res.body as TaskBody[]).map((t) => t.title);

describe('Tasks (e2e)', () => {
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

  const createTask = async (body: object) =>
    (await agent.post('/api/tasks').send(body).expect(201)).body as TaskBody & {
      [key: string]: unknown;
    };
  const createList = async (name: string) =>
    (
      (await agent.post('/api/lists').send({ name }).expect(201)).body as {
        id: string;
      }
    ).id;

  it('requires login', async () => {
    await request(app.getHttpServer()).get('/api/tasks?view=all').expect(401);
  });

  describe('creating', () => {
    it('creates an Inbox task with defaults', async () => {
      const task = await createTask({ title: '  Buy milk ' });
      expect(task).toMatchObject({
        title: 'Buy milk',
        notes: '',
        listId: null,
        parentId: null,
        dueAt: null,
        isAllDay: false,
        priority: 0,
        completedAt: null,
        subtasks: [],
      });
      expect(task).not.toHaveProperty('userId');
    });

    it('puts new tasks at the top', async () => {
      await createTask({ title: 'First' });
      await createTask({ title: 'Second' });
      const res = await agent.get('/api/tasks?view=inbox').expect(200);
      expect(titles(res)).toEqual(['Second', 'First']);
    });

    it('creates a task in a list, with all fields', async () => {
      const listId = await createList('Work');
      const task = await createTask({
        title: 'Report',
        notes: 'Q3 numbers',
        listId,
        dueAt: '2026-10-20T05:00:00.000Z',
        isAllDay: true,
        priority: 3,
      });
      expect(task).toMatchObject({
        listId,
        notes: 'Q3 numbers',
        dueAt: '2026-10-20T05:00:00.000Z',
        isAllDay: true,
        priority: 3,
      });
    });

    it('returns 404 for a list that does not exist', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', listId: MISSING_ID })
        .expect(404);
    });

    it.each([
      ['a missing title', {}],
      ['a blank title', { title: '   ' }],
      ['a title that is too long', { title: 'x'.repeat(501) }],
      ['a priority above 3', { title: 'Task', priority: 4 }],
      ['a fractional priority', { title: 'Task', priority: 1.5 }],
      ['an invalid due date', { title: 'Task', dueAt: 'tomorrow' }],
      ['a non-uuid list id', { title: 'Task', listId: 'inbox' }],
      ['a null isAllDay', { title: 'Task', isAllDay: null }],
      ['an unknown field', { title: 'Task', completedAt: '2026-01-01' }],
    ])('rejects %s with 400', async (_label, body) => {
      await agent.post('/api/tasks').send(body).expect(400);
    });
  });

  describe('updating', () => {
    it('edits fields and leaves the rest alone', async () => {
      const task = await createTask({ title: 'Old', priority: 2 });
      const res = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ title: 'New', notes: 'Details' })
        .expect(200);
      expect(res.body).toMatchObject({
        title: 'New',
        notes: 'Details',
        priority: 2,
      });
    });

    it('completes and un-completes a task', async () => {
      const task = await createTask({ title: 'Task' });

      const done = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ completed: true })
        .expect(200);
      expect(done.body.completedAt).toEqual(expect.any(String));

      // Completing again keeps the original timestamp.
      const again = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ completed: true })
        .expect(200);
      expect(again.body.completedAt).toBe(done.body.completedAt);

      const undone = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ completed: false })
        .expect(200);
      expect(undone.body.completedAt).toBeNull();
    });

    it('moves a task between lists and back to the Inbox', async () => {
      const listId = await createList('Work');
      const task = await createTask({ title: 'Task' });

      await agent.patch(`/api/tasks/${task.id}`).send({ listId }).expect(200);
      let res = await agent.get(`/api/tasks?view=list&listId=${listId}`);
      expect(titles(res)).toEqual(['Task']);

      await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ listId: null })
        .expect(200);
      res = await agent.get('/api/tasks?view=inbox');
      expect(titles(res)).toEqual(['Task']);
    });

    it('clears a due date with null', async () => {
      const task = await createTask({ title: 'Task', dueAt: middayUtc(1) });
      const res = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ dueAt: null })
        .expect(200);
      expect(res.body.dueAt).toBeNull();
    });

    it('returns 404 when moving to a list that does not exist', async () => {
      const task = await createTask({ title: 'Task' });
      await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ listId: MISSING_ID })
        .expect(404);
    });

    it.each([
      ['a null title', { title: null }],
      ['a blank title', { title: ' ' }],
      ['a null priority', { priority: null }],
      ['a non-boolean completed', { completed: 'yes' }],
      ['a parentId (not editable)', { parentId: MISSING_ID }],
    ])('rejects %s with 400', async (_label, body) => {
      const task = await createTask({ title: 'Task' });
      await agent.patch(`/api/tasks/${task.id}`).send(body).expect(400);
    });
  });

  describe('subtasks', () => {
    it('embeds subtasks in their parent and keeps them out of lists', async () => {
      const parent = await createTask({ title: 'Parent' });
      await createTask({ title: 'Step 1', parentId: parent.id });
      await createTask({ title: 'Step 2', parentId: parent.id });

      const res = await agent.get('/api/tasks?view=all').expect(200);
      expect(titles(res)).toEqual(['Parent']);
      expect(res.body[0].subtasks.map((s: TaskBody) => s.title)).toEqual([
        'Step 1',
        'Step 2',
      ]);
    });

    it('rejects a subtask of a subtask', async () => {
      const parent = await createTask({ title: 'Parent' });
      const child = await createTask({ title: 'Child', parentId: parent.id });
      await agent
        .post('/api/tasks')
        .send({ title: 'Grandchild', parentId: child.id })
        .expect(400);
    });

    it('moves subtasks with their parent, and not on their own', async () => {
      const listId = await createList('Work');
      const parent = await createTask({ title: 'Parent' });
      const child = await createTask({ title: 'Child', parentId: parent.id });

      await agent.patch(`/api/tasks/${child.id}`).send({ listId }).expect(400);

      await agent.patch(`/api/tasks/${parent.id}`).send({ listId }).expect(200);
      const res = await agent.get(`/api/tasks/${child.id}`).expect(200);
      expect(res.body.listId).toBe(listId);
    });

    it('deletes subtasks with their parent', async () => {
      const parent = await createTask({ title: 'Parent' });
      const child = await createTask({ title: 'Child', parentId: parent.id });

      await agent.delete(`/api/tasks/${parent.id}`).expect(204);
      await agent.get(`/api/tasks/${parent.id}`).expect(404);
      await agent.get(`/api/tasks/${child.id}`).expect(404);
    });
  });

  describe('views', () => {
    it('separates the Inbox from lists', async () => {
      const listId = await createList('Work');
      await createTask({ title: 'Inbox task' });
      await createTask({ title: 'Work task', listId });

      const inbox = await agent.get('/api/tasks?view=inbox').expect(200);
      expect(titles(inbox)).toEqual(['Inbox task']);
      const list = await agent
        .get(`/api/tasks?view=list&listId=${listId}`)
        .expect(200);
      expect(titles(list)).toEqual(['Work task']);
      const all = await agent.get('/api/tasks?view=all').expect(200);
      expect(titles(all).sort()).toEqual(['Inbox task', 'Work task']);
    });

    it('builds Today and Next 7 Days, including overdue tasks', async () => {
      await createTask({ title: 'Overdue', dueAt: middayUtc(-3) });
      await createTask({ title: 'Today', dueAt: middayUtc(0) });
      await createTask({ title: 'In 3 days', dueAt: middayUtc(3) });
      await createTask({ title: 'In 10 days', dueAt: middayUtc(10) });
      await createTask({ title: 'No date' });
      const doneLongAgo = await createTask({
        title: 'Done long ago',
        dueAt: middayUtc(-3),
      });
      await agent
        .patch(`/api/tasks/${doneLongAgo.id}`)
        .send({ completed: true });

      const today = await agent
        .get('/api/tasks?view=today&tz=UTC&sort=due')
        .expect(200);
      expect(titles(today)).toEqual(['Overdue', 'Today']);

      const next7 = await agent
        .get('/api/tasks?view=next7&tz=UTC&sort=due')
        .expect(200);
      expect(titles(next7)).toEqual(['Overdue', 'Today', 'In 3 days']);

      const counts = await agent.get('/api/tasks/counts?tz=UTC').expect(200);
      expect(counts.body).toEqual({ inbox: 5, today: 2, next7: 3 });
    });

    it('lists completed tasks, most recently finished first', async () => {
      const a = await createTask({ title: 'A' });
      const b = await createTask({ title: 'B' });
      await createTask({ title: 'Open' });
      await agent.patch(`/api/tasks/${a.id}`).send({ completed: true });
      await agent.patch(`/api/tasks/${b.id}`).send({ completed: true });

      const res = await agent.get('/api/tasks?view=completed').expect(200);
      expect(titles(res)).toEqual(['B', 'A']);
    });

    it('searches titles, ignoring case', async () => {
      await createTask({ title: 'Buy MILK' });
      await createTask({ title: 'Walk dog' });
      const res = await agent.get('/api/tasks?view=all&q=milk').expect(200);
      expect(titles(res)).toEqual(['Buy MILK']);
    });

    it('sorts by priority and by title', async () => {
      await createTask({ title: 'b-low', priority: 1 });
      await createTask({ title: 'a-high', priority: 3 });
      await createTask({ title: 'c-none' });

      const byPriority = await agent.get('/api/tasks?view=all&sort=priority');
      expect(titles(byPriority)).toEqual(['a-high', 'b-low', 'c-none']);
      const byTitle = await agent.get('/api/tasks?view=all&sort=title');
      expect(titles(byTitle)).toEqual(['a-high', 'b-low', 'c-none']);
    });

    it('returns 404 for a list view of a list that does not exist', async () => {
      await agent.get(`/api/tasks?view=list&listId=${MISSING_ID}`).expect(404);
    });

    it.each([
      ['no view', ''],
      ['an unknown view', '?view=someday'],
      ['a list view without a listId', '?view=list'],
      ['an unknown sort', '?view=all&sort=random'],
      ['an invalid time zone', '?view=today&tz=Mars/Olympus'],
      ['an unknown parameter', '?view=all&userId=x'],
    ])('rejects %s with 400', async (_label, query) => {
      await agent.get(`/api/tasks${query}`).expect(400);
    });
  });

  describe('missing tasks', () => {
    it('returns 404 for GET, PATCH and DELETE', async () => {
      await agent.get(`/api/tasks/${MISSING_ID}`).expect(404);
      await agent
        .patch(`/api/tasks/${MISSING_ID}`)
        .send({ title: 'x' })
        .expect(404);
      await agent.delete(`/api/tasks/${MISSING_ID}`).expect(404);
    });
  });
});
