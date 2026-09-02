import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "./client";
import { categories, connections, user } from "./schema";
import { seedDemoUser } from "./seed-demo";

const SEED_CATEGORIES = [
  "Tech",
  "Programming",
  "Career",
  "Finance",
  "Health & Fitness",
  "Food",
  "Travel",
  "Design",
  "Entertainment",
  "News",
  "Education",
  "Other",
];

export async function runMigrations() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await migrate(db, { migrationsFolder: "drizzle" });
      await db
        .insert(categories)
        .values(SEED_CATEGORIES.map((name) => ({ name, isSeeded: true })))
        .onConflictDoNothing();
      await encryptLegacyPlaintext();
      await seedDemoUser();
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[migrate] attempt ${attempt} failed, retrying in 2s…`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

/**
 * Idempotent one-time pass: encrypt any anthropic_api_key / refresh_token
 * values that are still stored as plaintext (rows created before this version).
 */
async function encryptLegacyPlaintext(): Promise<void> {
  // Only run if the secret is present (otherwise nothing to encrypt with)
  if (!process.env.BETTER_AUTH_SECRET) return;
  const { encrypt, isEncrypted } = await import("@/lib/crypto");

  const userRows = await db.select({ id: user.id, key: user.anthropicApiKey }).from(user);
  for (const row of userRows) {
    if (row.key && !isEncrypted(row.key)) {
      await sql`UPDATE "user" SET anthropic_api_key = ${encrypt(row.key)} WHERE id = ${row.id}`;
    }
  }

  const connRows = await db.select({ id: connections.id, token: connections.refreshToken }).from(connections);
  for (const row of connRows) {
    if (row.token && !isEncrypted(row.token)) {
      await sql`UPDATE connections SET refresh_token = ${encrypt(row.token)} WHERE id = ${row.id}`;
    }
  }
}
