# SavedPocket

**SavedPocket is a self-hosted "read-it-later brain" for everything you save across the internet.** It collects your saved/bookmarked posts from Instagram, LinkedIn, Reddit, X (Twitter), YouTube and arbitrary web links into one local, searchable library. Every saved item is automatically analyzed by an LLM (Claude), which categorizes it, tags it and writes a short summary — so months later you can actually *find* that post again instead of scrolling through five different apps.

> The name comes from the original idea: *"Kaydettin ama unutma beni"* — "You saved it, but don't forget me."

## What problem does it solve?

Saved posts are scattered across platforms, none of which offer good search, and most of which bury your bookmarks. SavedPocket:

- **Unifies** all saved content in a single dashboard (title, description, image, original link).
- **Understands** each item via AI: category (e.g. Programming, Career, Finance…), 3–6 tags, and a one-paragraph summary.
- **Makes it findable** with weighted PostgreSQL full-text search across titles, tags (AI + manual), summaries, notes and descriptions.
- **Stays yours**: everything runs locally (Docker), images are cached to disk, and each user's data is isolated behind email/password auth.

## Features

- 🔗 **Paste any link** — Open Graph / oEmbed metadata is fetched and the item is enriched automatically.
- 🧩 **Chrome extension (Manifest V3)** — passively collects items while you browse your own saved pages: Instagram Saved, LinkedIn My Items, X Bookmarks, Reddit Saved, YouTube Watch Later. No passwords needed; it authenticates with a per-user API key shown in the dashboard sidebar. On every other website a floating **SAVE** tab appears on the right edge of the page — click it to save the current page in one tap. Highlight any text and click the bookmark bubble that appears to save the page with the selection as a note. Right-clicking anywhere shows a **Save to SavedPocket** context menu entry (selected text automatically becomes the note).
- 🤖 **AI analysis queue** — a DB-backed job queue (Postgres `FOR UPDATE SKIP LOCKED`) analyzes each item with Claude (forced tool-use → guaranteed JSON), with retries, backoff and crash recovery.
- 🔁 **Re-analyze** — open any item's detail dialog and click **Re-analyze** to trigger a fresh AI analysis (e.g. after editing notes or tags, or if the initial analysis was poor). A **+ Image** variant is also available for items that have a cached image: it passes the image to Claude Vision alongside the text, which typically yields richer tags and a more accurate category — but consumes significantly more tokens. Both buttons show a warning note before you click. Token usage (in / out) for text and image analysis is recorded per item and displayed in the detail dialog.
- 🔍 **Hybrid search** — full-text (`tsvector`, title > tags > summary/notes > description) combined with semantic vector search (multilingual-e5-small, runs fully locally via `@huggingface/transformers`). Results are merged with Reciprocal Rank Fusion. Cross-language: a Turkish query finds English content.
- 🧠 **Semantic embeddings** — every item gets a 384-dimensional vector embedding after analysis; stored in pgvector (HNSW index). Embeddings update automatically when you edit tags or notes.
- 💬 **RAG chat** — ask questions about your library in natural language ("What did I save about React performance?"). The query is embedded, top-K nearest items are retrieved as context, and Claude answers with inline item links. Responses are rendered as formatted Markdown. User notes and manual tags are included in the retrieval context.
- 🗂 **Categories & filters** — AI-managed category list (soft-capped), platform filters, Unread filter (items never opened), sorting (newest, oldest, most visited, recently visited).
- 📝 **Personal notes & manual tags** per item — both included in search and embeddings.
- 👁 **Visit tracking** — click counts and last-visited date per item.
- 🧱 **Masonry grid with infinite scroll**, sticky header/sidebar.
- ✅ **Bulk actions** — hover-to-select checkboxes on cards; bulk category assignment or bulk delete.
- 📅 **Weekly digest card** — dismissible in-app card showing items saved this week, total unread count, and random "rediscover" picks from your unread backlog.
- 🔗 **Dead link detection** — background job checks every item's URL every 30 days; items returning 404/410 get a "link broken" badge on the card.
- 📤 **Export** — one-click JSON or CSV export of your entire library (toolbar buttons).
- 📱 **PWA + Web Share Target** — installable as a mobile app; share links directly to SavedPocket from any app on your phone without opening the browser.
- 🔐 **Multi-user** — email/password auth (better-auth); every user only sees their own items. Anthropic API keys and Reddit refresh tokens are encrypted at rest (AES-256-GCM, key derived from `BETTER_AUTH_SECRET`). Optional Reddit OAuth sync (max once per 24h) if you register a Reddit app.
- ♻️ **3-layer deduplication** — normalized URL, platform+external ID, and extension-side session dedup; re-scraping the same pages never creates duplicates or re-triggers analysis.
- ⌨️ **Keyboard shortcut** — press `/` anywhere to focus the search bar.

## Architecture

```
┌─────────────┐   paste link    ┌──────────────────────────────────┐
│   Browser    │ ──────────────► │  Next.js 15 (App Router, TS)     │
│  Dashboard   │ ◄────────────── │  • /api/ingest/link              │
└─────────────┘   search/filter  │  • /api/ingest/extension (batch) │
┌─────────────┐   batch POST     │  • /api/items (FTS + filters)    │
│   Chrome     │ ──────────────► │  • /api/auth/* (better-auth)     │
│  Extension   │  x-savedpocket- │  • in-process job worker         │
└─────────────┘  key header      │    (instrumentation.ts)          │
                                 └────────────┬─────────────────────┘
                                              │ Drizzle ORM
                                 ┌────────────▼─────────────────────┐
                                 │  PostgreSQL 16                   │
                                 │  items · categories · jobs ·     │
                                 │  connections · auth tables       │
                                 └────────────┬─────────────────────┘
                                              │ analyze_item / cache_image jobs
                                 ┌────────────▼─────────────────────┐
                                 │  Claude API (claude-haiku-4-5)   │
                                 │  category + tags + summary       │
                                 └──────────────────────────────────┘
```

**Stack:** Next.js 15 (full-stack, TypeScript) · Drizzle ORM · PostgreSQL 16 + pgvector · better-auth · Anthropic SDK · `@huggingface/transformers` (multilingual-e5-small, CPU) · Tailwind CSS 4 · Chrome extension (vanilla JS, MV3, no build step).

**Data flow:** ingest (link paste / extension / Reddit sync) → normalize URL & detect platform → dedup check → store item + enqueue `analyze_item`, `embed_item`, `cache_image`, and `check_link` jobs → worker claims jobs (`SKIP LOCKED`, concurrency 2, 3 retries with backoff) → Claude returns structured JSON via forced tool-use → category resolved/created, tags + summary stored → search vector (`tsvector`) and vector embedding (`vector(384)`) updated → link status checked periodically.

**Search:** keyword query hits both FTS (`websearch_to_tsquery`) and HNSW vector index simultaneously; results are merged via Reciprocal Rank Fusion. When no query is present, filtering and sorting run directly on indexed columns.

**Encryption:** `BETTER_AUTH_SECRET` is SHA-256 hashed into a 32-byte AES-256-GCM key. All Anthropic API keys and Reddit OAuth refresh tokens are encrypted before writing to Postgres and decrypted on read. Existing plaintext values are migrated automatically on first boot after upgrade.

## Quick start (Docker — recommended)

Prerequisites: [Docker](https://www.docker.com/) and an [Anthropic API key](https://console.anthropic.com/).

```bash
# 1. Clone and enter the project
git clone <this-repo-url> savedpocket
cd savedpocket

# 2. Create your .env
cp .env.example .env
# Edit .env and set:
#   BETTER_AUTH_SECRET=$(openssl rand -hex 32)   (required, session signing)
# ANTHROPIC_API_KEY is optional here - each user can add their own key
# in-app after signing up (Settings gear icon -> AI integration).

# 3. Build and start everything (app + PostgreSQL)
docker compose up -d --build
```

Open **http://localhost:3000**, create an account (email + password), and start pasting links. Database migrations and category seeding run automatically on startup.

- App data (Postgres + cached images) lives in named Docker volumes and survives restarts.
- Update to a new version: `git pull && docker compose up -d --build`.
- Logs: `docker compose logs -f app`.

## Local development (without dockerizing the app)

```bash
npm install
docker compose up -d postgres      # only the database
cp .env.example .env               # fill in ANTHROPIC_API_KEY + BETTER_AUTH_SECRET
npm run dev                        # http://localhost:3000
```

Migrations also run automatically in dev. Useful scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (includes the background job worker) |
| `npm run build` / `npm start` | Production build / start |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations manually |
| `npm run db:seed` | Seed default categories manually |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ | Random secret for session signing — `openssl rand -hex 32`. |
| `ANTHROPIC_API_KEY` | ⬜ | Server-wide *fallback* key for AI analysis. Each user can set their own key in-app (**Settings → AI integration**), which takes precedence. Without any key, items are stored but not analyzed (a "Set AI key" banner appears). |
| `DATABASE_URL` | dev only | Postgres connection string. Docker compose sets it automatically for the `app` service. Default: `postgresql://savedpocket:savedpocket@localhost:5432/savedpocket`. |
| `ANTHROPIC_MODEL` | ⬜ | Defaults to `claude-haiku-4-5`. |
| `BETTER_AUTH_URL` | ⬜ | Public URL of the app. Defaults to `http://localhost:3000`. |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | ⬜ | One-time **developer** Reddit OAuth app (not per user). Enables the in-app "Connect Reddit" flow. See below. |
| `IMAGE_CACHE_DIR` | ⬜ | Where downloaded images are cached. Defaults to `./data/images` (a Docker volume in compose). |

## Chrome extension setup

The extension collects items from pages you already have open — it never asks for platform passwords.

1. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the `extension/` folder.
2. Make sure you are logged in to SavedPocket (`http://localhost:3000`) in the same browser — the extension fetches your personal API key from your session automatically (no configuration needed).
3. Visit your saved pages and scroll — items appear in the dashboard automatically:
   - Instagram → `instagram.com/<you>/saved/`
   - LinkedIn → `linkedin.com/my-items/`
   - X → `x.com/i/bookmarks`
   - Reddit → `reddit.com/user/<you>/saved`

### Save any page from the extension

On every non-SavedPocket website the extension provides three ways to save:

| Method | How |
|---|---|
| **Floating SAVE tab** | A bookmark tab is pinned to the right edge of every page. Click it to save the current URL. |
| **Text selection bubble** | Highlight any text — a small bookmark icon appears near the selection. Click it to save the page with the highlighted text stored as a personal note. |
| **Right-click context menu** | Right-click anywhere → **Save to SavedPocket**. Right-click on selected text → **Save selection to SavedPocket** (the selection becomes the note). |
| **Toolbar icon** | Click the SavedPocket icon in Chrome's toolbar to open the dashboard. |

The tab shows live feedback: **SAVED** (new item), **IN LIB** (already in your library), or **ERR** if something went wrong. Notes captured via selection or context menu are fully indexed by full-text search and included in the RAG chat context.

Already-collected items are deduplicated on both the extension side and the server side.

## Reddit API sync (optional)

If you can register a Reddit OAuth app (type *web app*, redirect URI `http://localhost:3000/api/auth/reddit/callback` — note Reddit's Responsible Builder Policy may require approval), set `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`. Users then click **Connect Reddit** in the dashboard; their saved posts sync automatically at most once per 24 hours (per-user refresh tokens are stored in the `connections` table). Without API access, the Chrome extension's Reddit scraper works with zero configuration.

## Project structure

```
savedpocket/
├── docker-compose.yml        # pgvector/pgvector:pg16 + app services
├── Dockerfile                # multi-stage build (node:22-slim, Next.js standalone)
├── drizzle/                  # SQL migrations (applied automatically on startup)
├── extension/                # Chrome MV3 extension (no build step)
│   ├── background.js         # zero-config: fetches API key from session automatically
│   └── content/              # per-platform DOM scrapers (instagram/linkedin/x/reddit/youtube)
├── public/
│   ├── manifest.webmanifest  # PWA manifest with share_target
│   ├── sw.js                 # minimal service worker (installability only)
│   └── icon-*.svg            # app icons
├── src/
│   ├── instrumentation.ts    # runs migrations + starts the job worker
│   ├── db/                   # Drizzle schema, client, migration/seed helpers
│   ├── lib/
│   │   ├── claude.ts         # AI analysis (forced tool-use, prompt caching)
│   │   ├── crypto.ts         # AES-256-GCM encrypt/decrypt for stored secrets
│   │   ├── embeddings.ts     # multilingual-e5-small via @huggingface/transformers
│   │   ├── ingest.ts         # normalize → dedup → store → enqueue
│   │   ├── og-parser.ts      # Open Graph / oEmbed metadata fetch
│   │   ├── url-normalize.ts  # tracking-param cleanup + platform detection
│   │   ├── reddit.ts         # Reddit OAuth + saved-posts sync
│   │   └── queue/            # DB-backed worker (SKIP LOCKED, retries, embed/link jobs)
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/         # RAG chat endpoint (embed query → retrieve → Claude)
│   │   │   ├── digest/       # weekly stats + rediscover suggestions
│   │   │   ├── export/       # JSON + CSV export
│   │   │   └── …             # items, categories, ingest, sync, auth, images, me, settings
│   │   └── share/            # Web Share Target landing page
│   └── components/           # Dashboard, ItemCard, ChatDialog, DigestCard, …
├── data/images/              # cached item images (gitignored, bind-mounted in Docker)
└── data/models/              # embedding model cache (~120MB, downloaded once)
```

## License / disclaimer

Personal-use tool. The browser extension only reads pages you open in your own authenticated sessions; respect each platform's terms of service when using it.
