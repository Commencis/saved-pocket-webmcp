import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __savedpocketSql?: ReturnType<typeof postgres>;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://savedpocket:savedpocket@localhost:5432/savedpocket";

// Reuse the connection across next dev hot reloads
const client =
  globalForDb.__savedpocketSql ?? postgres(connectionString, { max: 10 });
globalForDb.__savedpocketSql = client;

export const db = drizzle(client, { schema });
export { client as sql };
