/**
 * Seed demo data for the WebMCP challenge.
 *
 * Run with:
 *   DATABASE_URL=<url> npx tsx scripts/seed-demo.ts
 *
 * Creates a demo user with a fixed API key, 3 collections, and 25 curated items
 * with pre-written summaries and tags (no Anthropic key required).
 */

import { db } from "../src/db/client";
import { collectionItems, collections, items, user } from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const DEMO_EMAIL = "demo@savedpocket.app";
const DEMO_API_KEY = "sp_demo_webmcp_challenge_2026";
const DEMO_NAME = "Demo User";

const DEMO_ITEMS = [
  // --- AI & Machine Learning ---
  {
    url: "https://arxiv.org/abs/2307.09288",
    title: "Llama 2: Open Foundation and Fine-Tuned Chat Models",
    description: "Meta AI's Llama 2 paper introducing open-weight models from 7B to 70B parameters.",
    summary: "Meta releases Llama 2, a family of pretrained and instruction-tuned large language models ranging from 7B to 70B parameters. The paper covers the pretraining methodology, RLHF fine-tuning, and extensive safety evaluations. Llama 2-Chat models outperform open-source alternatives on most benchmarks and are competitive with closed models like ChatGPT on helpfulness and safety.",
    tags: ["ai", "llm", "meta", "open-source", "research"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://www.anthropic.com/research/claude-character",
    title: "Claude's Character",
    description: "How Anthropic thinks about Claude's identity, values, and psychological stability.",
    summary: "Anthropic describes Claude's genuine character traits — intellectual curiosity, warmth, playful wit, directness, and commitment to honesty — as authentically Claude's own, not just a performance. The piece explores how Claude maintains psychological stability when challenged and how its values emerged through training in a manner analogous to how humans develop character through nature and experience.",
    tags: ["anthropic", "claude", "ai-safety", "character", "values"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://karpathy.github.io/2015/05/21/rnn-effectiveness/",
    title: "The Unreasonable Effectiveness of Recurrent Neural Networks",
    description: "Andrej Karpathy's classic post demonstrating what character-level RNNs can learn.",
    summary: "A landmark blog post showing that simple RNNs trained on raw text can learn remarkably complex structure — generating Shakespeare, Linux source code, and LaTeX papers that look plausible. Includes interactive demos and the famous char-rnn code. Helped popularize deep learning for sequence modeling before the Transformer era.",
    tags: ["rnn", "deep-learning", "nlp", "karpathy", "neural-networks"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://proceedings.neurips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
    title: "Attention Is All You Need",
    description: "The original Transformer paper that revolutionized natural language processing.",
    summary: "Vaswani et al. introduce the Transformer architecture, replacing recurrent layers entirely with self-attention mechanisms. The model achieves state-of-the-art on machine translation tasks with significantly less training time. This paper is the foundation for every modern LLM including GPT, BERT, and Claude.",
    tags: ["transformer", "attention", "nlp", "research", "foundational"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://simonwillison.net/2023/Oct/23/embeddings/",
    title: "Embeddings: What they are and why they matter",
    description: "Simon Willison's practical guide to vector embeddings for developers.",
    summary: "A clear explanation of what embeddings are, how they encode semantic meaning into high-dimensional vectors, and practical applications: semantic search, RAG (retrieval-augmented generation), recommendation systems, and anomaly detection. Includes Python examples and discusses cosine similarity. Essential reading for building AI-powered search systems.",
    tags: ["embeddings", "vector-search", "semantic-search", "rag", "tutorial"],
    category: "AI & Machine Learning",
  },

  // --- Web Development ---
  {
    url: "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023",
    title: "React Labs: What We Have Been Working On – March 2023",
    description: "React team update on Server Components, React Forget (compiler), and Offscreen.",
    summary: "The React team shares progress on React Server Components now production-ready in Next.js 13, the React Forget compiler that automatically memoizes components to eliminate unnecessary re-renders, and the Offscreen API for pre-rendering content in the background. Marks a major shift in how React applications will be structured going forward.",
    tags: ["react", "server-components", "web-dev", "javascript", "frontend"],
    category: "Web Development",
  },
  {
    url: "https://web.dev/articles/vitals",
    title: "Core Web Vitals",
    description: "Google's user-centric metrics for measuring real-world web performance.",
    summary: "Core Web Vitals are a set of specific factors that Google considers important for overall user experience: Largest Contentful Paint (loading), First Input Delay (interactivity), and Cumulative Layout Shift (visual stability). These metrics directly affect Google search rankings. The article covers measurement tools, optimization strategies, and common failure patterns.",
    tags: ["performance", "web-vitals", "google", "seo", "frontend"],
    category: "Web Development",
  },
  {
    url: "https://nextjs.org/blog/next-15",
    title: "Next.js 15",
    description: "Next.js 15 release notes with React 19 support and improved caching.",
    summary: "Next.js 15 ships with React 19 support, opt-in request memoization, improved caching defaults (GET route handlers no longer cached by default), the new @next/codemod CLI for automated upgrades, and turbopack stability improvements. Breaking changes in fetch behavior require attention when upgrading from v14.",
    tags: ["nextjs", "react", "web-dev", "typescript", "vercel"],
    category: "Web Development",
  },
  {
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Components",
    title: "Web Components | MDN",
    description: "MDN guide to Web Components: Custom Elements, Shadow DOM, and HTML Templates.",
    summary: "Web Components is a suite of technologies for creating reusable, encapsulated custom HTML elements. Covers Custom Elements API for defining new HTML tags, Shadow DOM for encapsulated styling, and HTML Templates for reusable markup patterns. Framework-agnostic and natively supported in all modern browsers.",
    tags: ["web-components", "custom-elements", "shadow-dom", "mdn", "html"],
    category: "Web Development",
  },

  // --- Design & UX ---
  {
    url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
    title: "10 Usability Heuristics for User Interface Design",
    description: "Jakob Nielsen's classic usability principles, still essential after 30 years.",
    summary: "Jakob Nielsen's ten general principles for interaction design: visibility of system status, match with real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, help users recover from errors, and documentation. The most cited framework in UX design education.",
    tags: ["ux", "usability", "design", "nielsen", "heuristics"],
    category: "Design & UX",
  },
  {
    url: "https://www.figma.com/blog/design-tokens-101/",
    title: "Design Tokens 101",
    description: "Figma's guide to design tokens — the building blocks of design systems.",
    summary: "Design tokens are the smallest, indivisible elements of a design system: color values, spacing, typography, and shadows stored as named variables. This guide explains token taxonomy (global → semantic → component), how tokens sync between Figma and code using tools like Style Dictionary, and why tokens are essential for maintaining consistency across platforms and themes.",
    tags: ["design-tokens", "design-system", "figma", "css", "theming"],
    category: "Design & UX",
  },
  {
    url: "https://lawsofux.com/",
    title: "Laws of UX",
    description: "Collection of the psychology principles that designers should know.",
    summary: "Laws of UX by Jon Yablonski catalogs psychology principles relevant to interface design: Hick's Law (decision time increases with choices), Fitts's Law (time to reach a target depends on distance and size), Miller's Law (7 ± 2 items in working memory), the Peak-End Rule, Jakob's Law (users expect sites to work like others they know), and more. Each law includes examples, implications for design, and the originating research.",
    tags: ["ux", "psychology", "design", "cognitive", "principles"],
    category: "Design & UX",
  },

  // --- Productivity & Tools ---
  {
    url: "https://obsidian.md/",
    title: "Obsidian — A second brain, for you, forever",
    description: "Markdown-based personal knowledge management app with local-first storage.",
    summary: "Obsidian is a personal knowledge base and note-taking app that stores everything as local Markdown files. It features bidirectional linking, a graph view of note connections, and a rich plugin ecosystem. The local-first approach means your notes are always accessible offline and you own your data completely. Popular among researchers, writers, and developers building a 'second brain'.",
    tags: ["pkm", "notes", "markdown", "productivity", "knowledge-management"],
    category: "Productivity & Tools",
  },
  {
    url: "https://github.com/features/copilot",
    title: "GitHub Copilot",
    description: "AI pair programming tool powered by OpenAI Codex.",
    summary: "GitHub Copilot is an AI-powered code completion tool that suggests whole lines and functions in real time based on context and natural language comments. Trained on billions of lines of public code, it supports most popular programming languages and integrates with VS Code, JetBrains IDEs, and Neovim. The Business and Enterprise tiers add code referencing, policy controls, and security vulnerability filtering.",
    tags: ["github", "ai", "coding", "productivity", "copilot"],
    category: "Productivity & Tools",
  },
  {
    url: "https://raycast.com/",
    title: "Raycast — Your shortcut to everything",
    description: "Blazing fast macOS launcher with AI integration and extension ecosystem.",
    summary: "Raycast replaces Spotlight as a macOS launcher with far more capability: clipboard history, window management, snippet expansion, calendar integration, GitHub actions, and a rich extension marketplace. The AI tier adds Claude and ChatGPT integration directly in the command bar. Highly popular among developers for its scripting API and the ability to publish extensions in React.",
    tags: ["macos", "productivity", "launcher", "developer-tools", "ai"],
    category: "Productivity & Tools",
  },

  // --- Security & Privacy ---
  {
    url: "https://owasp.org/www-project-top-ten/",
    title: "OWASP Top Ten Web Application Security Risks",
    description: "The most critical web security vulnerabilities, updated for 2021.",
    summary: "OWASP Top Ten 2021 covers the most critical web application security risks: Broken Access Control (ranked #1), Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components, Authentication Failures, Software and Data Integrity Failures, Logging Failures, and Server-Side Request Forgery. Each risk includes description, example attacks, prevention guidance, and CWE mappings.",
    tags: ["security", "owasp", "web-security", "vulnerability", "best-practices"],
    category: "Security & Privacy",
  },
  {
    url: "https://haveibeenpwned.com/",
    title: "Have I Been Pwned",
    description: "Check if your email or phone has been compromised in a data breach.",
    summary: "Troy Hunt's Have I Been Pwned aggregates data from hundreds of public data breaches — 12+ billion accounts — and lets anyone check whether their email or phone number appeared in leaked datasets. Also offers a Pwned Passwords API to check if a password has appeared in known breaches (used by 1Password, Firefox Monitor, and others). Free to query; API available for integration.",
    tags: ["security", "privacy", "data-breach", "passwords", "tool"],
    category: "Security & Privacy",
  },

  // --- Business & Startups ---
  {
    url: "https://paulgraham.com/startupideas.html",
    title: "How to Get Startup Ideas",
    description: "Paul Graham's essay on finding good startup ideas by noticing real problems.",
    summary: "Paul Graham argues the best startup ideas come from noticing problems you personally experience, especially problems that seem too niche or unsexy for large companies to address. Key principles: be a user of your own product, look for fast-changing spaces, choose problems where the market will be large in ten years even if it's small today, and notice problems others dismiss as 'too small'. The essay distinguishes between 'made up' ideas (working backward from what seems cool) versus 'found' ideas (working forward from real problems).",
    tags: ["startups", "entrepreneurship", "paul-graham", "product", "ideas"],
    category: "Business & Startups",
  },
  {
    url: "https://stripe.com/blog/payment-api-design",
    title: "Designing APIs for humans: Object not IDs",
    description: "Stripe on why returning full objects instead of IDs makes APIs dramatically better.",
    summary: "Stripe's engineering blog explains their philosophy of returning full nested objects rather than foreign key IDs in API responses. Instead of returning customer_id in a charge, they return the expanded customer object. This approach eliminates a class of N+1 request patterns, makes API responses self-documenting, and dramatically reduces the number of API calls needed to build a feature. The post covers the tradeoffs around response size and caching.",
    tags: ["api-design", "stripe", "developer-experience", "rest", "engineering"],
    category: "Business & Startups",
  },

  // --- Data & Databases ---
  {
    url: "https://www.postgresql.org/docs/current/textsearch.html",
    title: "PostgreSQL Full Text Search",
    description: "PostgreSQL's built-in full-text search with tsvector and tsquery.",
    summary: "PostgreSQL full-text search converts documents into tsvector (lexeme arrays) and queries into tsquery (lexeme patterns), then matches them using GIN or GiST indexes. Supports English and other language dictionaries, stop words, stemming, ranking with ts_rank, phrase search with <->, and headline generation. Enables fast text search without requiring an external search engine like Elasticsearch.",
    tags: ["postgresql", "full-text-search", "database", "search", "sql"],
    category: "Data & Databases",
  },
  {
    url: "https://www.pgvector.org/",
    title: "pgvector: Open-source vector similarity search for Postgres",
    description: "Store and query vector embeddings directly in PostgreSQL.",
    summary: "pgvector is a PostgreSQL extension that adds vector data types and similarity search operators. Supports exact and approximate nearest neighbor search using IVFFLAT and HNSW indexes. Enables semantic search and RAG (retrieval-augmented generation) directly in Postgres without a separate vector database like Pinecone or Weaviate. The HNSW index trades index build time for better query performance.",
    tags: ["pgvector", "postgresql", "vector-search", "embeddings", "database"],
    category: "Data & Databases",
  },

  // --- Open Standards ---
  {
    url: "https://modelcontextprotocol.io/",
    title: "Model Context Protocol",
    description: "Anthropic's open standard for connecting AI models to data sources and tools.",
    summary: "MCP (Model Context Protocol) is an open standard that enables AI assistants to connect to data sources, tools, and services in a consistent way. It defines a client-server architecture where AI applications (clients) connect to MCP servers that expose resources, tools, and prompts. MCP servers exist for databases, file systems, GitHub, Slack, and hundreds of other services. Designed to be transport-agnostic: works over stdio, HTTP, and WebSockets.",
    tags: ["mcp", "anthropic", "ai", "open-standard", "integration"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://webmachinelearning.github.io/webmcp/",
    title: "WebMCP Specification",
    description: "W3C Community Group draft for browser-native AI tool registration via document.modelContext.",
    summary: "WebMCP is a W3C Community Group draft specification that enables web pages to register structured tools accessible to AI agents browsing those pages. The API uses document.modelContext.registerTool() to expose named functions with JSON Schema input validation and natural language descriptions. Agents inherit the user's browser session — no separate auth needed for same-origin fetches. Tools run in the page's JS context, enabling tight integration with any web app.",
    tags: ["webmcp", "w3c", "browser-api", "ai-agents", "open-standard"],
    category: "AI & Machine Learning",
  },
  {
    url: "https://openai.com/webmcp-challenge/",
    title: "WebMCP Challenge — OpenAI",
    description: "10-day hackathon to build apps using the WebMCP browser API. $35K prize pool.",
    summary: "OpenAI's WebMCP Challenge runs August 25 – September 3, 2026. Top 10 submissions each receive $3,000 cash, ChatGPT Pro, a Codex Micro keyboard, and credits from Cloudflare, Vercel, Render, and Netlify. Judged on WebMCP leverage, execution quality, potential impact, and creativity. Requires a live URL (testable in ChatGPT browser mode), a demo video under 3 minutes, and a public open-source repository.",
    tags: ["webmcp", "hackathon", "openai", "challenge", "competition"],
    category: "AI & Machine Learning",
  },
] as const;

const DEMO_COLLECTIONS = [
  {
    name: "AI Reading List",
    description: "Papers, blog posts, and guides about AI and machine learning",
    slug: "demo-ai-reading-list",
    itemUrls: [
      "https://arxiv.org/abs/2307.09288",
      "https://www.anthropic.com/research/claude-character",
      "https://karpathy.github.io/2015/05/21/rnn-effectiveness/",
      "https://proceedings.neurips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
      "https://simonwillison.net/2023/Oct/23/embeddings/",
      "https://modelcontextprotocol.io/",
      "https://webmachinelearning.github.io/webmcp/",
    ],
  },
  {
    name: "Web Dev Essentials",
    description: "Frontend development, frameworks, and web platform resources",
    slug: "demo-web-dev",
    itemUrls: [
      "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023",
      "https://web.dev/articles/vitals",
      "https://nextjs.org/blog/next-15",
      "https://developer.mozilla.org/en-US/docs/Web/API/Web_Components",
    ],
  },
  {
    name: "Tools & Productivity",
    description: "Apps, tools, and workflows that improve how I work",
    slug: "demo-productivity",
    itemUrls: [
      "https://obsidian.md/",
      "https://github.com/features/copilot",
      "https://raycast.com/",
    ],
  },
] as const;

async function seed() {
  console.log("Seeding demo data...");

  // Upsert demo user
  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    console.log(`Using existing demo user: ${userId}`);
    // Ensure API key matches
    await db.update(user).set({ apiKey: DEMO_API_KEY }).where(eq(user.id, userId));
  } else {
    userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
      apiKey: DEMO_API_KEY,
    });
    console.log(`Created demo user: ${userId}`);
  }

  // Insert items (skip duplicates by url)
  const now = new Date();
  const insertedIds = new Map<string, string>(); // url → item id

  for (let i = 0; i < DEMO_ITEMS.length; i++) {
    const item = DEMO_ITEMS[i];
    const existing = await db.query.items.findFirst({
      where: (t, { and, eq: eq2 }) => and(eq2(t.userId, userId), eq2(t.url, item.url)),
    });
    if (existing) {
      insertedIds.set(item.url, existing.id);
      continue;
    }
    const id = crypto.randomUUID();
    const savedAt = new Date(now.getTime() - i * 3_600_000); // stagger by 1h each
    await db.insert(items).values({
      id,
      userId,
      url: item.url,
      title: item.title,
      description: item.description,
      summary: item.summary,
      tags: item.tags as unknown as string[],
      analysisStatus: "done",
      platform: "web",
      savedAt,
    });
    insertedIds.set(item.url, id);
    process.stdout.write(".");
  }
  console.log(`\nInserted ${insertedIds.size} items`);

  // Insert collections
  for (const col of DEMO_COLLECTIONS) {
    let collectionId: number;
    const existingCol = await db.query.collections.findFirst({
      where: (t, { eq: eq2 }) => eq2(t.slug, col.slug),
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
    console.log(`Collection "${col.name}" ready`);
  }

  console.log(`
Done! Demo credentials:
  Email:   ${DEMO_EMAIL}
  API key: ${DEMO_API_KEY}

WebMCP gateway URL:
  /webmcp?key=${DEMO_API_KEY}
`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
