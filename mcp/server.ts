#!/usr/bin/env node
/**
 * SavedPocket MCP Server
 *
 * Exposes your SavedPocket collections and items as tools for
 * Claude Desktop, Cursor, Zed, or any MCP-compatible client.
 *
 * Setup:
 *   cd mcp && npm install
 *
 * Required env vars:
 *   SAVEDPOCKET_API_KEY  — copy from the sidebar in the SavedPocket UI
 *   SAVEDPOCKET_URL      — default: http://localhost:3000
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = (process.env.SAVEDPOCKET_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env.SAVEDPOCKET_API_KEY ?? "";

if (!API_KEY) {
  process.stderr.write(
    "[savedpocket-mcp] ERROR: SAVEDPOCKET_API_KEY is not set.\n" +
      "Copy your API key from the SavedPocket sidebar and set it as an env variable.\n",
  );
  process.exit(1);
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-savedpocket-key": API_KEY,
  };
}

async function apiFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`SavedPocket API error: ${res.status} ${path}`);
  return res.json();
}

const server = new Server(
  { name: "savedpocket", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_collections",
      description:
        "List all your SavedPocket collections with their name, description, and item count.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_collection_items",
      description:
        "Get the items (saved links) inside a specific SavedPocket collection.",
      inputSchema: {
        type: "object",
        required: ["collection_id"],
        properties: {
          collection_id: {
            type: "number",
            description: "The numeric ID of the collection (from list_collections).",
          },
          limit: {
            type: "number",
            description: "Max items to return (default 50, max 200).",
          },
        },
      },
    },
    {
      name: "search_items",
      description:
        "Search SavedPocket items using semantic + full-text hybrid search. Optionally filter by collection.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query." },
          collection_id: {
            type: "number",
            description: "Optional: restrict search to this collection.",
          },
          limit: {
            type: "number",
            description: "Max results (default 20, max 50).",
          },
        },
      },
    },
    {
      name: "export_collection",
      description:
        "Export a collection as a Markdown document suitable for uploading to NotebookLM or other LLM tools.",
      inputSchema: {
        type: "object",
        required: ["collection_id"],
        properties: {
          collection_id: {
            type: "number",
            description: "The numeric ID of the collection to export.",
          },
        },
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_collections") {
      const data = await apiFetch("/api/collections");
      const cols = (data.collections ?? []) as Array<{
        id: number;
        name: string;
        description: string | null;
        itemCount: number;
        visibility: string;
      }>;

      const text =
        cols.length === 0
          ? "No collections found. Create one in the SavedPocket dashboard."
          : cols
              .map(
                (c) =>
                  `**${c.name}** (id: ${c.id}, items: ${c.itemCount}, visibility: ${c.visibility})${c.description ? `\n  ${c.description}` : ""}`,
              )
              .join("\n\n");

      return { content: [{ type: "text", text }] };
    }

    if (name === "get_collection_items") {
      const collectionId = args?.collection_id as number;
      const limit = Math.min(Number(args?.limit ?? 50), 200);

      const data = await apiFetch(`/api/items?collection=${collectionId}&limit=${limit}`);
      const its = (data.items ?? []) as Array<{
        title: string | null;
        url: string;
        platform: string;
        summary: string | null;
        notes: string | null;
        tags: string[] | null;
        userTags: string[] | null;
      }>;

      if (its.length === 0) {
        return { content: [{ type: "text", text: "This collection has no items yet." }] };
      }

      const text = its
        .map((item) => {
          const parts = [`**${item.title ?? item.url}**`, `URL: ${item.url}`];
          if (item.platform !== "web") parts.push(`Platform: ${item.platform}`);
          if (item.summary) parts.push(`Summary: ${item.summary}`);
          if (item.notes) parts.push(`Notes: ${item.notes}`);
          const tags = [...(item.tags ?? []), ...(item.userTags ?? [])];
          if (tags.length > 0) parts.push(`Tags: ${tags.join(", ")}`);
          return parts.join("\n");
        })
        .join("\n\n---\n\n");

      return { content: [{ type: "text", text }] };
    }

    if (name === "search_items") {
      const query = args?.query as string;
      const limit = Math.min(Number(args?.limit ?? 20), 50);
      const collectionParam = args?.collection_id ? `&collection=${args.collection_id}` : "";

      const data = await apiFetch(
        `/api/items?q=${encodeURIComponent(query)}&limit=${limit}${collectionParam}`,
      );
      const its = (data.items ?? []) as Array<{
        title: string | null;
        url: string;
        platform: string;
        summary: string | null;
      }>;

      if (its.length === 0) {
        return { content: [{ type: "text", text: `No results found for: "${query}"` }] };
      }

      const text = its
        .map(
          (item) =>
            `**${item.title ?? item.url}**\nURL: ${item.url}${item.summary ? `\n${item.summary}` : ""}`,
        )
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    }

    if (name === "export_collection") {
      const collectionId = args?.collection_id as number;
      const res = await fetch(
        `${BASE_URL}/api/collections/${collectionId}/export?format=markdown`,
        { headers: headers() },
      );
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const text = await res.text();
      return { content: [{ type: "text", text }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("[savedpocket-mcp] Server running. Waiting for MCP client...\n");
