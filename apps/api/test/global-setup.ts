import { execSync } from 'node:child_process';

// Runs once before the whole e2e suite: brings the test database's schema up
// to date by applying the same migrations production uses.
export default function globalSetup(): void {
  process.loadEnvFile('.env.test');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `Could not migrate the test database. Is it running? Start it with "npm run db:up" from the repo root.\n${output}`,
    );
  }
}
