"use client";

import { useEffect, useRef } from "react";

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

interface Props {
  apiKey: string | null;
}

export function WebMCPTools({ apiKey }: Props) {
  const apiKeyRef = useRef(apiKey);
  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    const ctx = getModelContext();
    if (!ctx) return;

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
          const res = await fetch(`/api/items?${params}`);
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
          const res = await fetch(`/api/items/${encodeURIComponent(String(id))}`);
          return res.ok ? res.json() : { error: "Not found", status: res.status };
        },
      });

      await ctx.registerTool({
        name: "get_recent",
        description:
          "Get the most recently saved items from the user's library in reverse chronological order. Use when the user asks 'what did I save recently' or 'show my latest saves'.",
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
          const res = await fetch(`/api/items?${params}`);
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
          const key = apiKeyRef.current;
          if (!key) return { error: "API key not available — open Settings to generate one" };
          const res = await fetch("/api/ingest/extension", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-savedpocket-key": key },
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
          "List all of the user's SavedPocket collections with names, descriptions, and item counts. Use before get_collection_items to get collection IDs.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const res = await fetch("/api/collections");
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
          const res = await fetch(`/api/collections/${collection_id}/items`);
          return res.ok ? res.json() : { error: "Fetch failed", status: res.status };
        },
      });
    };

    register().catch(console.error);
  }, []); // register once on mount; apiKey accessed via ref

  return null;
}
