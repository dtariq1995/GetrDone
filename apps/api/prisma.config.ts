import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env on its own. Node's built-in loader does the
// same job without adding a dependency. In production the variables are set
// by the host, so there is no .env file.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Used by the Prisma CLI (migrations), not by the running app. On Neon,
    // DATABASE_URL goes through a connection pooler (PgBouncer), which breaks
    // migrations, so prefer the direct connection when it's set. Locally
    // there's only DATABASE_URL, which is already direct.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
