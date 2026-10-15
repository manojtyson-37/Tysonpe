// One database per vitest run so two runs in the same repo never share or wipe each other's data.
// Default: a SQLite file keyed by the main process pid. TEST_DATABASE_URL=postgresql://... runs the suite on
// Postgres instead (the schema is reset at the start of the run, so point it at a throwaway database).
export const TEST_DB_FILE = `prisma/test-${process.pid}.db`;
export const TEST_DB_URL = process.env.TEST_DATABASE_URL || `file:./${TEST_DB_FILE}`;
export const TEST_DB_IS_POSTGRES = /^postgres(ql)?:\/\//.test(TEST_DB_URL);
