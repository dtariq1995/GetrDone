// Runs before each test file. Loads .env.test so the app under test connects
// to the throwaway db-test database, never the dev database.
process.loadEnvFile('.env.test');
