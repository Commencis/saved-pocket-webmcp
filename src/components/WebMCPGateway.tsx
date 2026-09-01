"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// WebMCP browser API — https://webmachinelearning.github.io/webmcp/
// Spec (Aug 2026) uses document.modelContext; ChatGPT shipped navigator.tools — we support both.
declare global {
  interface Document {
    modelContext?: WebMCPContext;
  }
  interface Navigator {
    tools?: WebMCPContext; // ChatGPT browser mode (older draft)
  }
}

interface WebMCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

interface WebMCPContext {
  registerTool(tool: WebMCPTool): Promise<void>;
}

function getModelContext(): WebMCPContext | null {
  if (typeof document === "undefined") return null;
  return document.modelContext ?? navigator.tools ?? null;
}

const TOOL_LIST = [
  { name: "search_library",       desc: "Semantic + keyword search across all saved items" },
  { name: "get_item",             desc: "Full details of a single item by ID" },
  { name: "get_recent",           desc: "Most recently saved items" },
  { name: "save_url",             desc: "Save a URL with optional title and notes" },
  { name: "list_collections",     desc: "All collections with item counts" },
  { name: "get_collection_items", desc: "Items inside a specific collection" },
];

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function removeStorage(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

const LS_KEY = "webmcp_api_key";

export function WebMCPGateway() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [toolsActive, setToolsActive] = useState(false);
  const [webmcpSupported, setWebmcpSupported] = useState(true);
  const registeredRef = useRef(false);

  // Resolve key: URL param → localStorage → nothing
  useEffect(() => {
    const urlKey = searchParams.get("key");
    const stored = readStorage(LS_KEY);
    const resolved = urlKey || stored;
    if (urlKey) writeStorage(LS_KEY, urlKey);
    if (resolved) setApiKey(resolved);
  }, [searchParams]);

  // Register WebMCP tools whenever key becomes available
  useEffect(() => {
    if (!apiKey || registeredRef.current) return;

    const ctx = getModelContext();
    if (!ctx) {
      setWebmcpSupported(false);
      setToolsActive(true);
      registeredRef.current = true;
      return;
    }

    const hdrs = { "x-savedpocket-key": apiKey };

    const register = async () => {
      await ctx.registerTool({
        name: "search_library",
        description:
          "Search the user's SavedPocket library with natural language. Returns saved links with AI-generated summaries, titles, categories, and source platform. Uses semantic vector search — finds results by meaning, not just keywords. Use this first when the user mentions anything they may have previously saved.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language search query" },
            limit: { type: "number", description: "Max results (default 10, max 30)" },
          },
          required: ["query"],
        },
        annotations: { readOnlyHint: true },
        execute: async ({ query, limit = 10 }) => {
          const params = new URLSearchParams({
            q: String(query),
            limit: String(Math.min(Number(limit) || 10, 30)),
          });
          const res = await fetch(`/api/items?${params}`, { headers: hdrs });
          return res.ok ? res.json() : { error: "Search failed", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "get_item",
        description:
          "Get the full details of a single saved item by its ID, including AI-generated summary, extracted content, tags, and notes. Use after search_library or get_recent when the user wants to read or discuss a specific item.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Item ID from search_library or get_recent results" },
          },
          required: ["id"],
        },
        annotations: { readOnlyHint: true },
        execute: async ({ id }) => {
          const res = await fetch(`/api/items/${encodeURIComponent(String(id))}`, { headers: hdrs });
          return res.ok ? res.json() : { error: "Not found", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "get_recent",
        description:
          "Get the most recently saved items in reverse chronological order. Use when the user asks 'what did I save recently' or 'show my latest saves'.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of items (default 5, max 30)" },
          },
        },
        annotations: { readOnlyHint: true },
        execute: async ({ limit = 5 }) => {
          const params = new URLSearchParams({
            sort: "newest",
            limit: String(Math.min(Number(limit) || 5, 30)),
          });
          const res = await fetch(`/api/items?${params}`, { headers: hdrs });
          return res.ok ? res.json() : { error: "Fetch failed", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "save_url",
        description:
          "Save a URL to the user's SavedPocket library. AI analysis and summarization run automatically after saving. Use when the user says 'save this', 'bookmark this', or 'add this to my library'.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to save" },
            title: { type: "string", description: "Optional title override" },
            notes: { type: "string", description: "Optional notes to attach" },
          },
          required: ["url"],
        },
        annotations: { readOnlyHint: false },
        execute: async ({ url, title, notes }) => {
          const res = await fetch("/api/ingest/extension", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...hdrs },
            body: JSON.stringify({
              items: [
                {
                  url: String(url),
                  ...(title ? { title: String(title) } : {}),
                  ...(notes ? { notes: String(notes) } : {}),
                },
              ],
            }),
          });
          return res.ok ? res.json() : { error: "Save failed", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "list_collections",
        description:
          "List all of the user's SavedPocket collections with names, descriptions, and item counts. Call before get_collection_items to get collection IDs.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const res = await fetch("/api/collections", { headers: hdrs });
          return res.ok ? res.json() : { error: "Fetch failed", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "get_collection_items",
        description:
          "Get the saved items inside a specific collection. Call list_collections first to get the collection ID.",
        inputSchema: {
          type: "object",
          properties: {
            collection_id: { type: "number", description: "Collection ID from list_collections" },
          },
          required: ["collection_id"],
        },
        annotations: { readOnlyHint: true },
        execute: async ({ collection_id }) => {
          const res = await fetch(`/api/collections/${collection_id}/items`, { headers: hdrs });
          return res.ok ? res.json() : { error: "Fetch failed", status: res.status };
        },
      });

      setToolsActive(true);
    };

    register().catch(console.error);
    registeredRef.current = true;
  }, [apiKey]);

  function handleSave() {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    writeStorage(LS_KEY, trimmed);
    registeredRef.current = false;
    setToolsActive(false);
    setApiKey(trimmed);
  }

  function handleClear() {
    removeStorage(LS_KEY);
    setApiKey(null);
    setInputKey("");
    setToolsActive(false);
    registeredRef.current = false;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-2">
            WebMCP Gateway
          </p>
          <h1 className="text-2xl font-semibold text-white">
            SavedPocket
          </h1>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            This page exposes your library as browser-native tools via the{" "}
            <a
              href="https://webmachinelearning.github.io/webmcp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              WebMCP API
            </a>
            . Any WebMCP-aware AI agent that visits this page can search, browse, and save to your library.
          </p>
        </div>

        {/* Active state */}
        {apiKey && toolsActive && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
              <span className="flex h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
              <span className="text-sm font-medium text-green-400">
                {webmcpSupported ? `${TOOL_LIST.length} tools active` : `${TOOL_LIST.length} tools ready`}
              </span>
              {!webmcpSupported && (
                <span className="ml-auto text-xs text-neutral-500">
                  (WebMCP not detected in this browser)
                </span>
              )}
            </div>
            <ul className="divide-y divide-neutral-800">
              {TOOL_LIST.map((t) => (
                <li key={t.name} className="flex items-baseline gap-3 px-4 py-2.5">
                  <code className="text-xs font-mono text-blue-400 whitespace-nowrap flex-shrink-0">
                    {t.name}
                  </code>
                  <span className="text-xs text-neutral-500">{t.desc}</span>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-600 font-mono truncate">
                key: {apiKey.slice(0, 8)}••••
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
              >
                Clear key
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {apiKey && !toolsActive && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-4 text-sm text-neutral-400">
            Registering tools…
          </div>
        )}

        {/* No key — input form */}
        {!apiKey && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-300 mb-1 font-medium">Enter your API key</p>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Copy it from the SavedPocket dashboard → Settings → API key section.
              Once saved it persists in this browser — future visits work without the URL parameter.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="sp_..."
                className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSave}
                disabled={!inputKey.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Usage hint */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-800">
            <span className="text-xs font-mono text-neutral-500">Usage</span>
          </div>
          <div className="px-4 py-3 font-mono text-xs text-neutral-400 space-y-1 overflow-x-auto">
            <div>
              <span className="text-neutral-600"># Give this URL to a WebMCP-aware agent:</span>
            </div>
            <div className="text-blue-400 break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/webmcp?key=YOUR_API_KEY`
                : "/webmcp?key=YOUR_API_KEY"}
            </div>
            <div className="mt-2 text-neutral-600"># Verify in DevTools console:</div>
            <div className="text-neutral-300">await document.modelContext.getTools()</div>
          </div>
        </div>

      </div>
    </div>
  );
}
