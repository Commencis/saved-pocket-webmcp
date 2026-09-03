/**
 * Demo user seeding — imported by migrate.ts (auto-runs on startup) and
 * scripts/seed-demo.ts (manual run with optional --reset flag).
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import {
  account,
  categories,
  collectionItems,
  collections,
  items,
  user,
} from "./schema";

export const DEMO_EMAIL = "demouser@savedpocket.com";
export const DEMO_PASSWORD = "demouser2026";
export const DEMO_API_KEY = "sp_demo_savedpocket_2026";

function hashPassword(pwd: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const N = 16384, r = 16;
  return new Promise((resolve, reject) =>
    crypto.scrypt(
      pwd.normalize("NFKC"),
      salt,
      64,
      { N, r, p: 1, maxmem: 128 * N * r * 2 },
      (err, key) =>
        err ? reject(err) : resolve(`${salt}:${key.toString("hex")}`),
    ),
  );
}

type Platform = "instagram" | "linkedin" | "x" | "youtube" | "web";

interface DemoItem {
  url: string;
  platform: Platform;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  categoryName: string;
  imageUrl: string;
}

const DEMO_ITEMS: DemoItem[] = [
  // ── Instagram ──────────────────────────────────────────────────────────────
  {
    url: "https://www.instagram.com/p/Da-bbCgjktH",
    platform: "instagram",
    title: "Claude + Replit: Vibe Coding at Its Best",
    description: "Two tools that changed how I prototype — Claude for reasoning, Replit for instant deployment.",
    summary: "A developer post celebrating the combination of Claude and Replit for rapid app prototyping. The creator argues that AI-assisted coding paired with zero-setup cloud environments has fundamentally lowered the barrier to shipping — from idea to deployed URL in under an hour. Resonates with the vibe coding movement: less boilerplate, more building.",
    tags: ["vibecoding", "claude", "replit", "ai", "developer-tools"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.instagram.com/p/DaL-XeAOB-3",
    platform: "instagram",
    title: "My Home Studio Setup for Content Creation",
    description: "Finally happy with my desk setup — here's what made the difference.",
    summary: "A content creator shares their refined home studio setup, highlighting the gear and layout decisions that improved both recording quality and daily focus. The post emphasizes the value of a clean, intentional workspace over expensive equipment — a few key investments (good lighting, monitor arm, noise dampening) compound into better output and more creative energy.",
    tags: ["desk-setup", "home-office", "content-creation", "productivity", "aesthetics"],
    categoryName: "Career",
    imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.instagram.com/p/DassJqtPS-N",
    platform: "instagram",
    title: "Somewhere Between the River and Forever",
    description: "Some places slow time down. This was one of them.",
    summary: "A travel photograph from the Teanaway River, capturing a quiet moment between two people surrounded by golden summer grass and still water. The caption leans into the feeling rather than the location — a reminder that the best travel memories are less about destinations and more about the quality of attention we bring to them.",
    tags: ["travel", "nature", "outdoors", "photography", "slow-living"],
    categoryName: "Travel",
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.instagram.com/p/DYg3OlxsPWT",
    platform: "instagram",
    title: "Greek Plate: Chicken, Tzatziki & Roasted Potatoes",
    description: "Simple ingredients, serious flavors. This one is a keeper.",
    summary: "A home cook shares their Greek-inspired plate: lemon-oregano marinated chicken fillet, golden butter-finished potatoes, fresh salad with red onion and parsley, and a homemade tzatziki with cucumber, garlic, dill, and wine vinegar. Every component is straightforward, but the combination is greater than the sum of its parts. Full recipe included in the caption.",
    tags: ["recipe", "greek-food", "homecooking", "tzatziki", "meal-prep"],
    categoryName: "Food",
    imageUrl: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&auto=format&q=80",
  },

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  {
    url: "https://www.linkedin.com/pulse/how-make-your-website-agent-ready-webmcp-sofian-bettayeb-cp5oe",
    platform: "linkedin",
    title: "How to Make Your Website Agent-Ready with WebMCP",
    description: "WebMCP lets AI agents browse and interact with your site — here's how to implement it.",
    summary: "Sofian Bettayeb explains the WebMCP standard, which allows AI agents to interact with web applications through a structured protocol rather than raw HTML scraping. Covers the motivation (agents struggle with dynamic SPAs), the implementation pattern (a machine-readable endpoint describing available actions), and a step-by-step guide to adding WebMCP support to an existing Next.js app.",
    tags: ["webmcp", "ai-agents", "nextjs", "mcp", "web-development"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7427023140960124933",
    platform: "linkedin",
    title: "Thomas Dohmke & Entire: $60M Seed Round",
    description: "GitHub's former CEO raises a $60M seed to build the future of software engineering.",
    summary: "Thomas Dohmke, who led GitHub through the Copilot era and its integration into Microsoft, announces Entire — a new company with a $60M seed round. The post hints at the thesis: AI that doesn't just assist software engineers but fundamentally restructures how software is produced. Significant given Dohmke's unique vantage point having scaled Copilot to millions of developers.",
    tags: ["ai", "developer-tools", "startups", "github", "seed-round"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7427130203807617024",
    platform: "linkedin",
    title: "GitHub's Ex-CEO Raised a $60M Seed Round",
    description: "The tech world reacts to one of the largest seed rounds in developer tools history.",
    summary: "Industry reaction to Thomas Dohmke's Entire funding announcement. The post contextualizes why a $60M seed is notable even by 2025 AI standards, and discusses what it signals about investor conviction in agentic software development. Replies from notable figures in the developer tools space add perspective on what Dohmke is likely building.",
    tags: ["github", "funding", "ai", "developer-tools", "venture-capital"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7426535335414849536",
    platform: "linkedin",
    title: "Advice on Board Roles and Independent Directorship",
    description: "What it actually takes to become a board member — and why most senior leaders never try.",
    summary: "A candid post on the path to serving as an independent board director. The author outlines what companies actually look for (specific expertise gaps, not general seniority), how to position yourself, and the common mistakes senior leaders make when approaching board service. Includes practical advice on building the network and credibility required before the first conversation.",
    tags: ["career", "leadership", "board-governance", "senior-leadership", "networking"],
    categoryName: "Career",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&q=80",
  },

  // ── X / Twitter ────────────────────────────────────────────────────────────
  {
    url: "https://x.com/therundownai/status/1712670996874891523",
    platform: "x",
    title: "The Rundown AI: This Week's Biggest AI Stories",
    description: "Your daily briefing on everything happening in artificial intelligence.",
    summary: "The Rundown AI's weekly digest covering the most significant AI developments: new model releases, research breakthroughs, and industry moves. A reliable signal-to-noise filter for staying informed without spending hours across multiple sources. Particularly useful for developers and product people who need AI context without the hype.",
    tags: ["ai", "newsletter", "machine-learning", "llm", "news"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&q=80",
  },
  {
    url: "https://twitter.com/freecodecamp/status/1659499637680615425",
    platform: "x",
    title: "freeCodeCamp: 300+ Hours of Free Coding Courses",
    description: "A full computer science education — completely free, no strings attached.",
    summary: "freeCodeCamp's catalog of free learning resources covers web development, data science, machine learning, and cybersecurity — all structured as hands-on projects rather than passive videos. The curriculum is designed to take someone from zero coding experience to job-ready skills. Millions of developers worldwide have used it as their first structured learning path.",
    tags: ["freecodecamp", "coding", "free-resources", "web-dev", "learning"],
    categoryName: "Programming",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&q=80",
  },
  {
    url: "https://x.com/bioinforange/status/2083243798050771245",
    platform: "x",
    title: "Global Biogeography of Songbird Vocalizations",
    description: "How bird songs vary across continents — and what that tells us about evolution.",
    summary: "A research thread exploring how songbird vocalizations are shaped by both biological and environmental factors across different global regions. The BIRDSonG dataset enables new analysis of geographic patterns in how birds develop and diversify their songs. Implications span evolutionary biology, bioacoustics, and conservation — a window into how acoustic culture propagates across species.",
    tags: ["biology", "research", "ecology", "bioacoustics", "evolution"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&auto=format&q=80",
  },
  {
    url: "https://x.com/METU_ODTU/status/2083070847246295420",
    platform: "x",
    title: "METU: The Campus That Changes Minds",
    description: "Every year, thousands visit METU's campus — and many leave with their mind made up.",
    summary: "Middle East Technical University (METU) shares a post about prospective students who visit campus and leave with a changed top choice. Known for its vast pine forests, international research culture, and engineering programs ranked among the best in the region, METU has a reputation that exceeds its guidebook descriptions. A campus visit often does what no brochure can.",
    tags: ["university", "campus", "education", "turkey", "engineering"],
    categoryName: "Career",
    imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&q=80",
  },

  // ── YouTube ────────────────────────────────────────────────────────────────
  {
    url: "https://www.youtube.com/watch?v=T3YfZsDQUp0",
    platform: "youtube",
    title: "3-Hour Hyperfocus Techno — Deep Work Session",
    description: "An uninterrupted techno mix designed for deep focus and flow state.",
    summary: "A three-hour continuous techno mix curated for deep work sessions. No vocals, no sudden breaks — sustained rhythmic energy that fades into the background and keeps cognitive flow intact. Particularly effective for coding, writing, and other tasks requiring extended concentration. The absence of musical surprises is the point: your brain can relax its monitoring and go deeper.",
    tags: ["focus", "deep-work", "techno", "music", "productivity"],
    categoryName: "Health & Fitness",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.youtube.com/watch?v=etje6LC_Kyk",
    platform: "youtube",
    title: "Running AI at Home vs Paying $20/mo — Alican Kiraz",
    description: "Local LLMs vs cloud subscriptions: a practical cost-benefit analysis.",
    summary: "Alican Kiraz compares running open-source LLMs locally (Ollama, LM Studio) against cloud subscriptions like ChatGPT Plus and Claude Pro. Covers hardware requirements, model quality for everyday tasks, privacy trade-offs, and the crossover point where local inference becomes cost-effective. Practical benchmarks on a mid-range consumer GPU. Verdict: local is viable for most daily tasks but cloud wins on cutting-edge capability.",
    tags: ["local-llm", "ai", "ollama", "llm", "open-source"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.youtube.com/watch?v=bSvTVREwSNw",
    platform: "youtube",
    title: "Next.js in 100 Seconds — Fireship",
    description: "The fastest possible introduction to Next.js and why it dominates React meta-frameworks.",
    summary: "Fireship's signature 100-second format applied to Next.js — covering the App Router, server components, file-system routing, API routes, and deployment. Perfect for quickly deciding whether Next.js fits a project or for refreshing understanding before diving into docs. Followed by a longer code demo showing a minimal app built from scratch with TypeScript and Tailwind.",
    tags: ["nextjs", "react", "javascript", "web-dev", "tutorial"],
    categoryName: "Programming",
    imageUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&auto=format&q=80",
  },
  {
    url: "https://www.youtube.com/watch?v=Sklc_fQBmcs",
    platform: "youtube",
    title: "PostgreSQL Performance Tuning — Hussein Nasser",
    description: "EXPLAIN ANALYZE, indexing strategies, and query optimization for application developers.",
    summary: "Hussein Nasser's developer-focused guide to PostgreSQL performance. Not a DBA course — focused on the 20% of knowledge that solves 80% of production slowdowns: reading EXPLAIN ANALYZE output, choosing the right index type (B-tree vs GIN vs BRIN), fixing N+1 queries with CTEs or lateral joins, and connection pooling with PgBouncer. Each concept demonstrated with a real slow query before and after the fix.",
    tags: ["postgresql", "performance", "database", "backend", "sql"],
    categoryName: "Programming",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&q=80",
  },

  // ── Web ────────────────────────────────────────────────────────────────────
  {
    url: "https://jalammar.github.io/illustrated-transformer",
    platform: "web",
    title: "The Illustrated Transformer",
    description: "A visual walkthrough of the attention mechanism that powers modern AI.",
    summary: "Jay Alammar's visual explainer of the Transformer architecture — the engine behind GPT, BERT, and every modern large language model. Uses diagrams and animated GIFs to build intuition for self-attention, multi-head attention, and positional encodings without requiring deep math background. The most-cited approachable introduction to the topic, bookmarked by developers who want to understand what they're building on.",
    tags: ["transformers", "attention", "deep-learning", "llm", "ai"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&q=80",
  },
  {
    url: "https://blog.readwise.io/why-were-bootstrapping-readwise",
    platform: "web",
    title: "Why We're Bootstrapping Readwise",
    description: "The Readwise team explains why they chose slow growth over venture capital.",
    summary: "Tristan Homsi and Daniel Doyon share the reasoning behind bootstrapping Readwise rather than raising VC. Key arguments: alignment between user value and revenue, freedom to build for long-term quality, and the motivation that comes from being directly accountable to paying customers. Honest about the trade-offs and the type of company they want to build. A reference point for any founder weighing growth options.",
    tags: ["bootstrapping", "startups", "saas", "indie-hacker", "business"],
    categoryName: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&auto=format&q=80",
  },
  {
    url: "https://iocombats.com/blogs/react-fiber-reconciliation-architecture-explained?via=dailydev",
    platform: "web",
    title: "How React's Fiber Architecture Actually Works",
    description: "A deep dive into React's reconciler — how it breaks rendering into interruptible units of work.",
    summary: "An in-depth technical explanation of React Fiber, the reconciliation engine introduced in React 16. Explains how Fiber breaks rendering into small, interruptible units of work, enabling concurrent features like Suspense and transitions. Covers the fiber tree structure, work loop, priority scheduling, and the commit phase. Essential reading for understanding why React performs the way it does under the hood.",
    tags: ["react", "fiber", "javascript", "performance", "architecture"],
    categoryName: "Programming",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&q=80",
  },
  {
    url: "https://master.dev/blog/the-best-loading-states-are-no-loading-states?via=dailydev",
    platform: "web",
    title: "The Best Loading States Are No Loading States",
    description: "Optimistic UI and instant transitions: design patterns that make apps feel faster.",
    summary: "A product design argument for eliminating loading spinners through optimistic UI patterns, skeleton screens, and prefetching. The author shows that perceived performance matters more than actual latency, and that showing intermediate states (rather than blocking on server response) dramatically improves user experience. Includes concrete implementation patterns for React and discussion of edge cases where instant feedback can mislead users.",
    tags: ["ux", "performance", "ui", "react", "design"],
    categoryName: "Design",
    imageUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&q=80",
  },
];

const DEMO_COLLECTIONS = [
  {
    name: "Developer Tools",
    description: "Programming tutorials, tools, and technical deep dives worth revisiting",
    slug: "demo-developer-tools",
    itemUrls: [
      "https://iocombats.com/blogs/react-fiber-reconciliation-architecture-explained?via=dailydev",
      "https://jalammar.github.io/illustrated-transformer",
      "https://www.linkedin.com/pulse/how-make-your-website-agent-ready-webmcp-sofian-bettayeb-cp5oe",
      "https://www.youtube.com/watch?v=bSvTVREwSNw",
      "https://www.youtube.com/watch?v=Sklc_fQBmcs",
    ],
  },
  {
    name: "Career & Growth",
    description: "Career advice, productivity, and personal development saved for later",
    slug: "demo-career-growth",
    itemUrls: [
      "https://blog.readwise.io/why-were-bootstrapping-readwise",
      "https://www.linkedin.com/feed/update/urn:li:activity:7427023140960124933",
      "https://master.dev/blog/the-best-loading-states-are-no-loading-states?via=dailydev",
      "https://www.linkedin.com/feed/update/urn:li:activity:7426535335414849536",
      "https://www.youtube.com/watch?v=etje6LC_Kyk",
    ],
  },
] as const;

export async function seedDemoUser(opts?: { reset?: boolean }): Promise<void> {
  const reset = opts?.reset ?? false;

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

    if (reset) {
      await db.delete(items).where(eq(items.userId, userId));
      await db.delete(collections).where(eq(collections.userId, userId));
      console.log("[seed-demo] Reset: deleted all items and collections.");
    }
  } else {
    userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: "Demo User",
      email: DEMO_EMAIL,
      emailVerified: true,
      apiKey: DEMO_API_KEY,
    });
    console.log(`[seed-demo] Created demo user: ${userId}`);
  }

  // ── Upsert account row (password login) ──────────────────────────────────
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

  // ── Insert items ──────────────────────────────────────────────────────────
  const now = new Date();
  const insertedIds = new Map<string, string>();

  for (let i = 0; i < DEMO_ITEMS.length; i++) {
    const item = DEMO_ITEMS[i];

    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.userId, userId), eq(items.url, item.url)),
    });

    if (existingItem && !reset) {
      insertedIds.set(item.url, existingItem.id);
      continue;
    }

    const id = reset && existingItem ? existingItem.id : crypto.randomUUID();
    const savedAt = new Date(now.getTime() - i * 7_200_000);

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
      imageUrl: item.imageUrl,
      savedAt,
    }).onConflictDoNothing();

    insertedIds.set(item.url, id);
  }

  // ── Insert collections ────────────────────────────────────────────────────
  for (const col of DEMO_COLLECTIONS) {
    let collectionId: number;

    const existingCol = await db.query.collections.findFirst({
      where: and(eq(collections.userId, userId), eq(collections.name, col.name)),
    });

    if (existingCol) {
      collectionId = existingCol.id;
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
      if (!itemId) continue;
      await db
        .insert(collectionItems)
        .values({ collectionId, itemId })
        .onConflictDoNothing();
    }
  }

  console.log("[seed-demo] Demo user ready.");
}
