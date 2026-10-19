import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp, loggedInAgent, resetDatabase } from './test-app';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

type Agent = Awaited<ReturnType<typeof loggedInAgent>>;

describe('Sections (e2e)', () => {
  let app: INestApplication<App>;
  let agent: Agent;
  let listId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    agent = await loggedInAgent(app, 'alice');
    listId = (await agent.post('/api/lists').send({ name: 'Work' })).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const createSection = async (name: string, inList = listId) =>
    (
      await agent
        .post(`/api/lists/${inList}/sections`)
        .send({ name })
        .expect(201)
    ).body as { id: string; position: number };

  const createTask = async (body: object) =>
    (await agent.post('/api/tasks').send(body).expect(201)).body as {
      id: string;
      sectionId: string | null;
    };

  describe('CRUD', () => {
    it('creates columns left to right and lists them in order', async () => {
      const todo = await createSection('  To do ');
      const doing = await createSection('Doing');
      expect(doing.position).toBeGreaterThan(todo.position);

      const res = await agent.get(`/api/lists/${listId}/sections`).expect(200);
      expect(res.body.map((s: { name: string }) => s.name)).toEqual([
        'To do',
        'Doing',
      ]);
    });

    it('renames and reorders a section', async () => {
      const section = await createSection('To do');
      const res = await agent
        .patch(`/api/sections/${section.id}`)
        .send({ name: 'Backlog', position: 0.5 })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Backlog', position: 0.5 });
    });

    it('moves tasks to "No section" when their section is deleted', async () => {
      const section = await createSection('To do');
      const task = await createTask({
        title: 'Task',
        listId,
        sectionId: section.id,
      });

      await agent.delete(`/api/sections/${section.id}`).expect(204);

      const res = await agent.get(`/api/tasks/${task.id}`).expect(200);
      expect(res.body.sectionId).toBeNull();
    });

    it('deletes sections with their list', async () => {
      await createSection('To do');
      await agent.delete(`/api/lists/${listId}`).expect(204);
      await agent.get(`/api/lists/${listId}/sections`).expect(404);
    });

    it.each([
      ['a missing name', {}],
      ['a blank name', { name: '  ' }],
      ['a long name', { name: 'x'.repeat(101) }],
      ['an unknown field', { name: 'x', listId: MISSING_ID }],
    ])('rejects creating with %s', async (_label, body) => {
      await agent.post(`/api/lists/${listId}/sections`).send(body).expect(400);
    });

    it('returns 404 for a list or section that does not exist', async () => {
      await agent.get(`/api/lists/${MISSING_ID}/sections`).expect(404);
      await agent
        .post(`/api/lists/${MISSING_ID}/sections`)
        .send({ name: 'x' })
        .expect(404);
      await agent
        .patch(`/api/sections/${MISSING_ID}`)
        .send({ name: 'x' })
        .expect(404);
      await agent.delete(`/api/sections/${MISSING_ID}`).expect(404);
    });
  });

  describe('tasks in sections', () => {
    it('creates a task in a section and moves it between sections', async () => {
      const todo = await createSection('To do');
      const done = await createSection('Done');
      const task = await createTask({
        title: 'Task',
        listId,
        sectionId: todo.id,
      });
      expect(task.sectionId).toBe(todo.id);

      const moved = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ sectionId: done.id, position: 3.5 })
        .expect(200);
      expect(moved.body).toMatchObject({ sectionId: done.id, position: 3.5 });

      const cleared = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ sectionId: null })
        .expect(200);
      expect(cleared.body.sectionId).toBeNull();
    });

    it('rejects a section from a different list with 400', async () => {
      const otherList: string = (
        await agent.post('/api/lists').send({ name: 'Home' })
      ).body.id;
      const otherSection = await createSection('Elsewhere', otherList);

      await agent
        .post('/api/tasks')
        .send({ title: 'Task', listId, sectionId: otherSection.id })
        .expect(400);
      // An Inbox task can't have a section at all.
      await agent
        .post('/api/tasks')
        .send({ title: 'Task', sectionId: otherSection.id })
        .expect(400);

      const task = await createTask({ title: 'Task', listId });
      await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ sectionId: otherSection.id })
        .expect(400);
    });

    it('clears the section when a task moves to another list', async () => {
      const section = await createSection('To do');
      const otherList: string = (
        await agent.post('/api/lists').send({ name: 'Home' })
      ).body.id;
      const task = await createTask({
        title: 'Task',
        listId,
        sectionId: section.id,
      });

      const res = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ listId: otherList })
        .expect(200);
      expect(res.body).toMatchObject({ listId: otherList, sectionId: null });
    });

    it('moves a task to another list and into one of its sections at once', async () => {
      const otherList: string = (
        await agent.post('/api/lists').send({ name: 'Home' })
      ).body.id;
      const otherSection = await createSection('Chores', otherList);
      const task = await createTask({ title: 'Task', listId });

      const res = await agent
        .patch(`/api/tasks/${task.id}`)
        .send({ listId: otherList, sectionId: otherSection.id })
        .expect(200);
      expect(res.body).toMatchObject({
        listId: otherList,
        sectionId: otherSection.id,
      });
    });

    it('rejects putting a subtask in a section', async () => {
      const section = await createSection('To do');
      const parent = await createTask({ title: 'Parent', listId });
      await agent
        .post('/api/tasks')
        .send({ title: 'Child', parentId: parent.id, sectionId: section.id })
        .expect(400);
    });
  });

  describe('isolation', () => {
    let bob: Agent;
    let aliceSection: { id: string };

    beforeEach(async () => {
      aliceSection = await createSection('Secret column');
      bob = await loggedInAgent(app, 'bob');
    });

    it("can't list, add to, rename or delete Alice's sections", async () => {
      await bob.get(`/api/lists/${listId}/sections`).expect(404);
      await bob
        .post(`/api/lists/${listId}/sections`)
        .send({ name: 'Planted' })
        .expect(404);
      await bob
        .patch(`/api/sections/${aliceSection.id}`)
        .send({ name: 'Hacked' })
        .expect(404);
      await bob.delete(`/api/sections/${aliceSection.id}`).expect(404);

      const res = await agent.get(`/api/lists/${listId}/sections`).expect(200);
      expect(res.body).toEqual([
        expect.objectContaining({ id: aliceSection.id, name: 'Secret column' }),
      ]);
    });

    it("can't put his own task into Alice's section", async () => {
      const bobList = (await bob.post('/api/lists').send({ name: 'Mine' })).body
        .id;
      const bobTask = (
        await bob
          .post('/api/tasks')
          .send({ title: 'Bob task', listId: bobList })
      ).body;

      // 404, not 400: Bob mustn't learn that the section exists.
      await bob
        .patch(`/api/tasks/${bobTask.id}`)
        .send({ sectionId: aliceSection.id })
        .expect(404);
      await bob
        .post('/api/tasks')
        .send({ title: 'x', listId: bobList, sectionId: aliceSection.id })
        .expect(404);
    });
  });
});
