import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp, loggedInAgent, resetDatabase } from './test-app';

// The key guarantee: one user can never see or change another user's data.
// Alice owns a list, a task in it, a subtask and an Inbox task. Bob tries
// every route against them. Each attempt must fail with the same 404 a
// non-existent id gets (so Bob can't even tell they exist), and Alice's data
// must be unchanged afterwards.

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

type Agent = Awaited<ReturnType<typeof loggedInAgent>>;

describe('User isolation (e2e)', () => {
  let app: INestApplication<App>;
  let alice: Agent;
  let bob: Agent;
  let aliceList: { id: string };
  let aliceTask: { id: string };
  let aliceSubtask: { id: string };
  let aliceInboxTask: { id: string };
  let notFoundBody: unknown;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    alice = await loggedInAgent(app, 'alice');
    bob = await loggedInAgent(app, 'bob');

    aliceList = (await alice.post('/api/lists').send({ name: 'Secret plans' }))
      .body;
    aliceTask = (
      await alice.post('/api/tasks').send({
        title: 'Secret task',
        listId: aliceList.id,
        dueAt: new Date().toISOString(),
      })
    ).body;
    aliceSubtask = (
      await alice
        .post('/api/tasks')
        .send({ title: 'Secret step', parentId: aliceTask.id })
    ).body;
    aliceInboxTask = (
      await alice.post('/api/tasks').send({ title: 'Secret inbox task' })
    ).body;

    // What Bob gets for a task that truly doesn't exist, for comparison.
    notFoundBody = (await bob.get(`/api/tasks/${MISSING_ID}`).expect(404)).body;
  });

  afterAll(async () => {
    await app.close();
  });

  // Alice's data, as Alice sees it, after Bob's attempts.
  async function expectAliceUnchanged() {
    const lists = await alice.get('/api/lists').expect(200);
    expect(lists.body).toEqual([
      expect.objectContaining({
        id: aliceList.id,
        name: 'Secret plans',
        taskCount: 1,
      }),
    ]);
    const task = await alice.get(`/api/tasks/${aliceTask.id}`).expect(200);
    expect(task.body).toMatchObject({
      title: 'Secret task',
      listId: aliceList.id,
      completedAt: null,
      subtasks: [expect.objectContaining({ id: aliceSubtask.id })],
    });
    await alice.get(`/api/tasks/${aliceInboxTask.id}`).expect(200);
  }

  describe('reading', () => {
    it("doesn't include Alice's lists in Bob's lists", async () => {
      const res = await bob.get('/api/lists').expect(200);
      expect(res.body).toEqual([]);
    });

    it.each(['inbox', 'today', 'next7', 'all', 'completed'])(
      "doesn't include Alice's tasks in Bob's %s view",
      async (view) => {
        const res = await bob.get(`/api/tasks?view=${view}&tz=UTC`).expect(200);
        expect(res.body).toEqual([]);
      },
    );

    it("doesn't find Alice's tasks through search", async () => {
      const res = await bob.get('/api/tasks?view=all&q=secret').expect(200);
      expect(res.body).toEqual([]);
    });

    it("doesn't count Alice's tasks in Bob's sidebar counts", async () => {
      const res = await bob.get('/api/tasks/counts?tz=UTC').expect(200);
      expect(res.body).toEqual({ inbox: 0, today: 0, next7: 0 });
    });

    it("returns 404 for a view of Alice's list", async () => {
      const res = await bob
        .get(`/api/tasks?view=list&listId=${aliceList.id}`)
        .expect(404);
      expect(res.body).toEqual({
        ...(notFoundBody as object),
        message: 'List not found',
      });
    });

    it.each([
      ['task', () => aliceTask.id],
      ['subtask', () => aliceSubtask.id],
      ['Inbox task', () => aliceInboxTask.id],
    ])(
      "returns the same 404 for Alice's %s as for a missing one",
      async (_label, id) => {
        const res = await bob.get(`/api/tasks/${id()}`).expect(404);
        expect(res.body).toEqual(notFoundBody);
      },
    );
  });

  describe('changing', () => {
    it("can't rename, recolour or delete Alice's list", async () => {
      await bob
        .patch(`/api/lists/${aliceList.id}`)
        .send({ name: 'Hacked', color: '#000000' })
        .expect(404);
      await bob.delete(`/api/lists/${aliceList.id}`).expect(404);
      await expectAliceUnchanged();
    });

    it.each([
      ['title', { title: 'Hacked' }],
      ['completion', { completed: true }],
      ['list (to Bob’s Inbox)', { listId: null }],
      ['position', { position: -100 }],
    ])("can't change the %s of Alice's task", async (_label, changes) => {
      await bob.patch(`/api/tasks/${aliceTask.id}`).send(changes).expect(404);
      await bob
        .patch(`/api/tasks/${aliceSubtask.id}`)
        .send(changes)
        .expect(404);
      await expectAliceUnchanged();
    });

    it("can't delete Alice's tasks or subtasks", async () => {
      await bob.delete(`/api/tasks/${aliceTask.id}`).expect(404);
      await bob.delete(`/api/tasks/${aliceSubtask.id}`).expect(404);
      await bob.delete(`/api/tasks/${aliceInboxTask.id}`).expect(404);
      await expectAliceUnchanged();
    });

    it("can't create a task in Alice's list", async () => {
      await bob
        .post('/api/tasks')
        .send({ title: 'Planted', listId: aliceList.id })
        .expect(404);
      await expectAliceUnchanged();
      const bobs = await bob.get('/api/tasks?view=all').expect(200);
      expect(bobs.body).toEqual([]);
    });

    it("can't add a subtask to Alice's task", async () => {
      await bob
        .post('/api/tasks')
        .send({ title: 'Planted', parentId: aliceTask.id })
        .expect(404);
      await expectAliceUnchanged();
    });

    it("can't move his own task into Alice's list", async () => {
      const bobTask = (
        await bob.post('/api/tasks').send({ title: 'Bob task' }).expect(201)
      ).body;
      await bob
        .patch(`/api/tasks/${bobTask.id}`)
        .send({ listId: aliceList.id })
        .expect(404);

      const res = await bob.get(`/api/tasks/${bobTask.id}`).expect(200);
      expect(res.body.listId).toBeNull();
      await expectAliceUnchanged();
    });

    it("can't claim Alice's data by sending a userId", async () => {
      await bob
        .post('/api/tasks')
        .send({ title: 'Mine now', userId: 'alice' })
        .expect(400);
      await bob
        .patch(`/api/lists/${aliceList.id}`)
        .send({ userId: 'bob' })
        .expect(400);
      await expectAliceUnchanged();
    });
  });

  it("leaves Alice's own access working after all of the above", async () => {
    await alice
      .patch(`/api/tasks/${aliceTask.id}`)
      .send({ completed: true })
      .expect(200);
    await alice.delete(`/api/lists/${aliceList.id}`).expect(204);
    await alice.get(`/api/tasks/${aliceTask.id}`).expect(404);
  });
});
