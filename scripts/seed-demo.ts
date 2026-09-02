/**
 * Manual demo seed script.
 *
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-demo.ts
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-demo.ts --reset
 */

import { seedDemoUser, DEMO_EMAIL, DEMO_PASSWORD, DEMO_API_KEY } from "../src/db/seed-demo";

const reset = process.argv.includes("--reset");

seedDemoUser({ reset })
  .then(() => {
    console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`API key: ${DEMO_API_KEY}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
