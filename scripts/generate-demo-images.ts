/**
 * Generate AI images for demo items using DALL-E 3.
 *
 * Run AFTER seed-demo.ts:
 *   OPENAI_API_KEY=sk-... DATABASE_URL=<url> npx tsx scripts/generate-demo-images.ts
 *
 * - Generates one 1024×1024 image per demo item (skips items that already have localImagePath)
 * - Downloads the image to data/images/<itemId>.png
 * - Updates items.local_image_path in the database
 * - Safe to re-run: already-generated images are skipped
 */

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "../src/db/client";
import { items, user } from "../src/db/schema";

const DEMO_EMAIL = "demouser@savedpocket.com";
const IMAGE_DIR = path.resolve(process.cwd(), "data", "images");

// Per-item DALL-E prompts — abstract/illustrative only, no real people/faces
const ITEM_PROMPTS: Record<string, string> = {
  "https://www.instagram.com/p/demo-morning-routine/":
    "Minimalist flat-lay photo of a morning routine: open journal, steaming coffee cup, sunrise light on a clean desk. Warm golden tones, no people.",
  "https://www.instagram.com/p/demo-manti-recipe/":
    "Overhead food photography of Turkish mantı dumplings in a white bowl, drizzled with red paprika butter and white garlic yogurt. Rustic wooden table. Appetizing, no people.",
  "https://www.instagram.com/p/demo-istanbul-golden-hour/":
    "Golden hour cityscape photograph of the Bosphorus strait in Istanbul, silhouette of a bridge and minarets against a dramatic orange and purple sky. Cinematic, no people.",
  "https://www.instagram.com/p/demo-invest-in-yourself/":
    "Inspirational minimal poster: books, a small plant, and a pen arranged on a light marble surface. Soft natural light. Clean aesthetic, no people.",

  "https://www.linkedin.com/posts/demo-ai-product-management/":
    "Abstract digital illustration of AI and product management: interconnected nodes, roadmap timelines, and a glowing brain icon on a dark blue background. Professional, no people.",
  "https://www.linkedin.com/posts/demo-junior-to-senior/":
    "Illustration of a winding upward path through stylized code brackets and terminal windows, representing career progression. Clean vector art, no people.",
  "https://www.linkedin.com/posts/demo-turkish-startups-vc/":
    "Aerial illustration of Istanbul skyline with startup rocket icons and upward-trending graph lines overlaid. Modern flat design, no people.",
  "https://www.linkedin.com/posts/demo-remote-work-experiment/":
    "Cozy home office setup illustration: a clean desk with a laptop, plants, and soft window light. Flat design, warm colors, no people.",

  "https://x.com/demo_user/status/1001-typescript-tricks":
    "Dark-mode code editor screenshot aesthetic showing TypeScript generics code with colorful syntax highlighting. Abstract, no faces.",
  "https://x.com/demo_user/status/1002-building-in-public":
    "Clean growth chart and metrics dashboard illustration on a dark background. Green upward lines, milestone markers. No people.",
  "https://x.com/demo_user/status/1003-ship-earlier":
    "Flat illustration of a paper airplane being launched, trailing a colorful dotted line path. Minimal and optimistic. No people.",
  "https://x.com/demo_user/status/1004-rag-vs-finetuning":
    "Abstract diagram illustration showing two AI pipeline architectures side by side: one with a retrieval step and one with fine-tuning loops. Clean vector art on white background.",

  "https://www.youtube.com/watch?v=demo-nextjs-postgresql":
    "Flat illustration of stacked technology logos: a stylized Next.js triangle, an elephant (PostgreSQL mascot), and a TypeScript T, arranged as a playful tech stack tower. Clean vector art.",
  "https://www.youtube.com/watch?v=demo-system-design-twitter":
    "Architectural diagram illustration of a distributed system: servers, load balancers, message queues, and databases connected by arrows. Blueprint style, blue and white.",
  "https://www.youtube.com/watch?v=demo-atomic-habits":
    "Minimalist illustration of a tiny seed growing into a large tree, with '1%' text and small upward arrows. Represents compound growth of habits. Clean, motivational.",
  "https://www.youtube.com/watch?v=demo-postgresql-performance":
    "Abstract data visualization art: glowing blue database cylinders and lightning bolt performance icons on a dark background. No people.",

  "https://posthog.com/blog/saas-pricing-playbook":
    "Flat illustration of three pricing tier cards (Free, Pro, Enterprise) with coin stacks and checkmark lists. Clean SaaS pricing table visual. No people.",
  "https://dev.to/demo/drizzle-vs-prisma":
    "Illustration of two stylized ORM frameworks facing each other: a dragonfly icon (Drizzle) and a geometric prism (Prisma). VS battle card style. No people.",
  "https://www.indiehackers.com/post/how-i-got-first-100-customers":
    "Flat illustration of 100 small user icons arranged in a grid, transitioning from empty to filled. Milestone achievement visual. Warm colors, no faces.",
  "https://linear.app/blog/design-principles":
    "Abstract product design illustration: a minimal interface wireframe with geometric shapes suggesting speed and clarity. Linear-style dark purple background, white elements.",
};

async function generateImages() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY is required.");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  await mkdir(IMAGE_DIR, { recursive: true });

  // Find demo user
  const demoUser = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });
  if (!demoUser) {
    console.error(`Demo user not found. Run seed-demo.ts first.`);
    process.exit(1);
  }

  // Fetch all demo items
  const demoItems = await db.query.items.findMany({
    where: eq(items.userId, demoUser.id),
  });

  console.log(`Found ${demoItems.length} demo items. Generating images…\n`);

  for (const item of demoItems) {
    if (item.localImagePath) {
      console.log(`  ✓ skip ${item.title?.slice(0, 50)} (already has image)`);
      continue;
    }

    const prompt = ITEM_PROMPTS[item.url];
    if (!prompt) {
      console.log(`  – skip ${item.url} (no prompt defined)`);
      continue;
    }

    console.log(`  ↻ generating: ${item.title?.slice(0, 60)}…`);

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) throw new Error("No image URL in response");

      // Download image to disk
      const fileName = `${item.id}.png`;
      const filePath = path.join(IMAGE_DIR, fileName);
      const res = await fetch(imageUrl);
      if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
      await pipeline(
        res.body as unknown as NodeJS.ReadableStream,
        createWriteStream(filePath),
      );

      // Update DB
      await db
        .update(items)
        .set({ localImagePath: fileName, updatedAt: new Date() })
        .where(eq(items.id, item.id));

      console.log(`  ✓ saved ${fileName}`);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  ✗ failed for ${item.url}:`, (err as Error).message);
    }
  }

  console.log("\nDone! All demo images generated.");
}

generateImages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
