// Reads a required environment variable, failing fast at startup with a clear
// message instead of failing later in a confusing way (e.g. signing tokens
// with an undefined secret).
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy apps/api/.env.example to apps/api/.env.`,
    );
  }
  return value;
}
