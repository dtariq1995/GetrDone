import { existsSync } from 'node:fs';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma/prisma.service';

// Creates a demo account with some sample data, so a reviewer can log in and
// see the app working straight away. Safe to run on every start: if the demo
// user already exists it does nothing.
//
//   username: demo   password: demo-password
//
// Run with `npm run seed -w apps/api` (after a build), or automatically by
// the Docker image on start-up.

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo-password';

// A date `days` from today, at `hour` UTC. All-day tasks normally store
// midnight in the user's own time zone, but the seed can't know where the
// reviewer is, so it uses midday UTC (the default): that falls on the same
// calendar day everywhere from UTC-11 to UTC+11. (Server midnight would be
// UTC midnight in Docker, which shows as the day before in the Americas.)
function day(days: number, hour = 12): Date {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function seed() {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const prisma = new PrismaService();

  try {
    const existing = await prisma.user.findUnique({
      where: { username: DEMO_USERNAME },
    });
    if (existing) {
      console.log('Seed: demo user already exists, nothing to do.');
      return;
    }

    const user = await prisma.user.create({
      data: {
        username: DEMO_USERNAME,
        passwordHash: await argon2.hash(DEMO_PASSWORD, {
          type: argon2.argon2id,
        }),
      },
    });
    const userId = user.id;

    const work = await prisma.list.create({
      data: { userId, name: 'Work', color: '#6366f1', position: 1 },
    });
    const home = await prisma.list.create({
      data: { userId, name: 'Home', color: '#10b981', position: 2 },
    });
    const [todo, doing, done] = await Promise.all(
      ['To do', 'In progress', 'Review'].map((name, i) =>
        prisma.section.create({
          data: { listId: work.id, name, position: i + 1 },
        }),
      ),
    );

    const report = await prisma.task.create({
      data: {
        userId,
        listId: work.id,
        sectionId: doing.id,
        title: 'Write the Q3 report',
        notes: 'Pull the numbers from the finance dashboard.',
        dueAt: day(0, 15),
        priority: 3,
        position: 1,
      },
    });
    await prisma.task.createMany({
      data: [
        {
          userId,
          parentId: report.id,
          listId: work.id,
          title: 'Outline',
          position: 1,
          completedAt: new Date(),
        },
        {
          userId,
          parentId: report.id,
          listId: work.id,
          title: 'First draft',
          position: 2,
        },
        {
          userId,
          parentId: report.id,
          listId: work.id,
          title: 'Get feedback',
          position: 3,
        },
        {
          userId,
          listId: work.id,
          sectionId: todo.id,
          title: 'Plan next sprint',
          dueAt: day(1),
          isAllDay: true,
          priority: 2,
          position: 2,
        },
        {
          userId,
          listId: work.id,
          sectionId: todo.id,
          title: 'Book team lunch',
          dueAt: day(4),
          isAllDay: true,
          position: 3,
        },
        {
          userId,
          listId: work.id,
          sectionId: done.id,
          title: 'Review pull requests',
          priority: 1,
          position: 4,
        },
        {
          userId,
          listId: home.id,
          title: 'Buy groceries',
          dueAt: day(0),
          isAllDay: true,
          position: 1,
        },
        {
          userId,
          listId: home.id,
          title: 'Renew passport',
          dueAt: day(-2),
          isAllDay: true,
          priority: 3,
          position: 2,
        },
        {
          userId,
          listId: home.id,
          title: 'Call the plumber',
          dueAt: day(2, 10),
          position: 3,
        },
        {
          userId,
          title: 'Try GetrDone’s keyboard shortcuts (press ?)',
          position: 1,
        },
        {
          userId,
          title: 'Water the plants',
          dueAt: day(-1),
          isAllDay: true,
          position: 2,
          completedAt: new Date(),
        },
      ],
    });

    console.log(
      `Seed: created "${DEMO_USERNAME}" with sample lists and tasks.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
