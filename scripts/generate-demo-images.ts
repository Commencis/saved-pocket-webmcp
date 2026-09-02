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

// Per-item DALL-E prompts — abstract/illustrative only, no real people/faces/text/logos
const ITEM_PROMPTS: Record<string, string> = {
  // ── Instagram ─────────────────────────────────────────────────────────────
  "https://www.instagram.com/p/Da-bbCgjktH":
    "Abstract digital illustration of AI-assisted coding: a glowing laptop screen with colorful code streams and a small rocket launching from a terminal window. Dark background, neon accent colors. No faces, no text, no logos.",

  "https://www.instagram.com/p/DaL-XeAOB-3":
    "Flat-lay photography style illustration of a clean home studio desk setup: minimal monitor, small plant, warm lamp light, notebook and pen on a light wooden surface. Soft natural light, warm tones. No people.",

  "https://www.instagram.com/p/DassJqtPS-N":
    "Atmospheric landscape photography art: a calm river winding through golden summer fields, soft evening light, long grass in the foreground, peaceful and cinematic. No people.",

  "https://www.instagram.com/p/DYg3OlxsPWT":
    "Overhead food photography illustration of a Greek meal: golden roasted chicken fillet, crispy potatoes, fresh salad with red onion, and a white bowl of tzatziki drizzled with olive oil. Rustic wooden table, natural light. No people.",

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  "https://www.linkedin.com/pulse/how-make-your-website-agent-ready-webmcp-sofian-bettayeb-cp5oe":
    "Abstract technical illustration of AI agents interacting with a web application: geometric nodes and connection lines forming a network, browser window outline with arrows showing data flow. Dark blue background, teal accent. No faces, no text.",

  "https://www.linkedin.com/feed/update/urn:li:activity:7427023140960124933":
    "Abstract startup funding illustration: a stylized rocket launching upward from a platform with stacked coin towers below and upward trending graph lines in the background. Dark background, gold and green accent colors. No faces, no text.",

  "https://www.linkedin.com/feed/update/urn:li:activity:7427130203807617024":
    "Abstract developer tools illustration: overlapping GitHub Octocat-inspired shapes, pull request arrows, and code bracket symbols arranged in a clean infographic style. Monochrome with a purple accent. No faces, no text.",

  "https://www.linkedin.com/feed/update/urn:li:activity:7426535335414849536":
    "Professional abstract illustration of corporate governance: a round table with minimalist chair shapes, upward career path arrows, and a subtle organizational chart in the background. Navy blue and gold palette. No faces, no text.",

  // ── X / Twitter ───────────────────────────────────────────────────────────
  "https://x.com/therundownai/status/1712670996874891523":
    "Abstract newsletter dashboard illustration: a dark-mode screen with bullet point summaries, glowing AI icons (brain, lightning bolt, chip), and a clean typographic layout. Minimal, dark background, teal highlights. No faces, no real text.",

  "https://twitter.com/freecodecamp/status/1659499637680615425":
    "Illustration of a coding bootcamp journey: stacked open books with code symbols, a progress bar filling to 100%, and small trophy icons. Clean vector art on a warm off-white background. No faces, no text.",

  "https://x.com/bioinforange/status/2083243798050771245":
    "Scientific illustration of global bird biogeography: a stylized world map with colorful waveform patterns showing bird song diversity across continents, musical note shapes transforming into bird silhouettes. Watercolor and digital hybrid style. No faces, no text.",

  "https://x.com/METU_ODTU/status/2083070847246295420":
    "Architectural illustration of a university campus: pine trees lining a stone pathway leading to a modernist concrete building, clear blue sky, warm sunlight. Impressionist illustration style. No faces, no text.",

  // ── YouTube ───────────────────────────────────────────────────────────────
  "https://www.youtube.com/watch?v=T3YfZsDQUp0":
    "Abstract music visualization for deep work: dark background with pulsing concentric circles and equalizer bars in deep blue and purple, evoking a focused electronic music session. No faces, no text.",

  "https://www.youtube.com/watch?v=etje6LC_Kyk":
    "Flat illustration comparing local AI inference vs cloud AI: two sides of a scale — one showing a desktop computer with a brain chip, the other showing a cloud with dollar signs. Clean vector art, neutral tones. No faces, no text.",

  "https://www.youtube.com/watch?v=bSvTVREwSNw":
    "Flat illustration of the Next.js logo concept: a stylized N triangle surrounded by React component brackets, file-system routing tree, and a small rocket for fast deployment. Black and white with a subtle blue gradient. No faces, no text.",

  "https://www.youtube.com/watch?v=Sklc_fQBmcs":
    "Technical illustration of database performance tuning: a stylized PostgreSQL elephant icon surrounded by query plan tree diagrams, index type labels (B-tree, GIN), and speed lightning bolt icons. Blueprint-style blue and white. No faces, no text.",

  // ── Web ───────────────────────────────────────────────────────────────────
  "https://jalammar.github.io/illustrated-transformer":
    "Abstract illustration of the Transformer attention mechanism: colorful grid of attention weight boxes with arrows showing token-to-token connections, multi-head attention fan pattern. Clean vector art on white background, rainbow spectrum of colors. No faces, no text.",

  "https://blog.readwise.io/why-were-bootstrapping-readwise":
    "Minimalist illustration of independent business growth: a small plant growing in a cup next to a laptop, slow upward revenue curve on a simple chart, warm earth tones. Flat vector style. No faces, no text.",

  "https://iocombats.com/blogs/react-fiber-reconciliation-architecture-explained?via=dailydev":
    "Abstract illustration of React Fiber's tree reconciliation: a binary tree of UI component nodes with some nodes highlighted in blue (working), others in gray (pending), and colored arrows showing traversal order. Dark developer theme. No faces, no text.",

  "https://master.dev/blog/the-best-loading-states-are-no-loading-states?via=dailydev":
    "Illustration of optimistic UI patterns: a UI card that instantly shows content with a subtle pulse animation, contrasted against a grayed-out spinner alternative. Clean before/after comparison style. Light background, blue accent. No faces, no text.",
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

      const imageUrl = response.data?.[0]?.url;
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
