// One SQLite file per vitest run (keyed by the main process pid) so two runs in the same repo never share or wipe
// each other's database.
export const TEST_DB_FILE = `prisma/test-${process.pid}.db`;
export const TEST_DB_URL = `file:./${TEST_DB_FILE}`;
