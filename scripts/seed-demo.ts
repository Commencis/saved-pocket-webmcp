/**
 * Seed demo data for SavedPocket.
 *
 * Run with:
 *   DATABASE_URL=<url> npx tsx scripts/seed-demo.ts
 *   DATABASE_URL=<url> npx tsx scripts/seed-demo.ts --reset   # wipe & re-seed
 *
 * Creates demouser@savedpocket.com (password: demouser2026), 20 multi-platform
 * items, and 2 public collections. No AI API key required — all summaries and
 * tags are pre-written.
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import {
  account,
  categories,
  collectionItems,
  collections,
  items,
  user,
} from "../src/db/schema";

const DEMO_EMAIL = "demouser@savedpocket.com";
const DEMO_PASSWORD = "demouser2026";
const DEMO_API_KEY = "sp_demo_savedpocket_2026";
const DEMO_NAME = "Demo User";

const RESET = process.argv.includes("--reset");

// ── Password hashing (matches better-auth's scrypt implementation) ────────────

function hashPassword(pwd: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const N = 16384, r = 16;
  return new Promise((resolve, reject) =>
    crypto.scrypt(
      pwd.normalize("NFKC"),
      salt,
      64,
      { N, r, p: 1, maxmem: 128 * N * r * 2 },
      (err, key) => err ? reject(err) : resolve(`${salt}:${key.toString("hex")}`),
    ),
  );
}

// ── Demo items ────────────────────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "x" | "youtube" | "web";

interface DemoItem {
  url: string;
  platform: Platform;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  categoryName: string;
}

const DEMO_ITEMS: DemoItem[] = [
  // ── Instagram ──────────────────────────────────────────────────────────────
  {
    url: "https://www.instagram.com/p/demo-morning-routine/",
    platform: "instagram",
    title: "5 AM Morning Routine That Changed My Life",
    description: "Wake up at 5, journal for 10 minutes, cold shower, no phone for the first hour. Six months in — different person.",
    summary: "A personal recount of adopting a disciplined 5 AM morning routine. The author describes journaling, cold showers, and a phone-free first hour as the three habits that compounded into a significant lifestyle shift over six months. Simple, consistent, and genuinely transformative.",
    tags: ["morning-routine", "productivity", "wellness", "habits", "mindset"],
    categoryName: "Health & Fitness",
  },
  {
    url: "https://www.instagram.com/p/demo-manti-recipe/",
    platform: "instagram",
    title: "Homemade Manti — Turkish Dumplings",
    description: "Traditional Turkish dumplings with yogurt and spiced butter sauce. My grandmother's recipe, finally mastered.",
    summary: "A home cook shares their grandmother's recipe for manti, the beloved Turkish dumpling dish served with garlicky yogurt and paprika-infused butter. The post captures the meditative process of hand-shaping tiny dumplings and the reward of recreating a childhood comfort food.",
    tags: ["turkish-cuisine", "homemade", "recipe", "comfort-food", "dumplings"],
    categoryName: "Food",
  },
  {
    url: "https://www.instagram.com/p/demo-istanbul-golden-hour/",
    platform: "instagram",
    title: "Istanbul at Golden Hour",
    description: "The Bosphorus at sunset from Uskudar — this city never gets old.",
    summary: "A sunset photograph from Uskudar on the Asian side of Istanbul, capturing the Bosphorus bridge silhouetted against a copper sky. The caption reflects on the unique magic of a city straddling two continents, where every season brings a different version of the same iconic view.",
    tags: ["istanbul", "travel", "photography", "turkey", "bosphorus"],
    categoryName: "Travel",
  },
  {
    url: "https://www.instagram.com/p/demo-invest-in-yourself/",
    platform: "instagram",
    title: "The Best Investment Is in Yourself",
    description: "Skills, knowledge, health, relationships — compound interest applies to all of them.",
    summary: "A motivational post drawing the parallel between financial compound interest and personal development. The author argues that consistent investment in skills, health, and relationships yields exponential returns over time — making self-investment the highest-ROI decision anyone can make.",
    tags: ["mindset", "motivation", "personal-growth", "career", "self-improvement"],
    categoryName: "Career",
  },

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  {
    url: "https://www.linkedin.com/posts/demo-ai-product-management/",
    platform: "linkedin",
    title: "How AI is Reshaping Product Management in 2026",
    description: "PMs who understand AI aren't just using AI tools — they're rethinking what a product roadmap even means.",
    summary: "A product management leader argues that AI isn't just another feature category — it fundamentally changes how product roadmaps are built. Instead of shipping fixed feature sets, AI-native products ship learning surfaces where the model improves with usage. The post outlines three new PM competencies: prompt architecture, model evaluation, and feedback loop design.",
    tags: ["ai", "product-management", "saas", "future-of-work", "product-strategy"],
    categoryName: "Tech",
  },
  {
    url: "https://www.linkedin.com/posts/demo-junior-to-senior/",
    platform: "linkedin",
    title: "From Junior to Senior Dev in 3 Years: What Actually Worked",
    description: "Spoiler: it wasn't grinding leetcode. It was obsessing over code reviews and reading source code.",
    summary: "A software engineer shares the three practices that accelerated their growth from junior to senior: deep engagement with code review (both giving and receiving), reading open-source codebases to internalize architecture patterns, and deliberately taking on adjacent tasks outside their comfort zone. Refreshingly honest about what did not help (algorithm competitions, tutorial hell).",
    tags: ["career-growth", "software-engineering", "mentorship", "developer", "learning"],
    categoryName: "Career",
  },
  {
    url: "https://www.linkedin.com/posts/demo-turkish-startups-vc/",
    platform: "linkedin",
    title: "Why Turkish Startups Are Attracting Global VC Attention",
    description: "Strong engineering culture, lower burn rates, and a population that's 50% under 32. The fundamentals are compelling.",
    summary: "An analysis of why Istanbul has emerged as a significant startup hub attracting international venture capital. Key factors: a large, young, tech-literate population, world-class engineering universities, significantly lower operational costs than Western Europe, and a growing diaspora network connecting Turkish founders to Silicon Valley and London. Includes data on recent funding rounds in fintech, logistics, and AI.",
    tags: ["startups", "turkey", "venture-capital", "ecosystem", "emerging-markets"],
    categoryName: "Tech",
  },
  {
    url: "https://www.linkedin.com/posts/demo-remote-work-experiment/",
    platform: "linkedin",
    title: "The 5-Hour Remote Work Experiment: Results After 6 Months",
    description: "What if deep work matters more than hours online? My team tried it. Here's what happened.",
    summary: "A engineering manager documents their team's six-month experiment with a 5-hour focused-work day, cutting meetings to a minimum and asynchronizing all status updates. Results: output quality improved, team well-being scores increased, and hiring became easier. The post honestly addresses the challenges: client expectations, collaboration timezone issues, and the adjustment period.",
    tags: ["remote-work", "productivity", "async", "work-life-balance", "management"],
    categoryName: "Career",
  },

  // ── X / Twitter ────────────────────────────────────────────────────────────
  {
    url: "https://x.com/demo_user/status/1001-typescript-tricks",
    platform: "x",
    title: "Thread: 10 TypeScript tricks I wish I knew earlier",
    description: "🧵 A thread on TypeScript patterns that made me a better developer. Saved me hours of debugging.",
    summary: "A developer thread sharing 10 advanced TypeScript patterns: discriminated unions for exhaustive type checking, const assertions to narrow literal types, template literal types for type-safe string manipulation, infer keyword in conditional types, and more. Each tip includes a minimal code example and explains the real-world problem it solves.",
    tags: ["typescript", "javascript", "dev-tips", "web-dev", "programming"],
    categoryName: "Programming",
  },
  {
    url: "https://x.com/demo_user/status/1002-building-in-public",
    platform: "x",
    title: "Building in public: Month 3 of SavedPocket",
    description: "Month 3 update: 127 signups, first paying customer, and the feature that nobody asked for but everyone loves.",
    summary: "A founder's month-three building-in-public update for a personal knowledge management SaaS. Metrics shared: 127 total signups, first paying customer, 18% week-over-week growth. The post discusses which features drove unexpected engagement and the mental challenge of balancing development time with marketing as a solo founder.",
    tags: ["buildinpublic", "saas", "indie-hacker", "startup", "founder"],
    categoryName: "Tech",
  },
  {
    url: "https://x.com/demo_user/status/1003-ship-earlier",
    platform: "x",
    title: "The best time to ship is always earlier than you think",
    description: "Your users will tell you what to fix. Your imagination will tell you what to add. Only one of these is right.",
    summary: "A pithy but insightful observation about the asymmetry between pre-launch feature imagination and post-launch user feedback. The author argues that shipping early gives you real signal to iterate on, while extended pre-launch development optimizes for imagined needs rather than actual ones. Includes a reply thread discussing the limits of the advice (safety-critical software, regulated industries).",
    tags: ["product", "shipping", "startup-mindset", "indie-hacker", "iteration"],
    categoryName: "Tech",
  },
  {
    url: "https://x.com/demo_user/status/1004-rag-vs-finetuning",
    platform: "x",
    title: "RAG vs Fine-tuning: a practical breakdown",
    description: "People keep asking me which one to use. Here's my decision framework after building both.",
    summary: "A practical breakdown of when to use Retrieval-Augmented Generation versus fine-tuning for LLM applications. RAG wins for dynamic knowledge bases, cited factual answers, and lower cost; fine-tuning wins for style/tone consistency, domain-specific jargon, and latency-sensitive applications. Includes a decision tree and cost comparison based on real deployments.",
    tags: ["rag", "fine-tuning", "llm", "ai", "machine-learning"],
    categoryName: "Tech",
  },

  // ── YouTube ────────────────────────────────────────────────────────────────
  {
    url: "https://www.youtube.com/watch?v=demo-nextjs-postgresql",
    platform: "youtube",
    title: "Build a Full-Stack App with Next.js 15 & PostgreSQL",
    description: "Complete tutorial: Next.js App Router, Drizzle ORM, PostgreSQL, authentication, deployment. 4 hours.",
    summary: "A comprehensive 4-hour tutorial building a full-stack SaaS application from scratch using Next.js 15 App Router, Drizzle ORM, and PostgreSQL. Covers project setup, database schema design, server actions, authentication with better-auth, image uploads, and deployment to a VPS with Docker. Well-paced with clear explanations of the architectural decisions made throughout.",
    tags: ["nextjs", "postgresql", "typescript", "tutorial", "drizzle", "fullstack"],
    categoryName: "Programming",
  },
  {
    url: "https://www.youtube.com/watch?v=demo-system-design-twitter",
    platform: "youtube",
    title: "System Design Interview: Design Twitter",
    description: "How would you design Twitter's core features? Feed, tweets, follows, search — all covered.",
    summary: "A detailed system design walkthrough for Twitter's core architecture. Covers the fan-out problem for the home timeline (push vs pull models), tweet storage with sharding strategies, the search infrastructure using inverted indexes, and real-time notification delivery. Includes capacity estimation and discusses trade-offs made by the actual Twitter/X engineering team.",
    tags: ["system-design", "interview", "scalability", "backend", "distributed-systems"],
    categoryName: "Tech",
  },
  {
    url: "https://www.youtube.com/watch?v=demo-atomic-habits",
    platform: "youtube",
    title: "Atomic Habits — Complete Book Summary",
    description: "James Clear's habit framework in 30 minutes. The 1% better every day philosophy explained.",
    summary: "A concise summary of James Clear's Atomic Habits, covering the four laws of behavior change: make it obvious, make it attractive, make it easy, and make it satisfying. Explains habit stacking, the role of identity in habit formation, and the plateau of latent potential. A useful refresher for anyone who has read the book or a solid overview for those who haven't.",
    tags: ["habits", "productivity", "book-summary", "self-improvement", "james-clear"],
    categoryName: "Career",
  },
  {
    url: "https://www.youtube.com/watch?v=demo-postgresql-performance",
    platform: "youtube",
    title: "PostgreSQL Performance Tuning in 30 Minutes",
    description: "EXPLAIN ANALYZE, index types, query planning — the essentials for developers who aren't DBAs.",
    summary: "A developer-focused guide to PostgreSQL performance tuning that doesn't require a DBA background. Covers reading EXPLAIN ANALYZE output, choosing between B-tree, GIN, and BRIN indexes, common N+1 patterns and how to fix them with CTEs or lateral joins, and connection pooling with PgBouncer. Practical and immediately applicable to production applications.",
    tags: ["postgresql", "performance", "database", "sql", "backend"],
    categoryName: "Programming",
  },

  // ── Web ────────────────────────────────────────────────────────────────────
  {
    url: "https://posthog.com/blog/saas-pricing-playbook",
    platform: "web",
    title: "The SaaS Pricing Playbook",
    description: "Usage-based, seat-based, freemium — a framework for choosing the pricing model that fits your product.",
    summary: "PostHog's engineering team shares their framework for SaaS pricing model selection. Compares per-seat, usage-based, flat-rate, and freemium models with real revenue data on conversion rates and churn. The key insight: pricing model should match how customers derive value, not how you measure internal costs. Includes a decision matrix and case studies from PostHog's own pricing evolution.",
    tags: ["saas", "pricing", "product", "business", "revenue"],
    categoryName: "Tech",
  },
  {
    url: "https://dev.to/demo/drizzle-vs-prisma",
    platform: "web",
    title: "Drizzle ORM vs Prisma: A Practical Comparison",
    description: "Migrated a production app from Prisma to Drizzle. Here's everything I learned.",
    summary: "A developer documents their migration from Prisma to Drizzle ORM on a production Next.js application. Drizzle wins on raw query performance (no hidden N+1), TypeScript inference, bundle size, and flexibility for complex queries. Prisma wins on schema migration DX, the Prisma Studio GUI, and documentation maturity. Honest about the migration pain points and where Drizzle's SQL-first approach requires more upfront thinking.",
    tags: ["drizzle", "prisma", "typescript", "orm", "postgresql"],
    categoryName: "Programming",
  },
  {
    url: "https://www.indiehackers.com/post/how-i-got-first-100-customers",
    platform: "web",
    title: "How I Got My First 100 Customers Without Ads",
    description: "Community-led growth: where my first 100 customers actually came from, with honest numbers.",
    summary: "An indie hacker breaks down their first 100 customers by acquisition channel: 43 from a Product Hunt launch, 28 from a Hacker News Show HN post, 19 from direct outreach to Twitter/X followers, and 10 from a niche Slack community. Advertising produced zero. The takeaway: early customers come from personal trust and community participation, not paid acquisition.",
    tags: ["saas", "growth", "marketing", "indie-hacker", "customer-acquisition"],
    categoryName: "Tech",
  },
  {
    url: "https://linear.app/blog/design-principles",
    platform: "web",
    title: "The Design Principles Behind Linear",
    description: "How Linear thinks about speed, focus, and taste in product design — and why most tools fail on all three.",
    summary: "Linear's design team articulates the principles that guide every product decision: speed as a feature (every interaction under 100ms), focus over flexibility (removing options that add complexity without proportional value), and taste as a competitive moat (caring deeply about details that users feel even when they can't articulate them). An unusually honest and specific design philosophy document from a company known for its craft.",
    tags: ["design", "product-design", "ui", "linear", "principles"],
    categoryName: "Design",
  },
];

// ── Demo collections ──────────────────────────────────────────────────────────

const DEMO_COLLECTIONS = [
  {
    name: "Developer Tools",
    description: "Programming tutorials, tools, and technical deep dives worth revisiting",
    slug: "demo-developer-tools",
    itemUrls: [
      "https://www.youtube.com/watch?v=demo-nextjs-postgresql",
      "https://www.youtube.com/watch?v=demo-system-design-twitter",
      "https://dev.to/demo/drizzle-vs-prisma",
      "https://linear.app/blog/design-principles",
      "https://www.instagram.com/p/demo-morning-routine/",
    ],
  },
  {
    name: "Career & Growth",
    description: "Career advice, productivity, and personal development saved for later",
    slug: "demo-career-growth",
    itemUrls: [
      "https://www.linkedin.com/posts/demo-junior-to-senior/",
      "https://www.linkedin.com/posts/demo-remote-work-experiment/",
      "https://posthog.com/blog/saas-pricing-playbook",
      "https://www.instagram.com/p/demo-invest-in-yourself/",
      "https://www.youtube.com/watch?v=demo-atomic-habits",
    ],
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Starting demo seed…");

  // Build category name → id map
  const allCategories = await db.select().from(categories);
  const catMap = new Map(allCategories.map((c) => [c.name, c.id]));

  // ── Upsert demo user ──────────────────────────────────────────────────────
  const existing = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });

  let userId: string;

  if (existing) {
    userId = existing.id;
    await db
      .update(user)
      .set({ apiKey: DEMO_API_KEY, emailVerified: true })
      .where(eq(user.id, userId));
    console.log(`Using existing user: ${userId}`);

    if (RESET) {
      await db.delete(items).where(eq(items.userId, userId));
      await db.delete(collections).where(eq(collections.userId, userId));
      console.log("Reset: deleted all items and collections.");
    }
  } else {
    userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
      apiKey: DEMO_API_KEY,
    });
    console.log(`Created user: ${userId}`);
  }

  // ── Upsert account row (so password login works) ──────────────────────────
  const existingAccount = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  if (existingAccount) {
    await db
      .update(account)
      .set({ password: passwordHash })
      .where(eq(account.id, existingAccount.id));
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: DEMO_EMAIL,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  }
  console.log("Password account ready.");

  // ── Insert items ──────────────────────────────────────────────────────────
  const now = new Date();
  const insertedIds = new Map<string, string>(); // url → itemId

  for (let i = 0; i < DEMO_ITEMS.length; i++) {
    const item = DEMO_ITEMS[i];

    const existing = await db.query.items.findFirst({
      where: and(eq(items.userId, userId), eq(items.url, item.url)),
    });

    if (existing && !RESET) {
      insertedIds.set(item.url, existing.id);
      process.stdout.write("·");
      continue;
    }

    const id = RESET && existing ? existing.id : crypto.randomUUID();
    const savedAt = new Date(now.getTime() - i * 7_200_000); // 2h apart

    await db.insert(items).values({
      id,
      userId,
      url: item.url,
      platform: item.platform,
      title: item.title,
      description: item.description,
      summary: item.summary,
      tags: item.tags,
      categoryId: catMap.get(item.categoryName) ?? null,
      analysisStatus: "done",
      savedAt,
    }).onConflictDoNothing();

    insertedIds.set(item.url, id);
    process.stdout.write(".");
  }
  console.log(`\n${insertedIds.size} items ready.`);

  // ── Insert collections ────────────────────────────────────────────────────
  for (const col of DEMO_COLLECTIONS) {
    let collectionId: number;

    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, col.slug),
    });

    if (existing) {
      collectionId = existing.id;
    } else {
      const [inserted] = await db
        .insert(collections)
        .values({
          userId,
          name: col.name,
          description: col.description,
          slug: col.slug,
          visibility: "public",
          forkable: true,
        })
        .returning({ id: collections.id });
      collectionId = inserted.id;
    }

    for (const url of col.itemUrls) {
      const itemId = insertedIds.get(url);
      if (!itemId) {
        console.warn(`  ⚠ item not found for url: ${url}`);
        continue;
      }
      await db
        .insert(collectionItems)
        .values({ collectionId, itemId })
        .onConflictDoNothing();
    }
    console.log(`Collection "${col.name}" ready`);
  }

  console.log(`
Done!

  Login:   ${DEMO_EMAIL}
  Pass:    ${DEMO_PASSWORD}
  API key: ${DEMO_API_KEY}

To generate AI images for all demo items (optional):
  OPENAI_API_KEY=sk-... DATABASE_URL=<url> npx tsx scripts/generate-demo-images.ts
`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
