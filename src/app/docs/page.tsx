import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Home } from "lucide-react";
import { DocsToc } from "./DocsToc";

export const metadata: Metadata = {
  title: "Docs — SavedPocket",
  description: "SavedPocket documentation: setup, features, Chrome extension, collections, export, and MCP server.",
};

// ── Reusable primitives ──────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="group mt-12 scroll-mt-24 text-xl font-semibold text-neutral-900 first:mt-0">
      <a href={`#${id}`} className="after:ml-2 after:text-neutral-300 after:opacity-0 after:content-['#'] group-hover:after:opacity-100">
        {children}
      </a>
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="group mt-8 scroll-mt-24 text-base font-semibold text-neutral-800">
      <a href={`#${id}`} className="after:ml-2 after:text-neutral-300 after:opacity-0 after:content-['#'] group-hover:after:opacity-100">
        {children}
      </a>
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed text-neutral-700">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.82em] text-neutral-800">
      {children}
    </code>
  );
}

function Pre({ children, title }: { children: string; title?: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 text-sm">
      {title && (
        <div className="border-b border-neutral-800 px-4 py-2 font-mono text-xs text-neutral-400">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-neutral-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-neutral-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-neutral-700 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ type, children }: { type: "info" | "tip" | "warn"; children: React.ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    tip: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  const labels = { info: "ℹ️  Note", tip: "✅  Tip", warn: "⚠️  Warning" };
  return (
    <div className={`mt-4 rounded-xl border p-4 text-sm ${styles[type]}`}>
      <p className="mb-1 font-semibold">{labels[type]}</p>
      {children}
    </div>
  );
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc text-neutral-700 leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── TOC ─────────────────────────────────────────────────────────────────────

const toc = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "quickstart", label: "Quick Start (Docker)" },
  { id: "local-dev", label: "Local Development" },
  { id: "env-vars", label: "Environment Variables" },
  { id: "extension", label: "Chrome Extension" },
  { id: "ext-install", label: "↳ Installation" },
  { id: "ext-popup", label: "↳ Extension Popup" },
  { id: "ext-server-url", label: "↳ Server URL" },
  { id: "whatsapp-import", label: "WhatsApp Import" },
  { id: "collections", label: "Collections" },
  { id: "export", label: "Export for LLM / NotebookLM" },
  { id: "mcp", label: "MCP Server" },
  { id: "webmcp", label: "WebMCP (Browser AI)" },
  { id: "search", label: "Search & AI" },
  { id: "architecture", label: "Architecture" },
  { id: "project-structure", label: "Project Structure" },
  { id: "api-reference", label: "API Reference" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900">
            <Home className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
            <BookOpen className="h-4 w-4" />
            Docs
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-6 py-10">
        {/* Sidebar TOC */}
        <aside className="sticky top-[60px] hidden h-[calc(100vh-80px)] w-56 shrink-0 overflow-y-auto lg:block">
          <DocsToc items={toc} />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24">

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          <H2 id="overview">Overview</H2>
          <P>
            <strong>SavedPocket</strong> is a self-hosted "read-it-later brain" for everything you save across the internet.
            It collects your saved posts from Instagram, LinkedIn, X (Twitter), YouTube and arbitrary web links
            into one local, searchable library. Every saved item is automatically analyzed by an LLM (Claude), which
            categorizes it, tags it and writes a short summary — so months later you can actually <em>find</em> that post
            again instead of scrolling through five different apps.
          </P>
          <P>
            The name comes from the original idea: <em>"Kaydettin ama unutma beni"</em> — "You saved it, but don't forget me."
          </P>
          <P>It solves three problems:</P>
          <UL items={[
            <><strong>Unification</strong> — all saved content in a single dashboard (title, description, image, original link).</>,
            <><strong>Understanding</strong> — AI assigns a category, 3–6 tags, and a one-paragraph summary to each item.</>,
            <><strong>Findability</strong> — weighted PostgreSQL full-text + semantic vector search across everything.</>,
          ]} />

          <Callout type="info">
            <p><strong>Personal data & enterprise use:</strong> SavedPocket only processes content from your own accounts. For enterprise deployments where employee data is integrated into the system, a written data-processing agreement with the relevant organization must be in place before onboarding. See <a href="/legal" className="underline">LEGAL_NOTICE.md</a> for full usage terms.</p>
          </Callout>

          {/* ── FEATURES ─────────────────────────────────────────── */}
          <H2 id="features">Features</H2>
          <UL items={[
            <><strong>Paste any link</strong> — Open Graph / oEmbed metadata is fetched and the item is enriched automatically.</>,
            <><strong>Chrome extension (MV3)</strong> — passively collects items from Instagram Saved, LinkedIn My Items, X Bookmarks, and YouTube Watch Later. On every other website a floating <strong>SAVE</strong> tab appears; highlight text to save with a note; right-click for context menu.</>,
            <><strong>AI analysis queue</strong> — DB-backed job queue (Postgres <Code>FOR UPDATE SKIP LOCKED</Code>) analyzes each item with Claude via forced tool-use → guaranteed JSON output, with retries and backoff.</>,
            <><strong>Re-analyze</strong> — open any item and click <strong>Re-analyze</strong> for a fresh analysis. <strong>+ Image</strong> variant also available (Claude Vision), consuming more tokens for richer results. Token usage tracked per item.</>,
            <><strong>Hybrid search</strong> — full-text (<Code>tsvector</Code>) + semantic vector search (multilingual-e5-small, local CPU inference). Results merged with Reciprocal Rank Fusion. Cross-language: Turkish query finds English content.</>,
            <><strong>RAG chat</strong> — ask questions about your library in natural language. Top-K semantic matches become context for Claude, which answers with inline item links, rendered as Markdown.</>,
            <><strong>Collections</strong> — group items into named collections, share via URL (link-only or public), allow forking. Public collections appear in the Marketplace.</>,
            <><strong>Export for LLM</strong> — download any collection as Markdown or JSON to use as a source in NotebookLM, Claude Projects, or any LLM tool.</>,
            <><strong>WhatsApp Import</strong> — export a WhatsApp chat as <Code>.txt</Code>, upload it in-app, preview the extracted URLs, and import them in bulk. Imported items get a <strong>WhatsApp</strong> platform tag and are processed by AI like any other item.</>,
            <><strong>MCP Server</strong> — connect SavedPocket to Claude Desktop, Cursor, or Zed via MCP. Browse collections and search items directly from your AI assistant.</>,
            <><strong>WebMCP (Browser AI)</strong> — exposes your library as browser-native tools via the <a href="https://webmachinelearning.github.io/webmcp/" className="text-blue-600 underline">WebMCP API</a>. Any WebMCP-aware AI agent (ChatGPT browser mode, future browser assistants) can search and save to your library the moment you open the dashboard — no extension, no API key setup required.</>,
            <><strong>Categories &amp; filters</strong> — AI-managed category list, platform filters, Unread filter, sort by newest / oldest / most visited / recently visited.</>,
            <><strong>Personal notes &amp; tags</strong> per item — both included in search and embeddings.</>,
            <><strong>Bulk actions</strong> — hover-to-select checkboxes; bulk category assignment or bulk delete.</>,
            <><strong>Weekly digest card</strong> — items saved this week, unread count, and random "rediscover" picks.</>,
            <><strong>Dead link detection</strong> — background job checks every URL every 30 days; 404/410 responses get a "link broken" badge.</>,
            <><strong>Export all items</strong> — one-click JSON or CSV export of your entire library (toolbar buttons).</>,
            <><strong>PWA + Web Share Target</strong> — installable as a mobile app; share links from any app on your phone.</>,
            <><strong>Multi-user</strong> — email/password auth (better-auth); each user sees only their own items. OpenAI API keys encrypted at rest (AES-256-GCM).</>,
            <><strong>3-layer deduplication</strong> — normalized URL, platform+external ID, and extension-side session dedup.</>,
          ]} />

          {/* ── QUICK START ─────────────────────────────────────────── */}
          <H2 id="quickstart">Quick Start (Docker)</H2>
          <P>Prerequisites: <a href="https://www.docker.com/" className="text-blue-600 underline">Docker</a> and an OpenAI API key (optional — each user can add their own key in-app).</P>
          <Pre title="Terminal">{`# 1. Clone and enter the project
git clone <this-repo-url> savedpocket
cd savedpocket

# 2. Create your .env
cp .env.example .env
# Edit .env and set BETTER_AUTH_SECRET:
#   BETTER_AUTH_SECRET=$(openssl rand -hex 32)

# 3. Build and start (app + PostgreSQL)
docker compose up -d --build`}</Pre>
          <P>Open <strong>http://localhost:3000</strong>, create an account, and start pasting links. Database migrations and category seeding run automatically on startup.</P>
          <Callout type="tip">
            <p>App data (Postgres + cached images) lives in named Docker volumes and survives restarts. To update: <Code>git pull && docker compose up -d --build</Code></p>
          </Callout>

          {/* ── LOCAL DEV ─────────────────────────────────────────── */}
          <H2 id="local-dev">Local Development</H2>
          <Pre title="Terminal">{`npm install
docker compose up -d postgres      # only the database
cp .env.example .env               # fill in vars
npm run dev                        # http://localhost:3000`}</Pre>
          <P>Migrations run automatically in dev. Useful scripts:</P>
          <Table
            headers={["Script", "Purpose"]}
            rows={[
              [<Code>npm run dev</Code>, "Dev server (includes the background job worker)"],
              [<Code>npm run build</Code>, "Production build"],
              [<Code>npm start</Code>, "Start production server"],
              [<Code>npm run db:generate</Code>, "Generate a new Drizzle migration from schema changes"],
              [<Code>npm run db:migrate</Code>, "Apply migrations manually"],
              [<Code>npm run db:seed</Code>, "Seed default categories manually"],
            ]}
          />

          {/* ── ENV VARS ─────────────────────────────────────────── */}
          <H2 id="env-vars">Environment Variables</H2>
          <Table
            headers={["Variable", "Required", "Description"]}
            rows={[
              [<Code>BETTER_AUTH_SECRET</Code>, "✅", <>Random secret for session signing — <Code>openssl rand -hex 32</Code>.</>],
              [<Code>OPENAI_API_KEY</Code>, "⬜", "Server-wide fallback key for AI analysis. Each user can set their own key in Settings, which takes precedence. Without any key, items are stored but not analyzed."],
              [<Code>DATABASE_URL</Code>, "dev only", <>Postgres connection string. Docker Compose sets it automatically. Default: <Code>postgresql://savedpocket:savedpocket@localhost:5432/savedpocket</Code></>],
              [<Code>AI_MODEL</Code>, "⬜", <>Defaults to <Code>gpt-4o-mini</Code>.</>],
              [<Code>BETTER_AUTH_URL</Code>, "⬜", <>Public URL of the app. Defaults to <Code>http://localhost:3000</Code>.</>],
              [<Code>IMAGE_CACHE_DIR</Code>, "⬜", <>Where downloaded images are cached. Defaults to <Code>./data/images</Code>.</>],
              [<Code>MODEL_CACHE_DIR</Code>, "⬜", <>Where HuggingFace embedding model files are cached. Defaults to <Code>./data/models</Code>. Docker Compose sets this automatically.</>],
            ]}
          />

          {/* ── CHROME EXTENSION ─────────────────────────────────────────── */}
          <H2 id="extension">Chrome Extension</H2>
          <P>The extension collects items from pages you already have open — it never asks for platform passwords. It works with any SavedPocket instance, whether local or hosted remotely.</P>

          <H3 id="ext-install">Installation</H3>
          <P>The extension is distributed as a <Code>.zip</Code> file. No build step required — it is plain JavaScript (Chrome MV3).</P>
          <UL items={[
            <>Unzip the file to any permanent folder on your computer (do not delete it after install).</>,
            <>Open <Code>chrome://extensions</Code> in Chrome.</>,
            <>Enable <strong>Developer mode</strong> (toggle, top-right corner).</>,
            <>Click <strong>Load unpacked</strong> and select the unzipped folder.</>,
            <>Pin the SavedPocket icon to the Chrome toolbar for easy access.</>,
          ]} />
          <Callout type="info">
            <p>Developer mode must stay enabled for unpacked extensions to keep running. It has no effect on your browser's security or other extensions.</p>
          </Callout>

          <H3 id="ext-popup">Extension Popup</H3>
          <P>Click the SavedPocket icon in Chrome's toolbar to open the popup. This is where you configure the connection to your SavedPocket instance.</P>
          <Table
            headers={["Field / Button", "Description"]}
            rows={[
              [<><strong>Local dev</strong> / <strong>Remote server</strong></>, "Preset buttons — quickly switch between localhost and a remote URL."],
              ["Server URL", <>The URL of your SavedPocket instance. Defaults to <Code>http://localhost:3000</Code>. Change this if your server is hosted elsewhere.</>],
              ["API Key", "Your personal API key. Paste it here if the extension cannot auto-detect your session (common for remote servers)."],
              [<><strong>Save &amp; Test</strong></>, "Saves the config and immediately tests the connection — the status indicator updates to green (connected) or red (error)."],
              [<><strong>Open Dashboard ↗</strong></>, "Opens your SavedPocket dashboard in a new tab."],
              ["Status indicator", <>Green dot = connected and authenticated. Red dot = cannot reach the server or not logged in. Hover for the error message.</>],
            ]}
          />

          <H3 id="ext-server-url">Server URL Configuration</H3>
          <P>If SavedPocket is hosted at a custom domain (not localhost), tell the extension where to find it:</P>
          <UL items={[
            <>Click the SavedPocket icon in the toolbar → popup opens.</>,
            <>Click <strong>Remote server</strong> or type your URL directly into the <strong>Server URL</strong> field (e.g. <Code>https://pocket.yourdomain.com</Code>).</>,
            <>Click <strong>Save &amp; Test</strong> — the extension checks the connection and tries to fetch your API key automatically from your active session.</>,
            <>If auto-detection fails (status stays red), copy your API key from the dashboard sidebar and paste it into the <strong>API Key</strong> field, then <strong>Save &amp; Test</strong> again.</>,
          ]} />
          <Callout type="tip">
            <p>Make sure you are <strong>logged in</strong> to your SavedPocket instance in the same browser before clicking Save &amp; Test — the extension uses your session cookie to fetch the key automatically when possible.</p>
          </Callout>

          <H3 id="ext-platforms">Platform Scrapers</H3>
          <P>Visit the URL below while logged in — the extension detects the page and silently collects your saved items as you scroll.</P>
          <Table
            headers={["Platform", "URL to visit"]}
            rows={[
              ["Instagram", <Code>instagram.com/&lt;you&gt;/saved/</Code>],
              ["LinkedIn", <Code>linkedin.com/my-items/</Code>],
              ["X / Twitter", <Code>x.com/i/bookmarks</Code>],
              ["YouTube Watch Later", <Code>youtube.com/playlist?list=WL</Code>],
            ]}
          />
          <H3 id="ext-save-methods">Save Any Page</H3>
          <Table
            headers={["Method", "How"]}
            rows={[
              ["Floating SAVE tab", "A bookmark tab is pinned to the right edge of every page. Click it to save the current URL."],
              ["Text selection bubble", "Highlight any text — a small bookmark icon appears. Click it to save the page with the highlighted text as a personal note."],
              ["Right-click context menu", <>Right-click anywhere → <strong>Save to SavedPocket</strong>. Right-click on selected text → <strong>Save selection to SavedPocket</strong> (selection becomes the note).</>],
              ["Toolbar popup", <>Click the SavedPocket toolbar icon → <strong>Open Dashboard ↗</strong>, or use <strong>Save &amp; Test</strong> to confirm the connection.</>],
            ]}
          />
          <P>
            The floating tab shows live feedback: <strong>SAVED</strong> (new item), <strong>IN LIB</strong> (already in your library), or <strong>ERR</strong> if something went wrong.
          </P>

          <H3 id="ext-api-key">API Key</H3>
          <P>
            Your personal API key is shown in the dashboard sidebar (bottom of the left panel). Click it to copy to clipboard.
            On localhost the extension picks it up automatically from your session — no manual step needed.
            On a remote server, paste the key into the <strong>API Key</strong> field in the popup.
          </P>
          <Pre title="extension/background.js — authentication flow">{`// 1. Read stored key from chrome.storage.local
// 2. If no stored key → GET /api/me with credentials (session cookie)
// 3. All ingest requests send:  x-savedpocket-key: <key>
// 4. On 401, clear stale key and retry step 2 once`}</Pre>

          {/* ── WHATSAPP IMPORT ─────────────────────────────────────────── */}
          <H2 id="whatsapp-import">WhatsApp Import</H2>
          <P>
            If you share links with yourself on WhatsApp (a common habit), you can bulk-import them into SavedPocket
            in a few steps. WhatsApp lets you export any chat as a plain <Code>.txt</Code> file; SavedPocket
            reads that file client-side (nothing is uploaded to the server), extracts every URL, and
            lets you review them before committing.
          </P>

          <H3 id="whatsapp-how">How to Export from WhatsApp</H3>
          <UL items={[
            <>Open WhatsApp and go to the chat you use to save links (usually your own "Saved Messages" or a personal chat).</>,
            <>Tap the three-dot menu <strong>···</strong> → <strong>More</strong> → <strong>Export Chat</strong>.</>,
            <>Choose <strong>Without Media</strong> — this produces a <Code>.txt</Code> file.</>,
            <>Save or share the file to your computer.</>,
          ]} />
          <Callout type="tip">
            <p>WhatsApp iOS and Android both export to the same <Code>.txt</Code> format — both are supported.</p>
          </Callout>

          <H3 id="whatsapp-import-steps">Import Steps</H3>
          <UL items={[
            <>Click the <strong>Upload</strong> icon in the dashboard header.</>,
            <>Select your exported <Code>.txt</Code> file — URLs are extracted and listed instantly in your browser (the file is never sent to the server).</>,
            <>Review the list: check or uncheck individual URLs. WhatsApp system links (<Code>wa.me</Code>, <Code>whatsapp.com</Code>) are filtered out automatically.</>,
            <>Click <strong>X link ekle</strong> to start the import. A progress bar shows live status.</>,
            <>When done, a summary shows how many were added, how many were already in your library, and any errors.</>,
          ]} />

          <H3 id="whatsapp-platform-tag">WhatsApp Platform Tag</H3>
          <P>
            Every imported URL is tagged with <Code>platform: whatsapp</Code>.
            In the sidebar, select <strong>WhatsApp</strong> under platform filters to see only items imported from WhatsApp.
            AI analysis (category, tags, summary) runs automatically after import, just like any other saved item.
          </P>

          <H3 id="whatsapp-api">API</H3>
          <Pre title="POST /api/import/whatsapp">{`# Up to 500 URLs per request
curl -X POST http://localhost:3000/api/import/whatsapp \\
  -H "x-savedpocket-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"urls": ["https://example.com", "https://github.com/..."]}'

# Response
{ "total": 2, "created": 2, "duplicates": 0, "errors": [] }`}</Pre>
          <Callout type="info">
            <p>
              Duplicate URLs (already in your library) are silently skipped — they count as <Code>duplicates</Code> in the response, not errors.
              Re-running the same import is always safe.
            </p>
          </Callout>

          {/* ── COLLECTIONS ─────────────────────────────────────────── */}
          <H2 id="collections">Collections</H2>
          <P>
            Collections are curated, shareable groups of saved items. One item can belong to multiple collections.
            They appear in the sidebar under <strong>Collections</strong>.
          </P>

          <H3 id="collections-create">Creating a Collection</H3>
          <UL items={[
            <>Click the <strong>+</strong> icon next to "Collections" in the sidebar.</>,
            <>Give it a name and an optional description.</>,
            <>Set visibility: <strong>Private</strong> (only you), <strong>Anyone with the link</strong>, or <strong>Public</strong> (listed in Marketplace).</>,
            <>Optionally allow <strong>forking</strong> — others can copy the collection into their own library.</>,
          ]} />

          <H3 id="collections-add-items">Adding Items</H3>
          <P>Hover over any item card and click the <strong>bookmark+</strong> icon that appears. A dropdown lists your collections — click one to add the item.</P>

          <H3 id="collections-filter">Filtering by Collection</H3>
          <P>Click a collection name in the sidebar. The main grid shows only items in that collection. Search and platform filters still apply on top.</P>

          <H3 id="collections-share">Sharing</H3>
          <P>
            Open the collection dialog (click the <strong>···</strong> button next to the collection name) and copy the share link.
            Anyone with the link can view the collection at <Code>/share/collections/[slug]</Code> without logging in.
          </P>

          <H3 id="collections-marketplace">Marketplace</H3>
          <P>
            Collections with <strong>Public</strong> visibility appear at <Link href="/marketplace" className="text-blue-600 underline">/marketplace</Link>.
            Visitors can browse, view, and fork public collections.
          </P>

          {/* ── EXPORT ─────────────────────────────────────────── */}
          <H2 id="export">Export for LLM / NotebookLM</H2>
          <P>
            Any collection can be exported as a structured document for use in LLM tools.
            Open the collection dialog (click <strong>···</strong> next to the collection) and use the <strong>Export for LLM / NotebookLM</strong> buttons at the bottom.
          </P>

          <H3 id="export-formats">Formats</H3>
          <Table
            headers={["Format", "Best for", "Endpoint"]}
            rows={[
              ["Markdown (.md)", "NotebookLM upload, Claude Projects, any LLM", <Code>/api/collections/[id]/export?format=markdown</Code>],
              ["JSON (.json)", "Programmatic use, custom pipelines", <Code>/api/collections/[id]/export?format=json</Code>],
            ]}
          />

          <H3 id="export-markdown">Markdown Structure</H3>
          <Pre title="Example export output">{`# AI and ML Resources

> SavedPocket collection | 12 items | Exported: 2026-08-03

---

## The Illustrated Transformer

**Platform:** web
**URL:** https://jalammar.github.io/illustrated-transformer/
**Summary:** A visual guide to the Transformer architecture with clear diagrams.
**Tags:** transformer, attention, deep-learning
**Notes:** Must read before anything else

---

## How GPT Works

**Platform:** youtube
**URL:** https://www.youtube.com/watch?v=...
**Summary:** 20-minute explanation of GPT internals.

---

## YouTube Sources (for NotebookLM)

The following YouTube URLs can be added as individual YouTube sources in NotebookLM:

- https://www.youtube.com/watch?v=...`}</Pre>

          <H3 id="export-auth">Authentication</H3>
          <P>The export endpoint accepts both session cookies (browser) and the <Code>x-savedpocket-key</Code> header (API key), so it can be called from scripts or the MCP server.</P>
          <Pre title="curl example">{`curl -H "x-savedpocket-key: YOUR_API_KEY" \\
  "http://localhost:3000/api/collections/1/export?format=markdown" \\
  -o my-collection.md`}</Pre>

          <H3 id="export-notebooklm">NotebookLM — 3 Ways to Use</H3>
          <Table
            headers={["Method", "Collection type", "Steps"]}
            rows={[
              [
                "Share URL",
                "link_only or public",
                <>Set visibility → copy share link from dialog → paste into NotebookLM <strong>Add source → Website</strong>.</>
              ],
              [
                "Export file",
                "Any",
                <>Export as Markdown → download → NotebookLM <strong>Add source → Upload</strong>.</>
              ],
              [
                "YouTube URLs",
                "Collections with YouTube items",
                <>Markdown export lists YouTube URLs at the bottom → paste each into NotebookLM <strong>Add source → YouTube</strong>.</>
              ],
            ]}
          />
          <Callout type="tip">
            <p>
              The <strong>Share URL</strong> method is the easiest — once the collection is public or link-only, just paste the URL and NotebookLM will scrape it automatically (no download needed).
            </p>
          </Callout>

          {/* ── MCP SERVER ─────────────────────────────────────────── */}
          <H2 id="mcp">MCP Server</H2>
          <P>
            The MCP server lets Claude Desktop, Cursor, Zed, or any MCP-compatible client browse and search your SavedPocket collections directly as AI tools — no copy-paste required.
          </P>
          <Callout type="info">
            <p>MCP is for <strong>Claude Desktop / Cursor / Zed</strong>, not for NotebookLM (which is a separate Google product). For NotebookLM, use the export options above.</p>
          </Callout>

          <H3 id="mcp-setup">Setup</H3>
          <Pre title="Terminal">{`cd mcp
npm install`}</Pre>

          <H3 id="mcp-tools">Available Tools</H3>
          <Table
            headers={["Tool", "Description"]}
            rows={[
              [<Code>list_collections</Code>, "Lists all your collections with name, item count, and visibility."],
              [<Code>get_collection_items</Code>, "Returns the items inside a specific collection (paginated)."],
              [<Code>search_items</Code>, "Hybrid semantic + full-text search across your library. Optional collection filter."],
              [<Code>export_collection</Code>, "Returns a collection as a Markdown document — paste into any LLM context."],
            ]}
          />

          <H3 id="mcp-claude-desktop">Claude Desktop Config</H3>
          <P>
            Add the following to your <Code>claude_desktop_config.json</Code>
            (location: <Code>~/Library/Application Support/Claude/claude_desktop_config.json</Code> on Mac):
          </P>
          <Pre title="claude_desktop_config.json">{`{
  "mcpServers": {
    "savedpocket": {
      "command": "npx",
      "args": [
        "--yes",
        "tsx",
        "/absolute/path/to/savedpocket/mcp/server.ts"
      ],
      "env": {
        "SAVEDPOCKET_URL": "http://localhost:3000",
        "SAVEDPOCKET_API_KEY": "paste-your-api-key-here"
      }
    }
  }
}`}</Pre>
          <Callout type="tip">
            <p>Copy your API key from the <strong>API key</strong> section at the bottom of the SavedPocket sidebar. Click the key to copy it to clipboard.</p>
          </Callout>

          <H3 id="mcp-cursor">Cursor / Zed Config</H3>
          <Pre title="Cursor — .cursor/mcp.json">{`{
  "mcpServers": {
    "savedpocket": {
      "command": "npx",
      "args": ["--yes", "tsx", "/absolute/path/to/savedpocket/mcp/server.ts"],
      "env": {
        "SAVEDPOCKET_URL": "http://localhost:3000",
        "SAVEDPOCKET_API_KEY": "paste-your-api-key-here"
      }
    }
  }
}`}</Pre>

          <H3 id="mcp-usage">Example Usage in Claude Desktop</H3>
          <Pre>{`User: What have I saved about Transformer architecture?

Claude: [calls search_items("transformer architecture")]
→ Returns 4 matching items from your library with summaries and links.

User: Export my "AI Resources" collection as context.

Claude: [calls list_collections → get_collection_items(3)]
→ Returns all 12 items formatted as markdown.`}</Pre>

          {/* ── WEBMCP ──────────────────────────────────────────────── */}
          <H2 id="webmcp">WebMCP — Browser AI Tools</H2>
          <P>
            <a href="https://webmachinelearning.github.io/webmcp/" className="text-blue-600 underline">WebMCP</a> is a W3C Community Group draft API that lets a web page expose structured functions as MCP tools callable by AI agents browsing that page. SavedPocket registers tools automatically when you open the dashboard — no configuration needed.
          </P>
          <Callout type="info">
            <p><strong>How it differs from the MCP Server:</strong> The server-side MCP requires Claude Desktop / Cursor installation and an API key. WebMCP works entirely in the browser — any WebMCP-aware agent (ChatGPT browser mode) that visits your dashboard gains immediate access to your library through the tools below. For external agents that browse in their own isolated context, use the <a href="/webmcp" className="text-blue-600 underline">WebMCP Gateway</a> with an API key.</p>
          </Callout>
          <Callout type="warn">
            <p><strong>Platform transition note:</strong> Current platform integrations (Instagram, LinkedIn, X, YouTube) rely on the Chrome extension accessing pages you already have open — no platform passwords are stored or transmitted. As the <a href="https://webmachinelearning.github.io/webmcp/" className="text-blue-600 underline">WebMCP standard</a> (W3C draft) matures and platforms adopt it, SavedPocket will migrate to accessing data through platforms' own agreed APIs under their Terms of Service, replacing extension-based collection with a consent-based data model.</p>
          </Callout>

          <H3 id="webmcp-tools">Registered Tools</H3>
          <Table
            headers={["Tool", "Description", "Auth"]}
            rows={[
              [<Code>search_library</Code>, "Semantic + full-text search across all saved items. Returns items with AI summaries, titles, categories, and platforms.", "Session cookie (auto)"],
              [<Code>get_item</Code>, "Full details of a single item by ID — summary, content, tags, notes. Use after search_library to fetch a specific item.", "Session cookie (auto)"],
              [<Code>get_recent</Code>, "Returns the N most recently saved items (default 5, max 30).", "Session cookie (auto)"],
              [<Code>save_url</Code>, <>Saves a URL to the library. Accepts optional <Code>title</Code> and <Code>notes</Code>. AI analysis runs automatically after save.</>, "API key (x-savedpocket-key)"],
              [<Code>list_collections</Code>, "Lists all user collections with names, descriptions, and item counts.", "Session cookie (auto)"],
              [<Code>get_collection_items</Code>, "Returns all items inside a specific collection by ID.", "Session cookie (auto)"],
            ]}
          />

          <H3 id="webmcp-verify">Verify in Browser Console</H3>
          <P>Open the SavedPocket dashboard in a WebMCP-enabled browser, then run these from DevTools:</P>
          <Pre title="Browser Console">{`// List all registered tools (Aug 2026 spec)
await document.modelContext.getTools()

// Search your library
await document.modelContext.executeTool('search_library', { query: 'rust concurrency', limit: 5 })

// Get a specific item by ID
await document.modelContext.executeTool('get_item', { id: '<item-id-from-search>' })

// Get recent saves
await document.modelContext.executeTool('get_recent', { limit: 10 })

// Save a URL
await document.modelContext.executeTool('save_url', { url: 'https://example.com', notes: 'saved via WebMCP' })

// List collections
await document.modelContext.executeTool('list_collections', {})`}</Pre>

          <H3 id="webmcp-compat">Browser Compatibility</H3>
          <P>
            WebMCP uses <Code>document.modelContext</Code> per the August 2026 W3C draft. SavedPocket also supports the older <Code>navigator.tools</Code> shape for backward compatibility with ChatGPT browser mode. The API is available in:
          </P>
          <UL items={[
            <>ChatGPT browser mode (when browsing via ChatGPT — uses <Code>navigator.tools</Code>)</>,
            <>Chrome with the WebMCP origin trial or experimental flag enabled</>,
            <>Any browser that ships the WebMCP API as the spec matures</>,
          ]} />
          <P>
            In unsupported browsers both APIs are <Code>undefined</Code> and the component silently no-ops — no errors, no impact on the rest of the dashboard. Use the <a href="/webmcp" className="text-blue-600 underline">WebMCP Gateway</a> (<Code>/webmcp?key=YOUR_API_KEY</Code>) to connect external agents that browse in their own browser context.
          </P>

          {/* ── SEARCH & AI ─────────────────────────────────────────── */}
          <H2 id="search">Search &amp; AI</H2>
          <H3 id="search-hybrid">Hybrid Search</H3>
          <P>
            Every search hits two indexes simultaneously and merges results with Reciprocal Rank Fusion (RRF):
          </P>
          <UL items={[
            <><strong>Full-text search</strong> (<Code>tsvector</Code>) — weighted: title {'>'} tags {'>'} summary/notes {'>'} description. Uses <Code>websearch_to_tsquery</Code> so quoted phrases and <Code>-exclusions</Code> work.</>,
            <><strong>Vector search</strong> — every item has a 384-dimensional embedding (multilingual-e5-small, runs locally on CPU via <Code>@huggingface/transformers</Code>). Stored in pgvector with an HNSW index. Cross-language: a Turkish query finds English content.</>,
          ]} />

          <H3 id="search-rag">RAG Chat</H3>
          <P>
            The chat button in the toolbar opens a dialog where you can ask questions about your library. The query is embedded, top-K nearest items are retrieved, and an AI model answers with inline item links. Responses render as formatted Markdown.
          </P>
          <Callout type="info">
            <p>Chat requires an OpenAI API key (server-wide in <Code>.env</Code> or per-user in Settings → AI integration).</p>
          </Callout>

          <H3 id="search-ai-analysis">AI Analysis</H3>
          <P>Each item is analyzed via a DB-backed job queue:</P>
          <UL items={[
            <>Jobs are claimed with <Code>SELECT ... FOR UPDATE SKIP LOCKED</Code> — safe for multiple workers.</>,
            <>Claude uses forced tool-use (structured output) to return category, tags, and summary as guaranteed JSON.</>,
            <>Up to 3 retries with linear backoff (30 s × attempt number) on failure.</>,
            <>Token usage (in / out) is recorded per item and visible in the item detail dialog.</>,
            <>The <strong>Re-analyze</strong> button in the item detail re-queues a fresh analysis. <strong>+ Image</strong> variant also sends the cached image to Claude Vision for richer results.</>,
          ]} />

          {/* ── ARCHITECTURE ─────────────────────────────────────────── */}
          <H2 id="architecture">Architecture</H2>
          <Pre>{`┌─────────────┐   paste link    ┌──────────────────────────────────────┐
│   Browser    │ ──────────────► │  Next.js 15 (App Router, TypeScript) │
│  Dashboard   │ ◄────────────── │  • /api/ingest/link                  │
└─────────────┘   search/filter  │  • /api/ingest/extension (batch)     │
┌─────────────┐   batch POST     │  • /api/items (FTS + filters)        │
│   Chrome     │ ──────────────► │  • /api/chat (RAG)                   │
│  Extension   │  x-savedpocket- │  • /api/collections (CRUD + export)  │
└─────────────┘  key header      │  • /api/auth/* (better-auth)         │
┌─────────────┐   stdio          │  • in-process job worker             │
│  MCP Server  │ ──────────────► │    (instrumentation.ts)              │
│  (mcp/)      │  API key        └────────────┬─────────────────────────┘
└─────────────┘                               │ Drizzle ORM
                                 ┌────────────▼─────────────────────────┐
                                 │  PostgreSQL 16 + pgvector            │
                                 │  items · collections · categories ·  │
                                 │  jobs · connections · auth tables    │
                                 └────────────┬─────────────────────────┘
                                              │ analyze_item / embed_item jobs
                                 ┌────────────▼─────────────────────────┐
                                 │  Claude API (claude-haiku-4-5)       │
                                 │  category + tags + summary           │
                                 └──────────────────────────────────────┘`}</Pre>

          <P><strong>Stack:</strong> Next.js 15 (full-stack, TypeScript) · Drizzle ORM · PostgreSQL 16 + pgvector · better-auth · OpenAI SDK · <Code>@huggingface/transformers</Code> (multilingual-e5-small, CPU) · Tailwind CSS 4 · Chrome extension (vanilla JS, MV3, no build step).</P>

          <H3 id="arch-data-flow">Data Flow</H3>
          <P>ingest → normalize URL &amp; detect platform → dedup check → store item + enqueue jobs → worker claims jobs (SKIP LOCKED, concurrency 2, 3 retries) → Claude returns structured JSON → category resolved, tags + summary stored → search vector (<Code>tsvector</Code>) and vector embedding (<Code>vector(384)</Code>) updated → link status checked periodically.</P>

          <H3 id="arch-encryption">Encryption</H3>
          <P><Code>BETTER_AUTH_SECRET</Code> is SHA-256 hashed into a 32-byte AES-256-GCM key. All OpenAI API keys are encrypted before writing to Postgres and decrypted on read. Existing plaintext values are migrated automatically on first boot.</P>

          {/* ── PROJECT STRUCTURE ─────────────────────────────────────────── */}
          <H2 id="project-structure">Project Structure</H2>
          <Pre>{`savedpocket/
├── docker-compose.yml        # pgvector/pgvector:pg16 + app services
├── Dockerfile                # multi-stage build (node:22-slim, Next.js standalone)
├── drizzle/                  # SQL migrations (applied automatically on startup)
├── extension/                # Chrome MV3 extension (no build step)
│   ├── background.js         # zero-config: fetches API key from session automatically
│   ├── shared.js             # dedup + send helpers shared by scrapers
│   └── content/              # per-platform DOM scrapers
│       ├── instagram.js
│       ├── linkedin.js
│       ├── x.js
│       ├── youtube.js
│       └── save-anywhere.js  # floating SAVE tab + text selection bubble
├── mcp/                      # MCP server (Claude Desktop / Cursor / Zed)
│   ├── server.ts             # 4 tools: list_collections, get_collection_items,
│   │                         #          search_items, export_collection
│   └── package.json
├── public/
│   ├── manifest.webmanifest  # PWA manifest with share_target
│   ├── sw.js                 # minimal service worker
│   └── icon-*.svg
└── src/
    ├── instrumentation.ts    # runs migrations + starts the job worker on boot
    ├── db/                   # Drizzle schema, client, migration/seed helpers
    ├── lib/
    │   ├── claude.ts         # AI analysis (forced tool-use, prompt caching)
    │   ├── crypto.ts         # AES-256-GCM encrypt/decrypt for stored secrets
    │   ├── embeddings.ts     # multilingual-e5-small via @huggingface/transformers
    │   ├── ingest.ts         # normalize → dedup → store → enqueue
    │   ├── og-parser.ts      # Open Graph / oEmbed metadata fetch
    │   ├── url-normalize.ts  # tracking-param cleanup + platform detection
    │   ├── slug.ts           # collection slug generation
    │   └── queue/            # DB-backed worker (SKIP LOCKED, retries)
    └── app/
        ├── api/
        │   ├── chat/         # RAG chat (embed → retrieve → Claude)
        │   ├── collections/  # CRUD + items + fork + public + export
        │   ├── export/       # full library JSON/CSV export
        │   ├── ingest/       # link paste + extension batch ingest
        │   ├── items/        # list/search, detail, visit tracking, bulk
        │   ├── marketplace/  # public collections listing
        │   ├── me/           # profile + API key (session or key auth)
        │   └── settings/ai/  # per-user OpenAI key management
        ├── docs/             # this page
        ├── marketplace/      # public collections browser
        ├── webmcp/           # WebMCP Gateway — browser-accessible MCP endpoint
        └── share/
            ├── page.tsx      # generic /share landing
            └── collections/[slug]/  # public collection view + fork`}</Pre>

          {/* ── API REFERENCE ─────────────────────────────────────────── */}
          <H2 id="api-reference">API Reference</H2>
          <P>All endpoints require authentication unless marked as public. Use <Code>x-savedpocket-key: YOUR_KEY</Code> header or session cookies.</P>

          <H3 id="api-ingest">Ingest</H3>
          <Table
            headers={["Method", "Endpoint", "Description"]}
            rows={[
              ["POST", <Code>/api/ingest/link</Code>, "Ingest a single URL from the dashboard paste input."],
              ["POST", <Code>/api/ingest/extension</Code>, <>Batch ingest from Chrome extension. Body: <Code>&#123; platform?, items: [&#123;url, title?, notes?, ...&#125;] &#125;</Code>. Authenticated via <Code>x-savedpocket-key</Code>.</>],
              ["POST", <Code>/api/import/whatsapp</Code>, <>Bulk import URLs from a WhatsApp export. Body: <Code>&#123; urls: string[] &#125;</Code> (max 500). Returns <Code>&#123; total, created, duplicates, errors &#125;</Code>. Imported items get <Code>platform: whatsapp</Code>.</>],
            ]}
          />

          <H3 id="api-items">Items</H3>
          <Table
            headers={["Method", "Endpoint", "Query params / Notes"]}
            rows={[
              ["GET", <Code>/api/items</Code>, <><Code>q</Code> search · <Code>category</Code> · <Code>platform</Code> · <Code>collection</Code> · <Code>unread=1</Code> · <Code>sort</Code> · <Code>page</Code> · <Code>limit</Code></>],
              ["GET", <Code>/api/items/[id]</Code>, "Item detail (no embedding/searchVector)."],
              ["PATCH", <Code>/api/items/[id]</Code>, "Update notes, userTags, categoryId."],
              ["DELETE", <Code>/api/items/[id]</Code>, "Delete a single item."],
              ["POST", <Code>/api/items/[id]/visit</Code>, "Increment visit count + update lastVisitedAt."],
              ["POST", <Code>/api/items/[id]/reanalyze</Code>, "Re-queue AI analysis. Body: <Code>{ withImage?: boolean }</Code>."],
              ["GET/POST/DELETE", <Code>/api/items/[id]/collections</Code>, "List / add to / remove from collections."],
              ["GET", <Code>/api/items/lookup</Code>, <>Check if a URL is already in the library. Query param: <Code>?url=</Code>. Returns <Code>&#123; found, id?, title? &#125;</Code>. Used by the extension to show IN LIB / SAVE state. Requires <Code>x-savedpocket-key</Code>.</>],
            ]}
          />

          <H3 id="api-collections">Collections</H3>
          <Table
            headers={["Method", "Endpoint", "Description"]}
            rows={[
              ["GET", <Code>/api/collections</Code>, "List user's collections with item counts."],
              ["POST", <Code>/api/collections</Code>, <><Code>&#123; name, description?, visibility, forkable &#125;</Code> — creates a collection and generates a unique slug.</>],
              ["PATCH", <Code>/api/collections/[id]</Code>, "Update name, description, visibility, forkable."],
              ["DELETE", <Code>/api/collections/[id]</Code>, "Delete collection (items are NOT deleted)."],
              ["GET", <Code>/api/collections/[id]/items</Code>, "Items in the collection, ordered by date added."],
              ["POST", <Code>/api/collections/[id]/items</Code>, <><Code>&#123; itemIds: string[] &#125;</Code> — add items.</>],
              ["DELETE", <Code>/api/collections/[id]/items/[itemId]</Code>, "Remove an item from the collection."],
              ["GET", <Code>/api/collections/[id]/export</Code>, <><Code>?format=markdown|json</Code> — download as file. Accepts session or API key auth.</>],
              ["GET", <Code>/api/collections/[id]/public</Code>, "Public metadata + items (no auth required for link_only/public)."],
              ["POST", <Code>/api/collections/[id]/fork</Code>, "Fork a forkable collection into your own library."],
              ["GET", <Code>/api/marketplace</Code>, "Paginated list of public collections."],
            ]}
          />

          <H3 id="api-misc">Other Endpoints</H3>
          <Table
            headers={["Method", "Endpoint", "Description"]}
            rows={[
              ["GET", <Code>/api/me</Code>, "Current user profile + API key. Accepts session or x-savedpocket-key header."],
              ["GET", <Code>/api/categories</Code>, "List categories with item counts."],
              ["POST", <Code>/api/chat</Code>, <><Code>&#123; message: string, collectionId?: number &#125;</Code> — RAG chat. Embeds query, retrieves top-K nearest items, returns <Code>&#123; answer, items &#125;</Code>.</>],
              ["GET", <Code>/api/export</Code>, "Export full library. <Code>?format=json|csv</Code>."],
              ["GET", <Code>/api/digest</Code>, "Weekly stats + rediscover suggestions."],
              ["GET", <Code>/api/sync/status</Code>, "Check background sync job status."],
              ["GET", <Code>/api/images/[itemId]</Code>, "Serve cached item image."],
              ["GET", <Code>/api/settings/ai</Code>, "Current user's AI config — whether a user/server key is set, masked key, and effective model."],
              ["PUT", <Code>/api/settings/ai</Code>, <>Save per-user OpenAI API key and/or model. Body: <Code>&#123; apiKey?, model? &#125;</Code>. Validates credentials before saving; re-queues previously failed analyses on success.</>],
            ]}
          />

          <Callout type="info">
            <p>
              All API routes that accept <Code>x-savedpocket-key</Code> also handle CORS preflight (<Code>OPTIONS</Code>) to support cross-origin requests from the Chrome extension.
            </p>
          </Callout>

        </main>
      </div>
    </div>
  );
}
