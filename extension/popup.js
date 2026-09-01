const LOCAL_URL = "http://localhost:3000";

const elUrl     = document.getElementById("server-url");
const elKey     = document.getElementById("api-key");
const elBtnLoc  = document.getElementById("btn-local");
const elBtnRem  = document.getElementById("btn-remote");
const elBtnSave = document.getElementById("btn-save");
const elBtnDash = document.getElementById("btn-dash");
const elBtnVis  = document.getElementById("btn-vis");
const elStatus  = document.getElementById("status");
const elStTxt   = document.getElementById("status-text");
const elHint    = document.getElementById("hint");
const elHintLnk = document.getElementById("hint-link");

// ── Boot: load stored config ─────────────────────────────────────────────────

chrome.storage.local.get(["serverUrl", "apiKey"], ({ serverUrl, apiKey }) => {
  const url = serverUrl || LOCAL_URL;
  elUrl.value = url;
  elKey.value = apiKey || "";
  syncPresetButtons(url);
  probeConnection(url, apiKey || null);
});

// ── Preset buttons ───────────────────────────────────────────────────────────

elBtnLoc.addEventListener("click", () => {
  elUrl.value = LOCAL_URL;
  syncPresetButtons(LOCAL_URL);
});

elBtnRem.addEventListener("click", () => {
  if (!elUrl.value || elUrl.value === LOCAL_URL) {
    elUrl.value = "";
    elUrl.placeholder = "https://abc123.cfargotunnel.com";
    elUrl.focus();
  }
  syncPresetButtons(elUrl.value);
});

elUrl.addEventListener("input", () => syncPresetButtons(elUrl.value));

function syncPresetButtons(url) {
  const isLocal = !url || url === LOCAL_URL || url.startsWith("http://localhost");
  elBtnLoc.classList.toggle("active", isLocal);
  elBtnRem.classList.toggle("active", !isLocal);
}

// ── Show / hide API key ──────────────────────────────────────────────────────

elBtnVis.addEventListener("click", () => {
  elKey.type = elKey.type === "password" ? "text" : "password";
});

// ── Save & Test ──────────────────────────────────────────────────────────────

elBtnSave.addEventListener("click", async () => {
  const serverUrl = (elUrl.value.trim() || LOCAL_URL).replace(/\/$/, "");
  const apiKey    = elKey.value.trim() || null;

  elBtnSave.disabled = true;
  setStatus("idle", "Saving…");

  await chrome.storage.local.set({ serverUrl, apiKey });

  // Notify background service worker so it picks up new values immediately
  chrome.runtime.sendMessage({ type: "SAVEDPOCKET_CONFIG_UPDATE" }).catch(() => {
    // Service worker may be sleeping — the next storage.get call will see the new values
  });

  await probeConnection(serverUrl, apiKey);
  elBtnSave.disabled = false;
});

// ── Open Dashboard ───────────────────────────────────────────────────────────

elBtnDash.addEventListener("click", () => {
  chrome.storage.local.get("serverUrl", ({ serverUrl }) => {
    chrome.tabs.create({ url: serverUrl || LOCAL_URL });
  });
});

// ── Hint link ────────────────────────────────────────────────────────────────

elHintLnk.addEventListener("click", () => {
  chrome.storage.local.get("serverUrl", ({ serverUrl }) => {
    chrome.tabs.create({ url: `${serverUrl || LOCAL_URL}/settings` });
  });
});

// ── Connection probe ─────────────────────────────────────────────────────────

async function probeConnection(serverUrl, apiKey) {
  const base = (serverUrl || LOCAL_URL).replace(/\/$/, "");

  setStatus("idle", "Testing…");

  // 1) API key auth (primary, works for both local and remote)
  if (apiKey) {
    try {
      const res = await fetch(`${base}/api/me`, {
        headers: { "x-savedpocket-key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus("ok", `Connected as ${data.name}`);
        elHint.style.display = "none";
        return;
      }
      if (res.status === 401) {
        setStatus("err", "Invalid API key");
        showHint(base);
        return;
      }
      setStatus("err", `Server error (${res.status})`);
      return;
    } catch {
      setStatus("err", "Cannot reach server");
      return;
    }
  }

  // 2) Cookie fallback — useful for local dev when already logged in
  try {
    const res = await fetch(`${base}/api/me`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      // Auto-populate API key so future calls skip this path
      if (data.apiKey) {
        elKey.value = data.apiKey;
        await chrome.storage.local.set({ apiKey: data.apiKey });
      }
      setStatus("ok", `Connected as ${data.name} (via session)`);
      elHint.style.display = "none";
      return;
    }
  } catch {
    // ignore — fall through to hint
  }

  setStatus("err", "Not connected — enter your API key");
  showHint(base);
}

function showHint(base) {
  elHint.style.display = "block";
  elHintLnk.dataset.url = `${base}/settings`;
}

function setStatus(type, text) {
  elStatus.className = "status" + (type === "ok" ? " ok" : type === "err" ? " err" : "");
  elStTxt.textContent = text;
}
