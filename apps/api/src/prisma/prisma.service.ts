import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { requireEnv } from '../common/env';

// The one database client for the whole app. Services inject this instead of
// creating their own PrismaClient, so they share one connection pool.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Prisma 7 talks to Postgres through a driver adapter (node-postgres here).
    super({
      adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
