import { db, sql } from "./client";
import { categories } from "./schema";

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

async function seed() {
  await db
    .insert(categories)
    .values(SEED_CATEGORIES.map((name) => ({ name, isSeeded: true })))
    .onConflictDoNothing();
  console.log(`Seeded ${SEED_CATEGORIES.length} categories.`);
  await sql.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
