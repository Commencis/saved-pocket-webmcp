// Service worker: forwards scraped items to the SavedPocket API.
// Configure server URL and API key via the extension popup (click the toolbar icon).

// ── Config helpers ────────────────────────────────────────────────────────────
// Service workers are killed when idle, so we always read from storage.

async function getConfig() {
  const { serverUrl, apiKey } = await chrome.storage.local.get(["serverUrl", "apiKey"]);
  return {
    serverUrl: (serverUrl || "http://localhost:3000").replace(/\/$/, ""),
    apiKey: apiKey || null,
  };
}

// Session-first key resolution: active browser session wins over stored key.
// Result is cached for 30 s to avoid a /api/me request on every save.
let _sessionKey = null;
let _sessionTs = 0;
const SESSION_TTL = 30_000;

async function resolveApiKey(serverUrl) {
  // 1. Return cached session key if still fresh
  const now = Date.now();
  if (_sessionKey && now - _sessionTs < SESSION_TTL) return _sessionKey;

  // 2. Try active browser session (cookie-based)
  try {
    const res = await fetch(`${serverUrl}/api/me`, { credentials: "include" });
    if (res.ok) {
      const me = await res.json();
      if (me?.apiKey) {
        _sessionKey = me.apiKey;
        _sessionTs = now;
        // Keep storage in sync so the popup shows the right account
        const { apiKey: stored } = await chrome.storage.local.get("apiKey");
        if (me.apiKey !== stored) {
          await chrome.storage.local.set({ apiKey: me.apiKey });
        }
        return me.apiKey;
      }
    }
  } catch {}

  // 3. No active session — fall back to manually stored key
  _sessionKey = null;
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) return apiKey;

  throw new Error(
    `Not logged in to SavedPocket. Open ${serverUrl}, sign in, ` +
    `or copy your API key from Settings into the extension popup.`
  );
}

// ── Send helpers ──────────────────────────────────────────────────────────────

async function send(platform, items, { retried = false } = {}) {
  const { serverUrl } = await getConfig();
  const apiKey = await resolveApiKey(serverUrl);

  const res = await fetch(`${serverUrl}/api/ingest/extension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-savedpocket-key": apiKey },
    body: JSON.stringify({ platform, items }),
  });

  if (res.status === 401 && !retried) {
    // Key may be stale — clear cache and stored key, retry once
    _sessionKey = null; _sessionTs = 0;
    await chrome.storage.local.remove("apiKey");
    return send(platform, items, { retried: true });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function sendUrl(url, { title = null, note = null, mcpContent = null, retried = false } = {}) {
  const { serverUrl } = await getConfig();
  const apiKey = await resolveApiKey(serverUrl);

  const res = await fetch(`${serverUrl}/api/ingest/extension`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-savedpocket-key": apiKey },
    body: JSON.stringify({ items: [{ url, title, notes: note, mcpContent }] }),
  });

  if (res.status === 401 && !retried) {
    _sessionKey = null; _sessionTs = 0;
    await chrome.storage.local.remove("apiKey");
    return sendUrl(url, { title, note, mcpContent, retried: true });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { created, received }
}

// ── Context menus ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sp-save-page",
    title: "Save to SavedPocket",
    contexts: ["page", "link", "frame"],
  });
  chrome.contextMenus.create({
    id: "sp-save-selection",
    title: "Save selection to SavedPocket",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url   = info.linkUrl || info.frameUrl || tab?.url;
  if (!url) return;
  const note  = info.selectionText || null;
  const title = info.linkUrl ? null : (tab?.title || null);
  sendUrl(url, { title, note })
    .then(() => console.log(`[SavedPocket] context menu saved: ${url}`))
    .catch((err) => console.warn("[SavedPocket] context menu save failed:", err));
});

// ── Messages from content scripts ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // save-anywhere.js: save a single page URL
  if (message?.type === "SAVEDPOCKET_SAVE_URL") {
    sendUrl(message.url, { title: message.title, note: message.note, mcpContent: message.mcpContent ?? null })
      .then((data) => sendResponse({
        ok: true,
        created: data?.created > 0,
        itemId: data?.items?.[0]?.id ?? null,
        itemTitle: data?.items?.[0]?.title ?? null,
      }))
      .catch((err) => {
        console.warn("[SavedPocket] save URL failed:", err);
        sendResponse({ ok: false });
      });
    return true; // keep channel open for async response
  }

  // save-anywhere.js: fetch a saved item (for analysis polling)
  if (message?.type === "SAVEDPOCKET_GET_ITEM") {
    (async () => {
      try {
        const { serverUrl } = await getConfig();
        const apiKey = await resolveApiKey(serverUrl).catch(() => null);
        if (!apiKey) { sendResponse({ error: true }); return; }
        const res = await fetch(`${serverUrl}/api/items/${message.id}`, {
          headers: { "x-savedpocket-key": apiKey },
        });
        sendResponse(res.ok ? await res.json() : { error: true, status: res.status });
      } catch (err) {
        console.warn("[SavedPocket] get item failed:", err);
        sendResponse({ error: true });
      }
    })();
    return true;
  }

  // save-anywhere.js: patch a saved item (title, notes, userTags)
  if (message?.type === "SAVEDPOCKET_PATCH_ITEM") {
    (async () => {
      try {
        const { serverUrl } = await getConfig();
        const apiKey = await resolveApiKey(serverUrl).catch(() => null);
        if (!apiKey) { sendResponse({ error: true }); return; }
        const res = await fetch(`${serverUrl}/api/items/${message.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-savedpocket-key": apiKey },
          body: JSON.stringify(message.patch),
        });
        sendResponse(res.ok ? await res.json() : { error: true, status: res.status });
      } catch (err) {
        console.warn("[SavedPocket] patch item failed:", err);
        sendResponse({ error: true });
      }
    })();
    return true;
  }

  // save-anywhere.js: discover WebMCP endpoint for an origin via /.well-known/mcp.json
  if (message?.type === "SAVEDPOCKET_MCP_DISCOVER") {
    (async () => {
      try {
        const res = await fetch(`${message.origin}/.well-known/mcp.json`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) { sendResponse({ mcpUrl: null }); return; }
        const data = await res.json();
        // Draft spec uses "endpoint" or "url"
        const mcpUrl = data.endpoint || data.url || null;
        sendResponse({ mcpUrl });
      } catch {
        sendResponse({ mcpUrl: null });
      }
    })();
    return true;
  }

  // save-anywhere.js: fetch page content from a WebMCP server
  if (message?.type === "SAVEDPOCKET_MCP_FETCH") {
    (async () => {
      try {
        const endpoint = message.mcpUrl;
        const signal = AbortSignal.timeout(5000);
        const post = (id, method, params) =>
          fetch(endpoint, {
            method: "POST", signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          });

        // 1. initialize
        const initRes = await post(1, "initialize", {
          protocolVersion: "2024-11-05",
          clientInfo: { name: "SavedPocket", version: "1.0" },
          capabilities: {},
        });
        if (!initRes.ok) { sendResponse({ content: null }); return; }

        // 2. resources/list
        const listRes = await post(2, "resources/list", {});
        if (!listRes.ok) { sendResponse({ content: null }); return; }
        const { result: listResult } = await listRes.json();
        const resources = listResult?.resources ?? [];

        // 3. Find resource matching the current page URL (or fall back to first)
        const pageResource =
          resources.find((r) => r.uri === message.pageUrl || (r.uri && message.pageUrl.startsWith(r.uri))) ??
          resources[0];
        if (!pageResource) { sendResponse({ content: null }); return; }

        // 4. resources/read
        const readRes = await post(3, "resources/read", { uri: pageResource.uri });
        if (!readRes.ok) { sendResponse({ content: null }); return; }
        const { result: readResult } = await readRes.json();
        const contents = readResult?.contents ?? [];
        const text = contents
          .map((c) => c.text || (c.resource && c.resource.text) || "")
          .join("\n")
          .trim()
          .slice(0, 10000); // cap to avoid oversized payloads
        sendResponse({ content: text || null });
      } catch {
        sendResponse({ content: null });
      }
    })();
    return true;
  }

  // save-anywhere.js: check whether the current page URL is already saved
  if (message?.type === "SAVEDPOCKET_CHECK_URL") {
    (async () => {
      try {
        const { serverUrl } = await getConfig();
        const apiKey = await resolveApiKey(serverUrl).catch(() => null);
        if (!apiKey) { sendResponse({ found: false }); return; }
        const res = await fetch(
          `${serverUrl}/api/items/lookup?url=${encodeURIComponent(message.url)}`,
          { headers: { "x-savedpocket-key": apiKey } },
        );
        sendResponse(res.ok ? await res.json() : { found: false });
      } catch {
        sendResponse({ found: false });
      }
    })();
    return true;
  }

  // Platform scrapers: batch of saved items
  if (message?.type === "SAVEDPOCKET_ITEMS") {
    const items = message.items;
    if (!items?.length) return;
    send(message.platform, items)
      .then(() => console.log(`[SavedPocket] sent ${items.length} ${message.platform} item(s)`))
      .catch((err) => console.warn("[SavedPocket] send failed, will retry on next scroll:", err));
  }

  // Popup notifies that config was updated — clear session cache so next key
  // resolution re-evaluates rather than returning a stale cached value.
  if (message?.type === "SAVEDPOCKET_CONFIG_UPDATE") {
    _sessionKey = null; _sessionTs = 0;
    console.log("[SavedPocket] config updated");
  }
});
