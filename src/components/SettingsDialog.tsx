"use client";

import { Copy, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { JobCounts } from "@/lib/types";

const OPENAI_MODELS = [
  { value: "", label: "Default (gpt-4o-mini) — fast & cheap" },
  { value: "gpt-4o", label: "gpt-4o — smarter, vision-capable" },
  { value: "gpt-4.1", label: "gpt-4.1 — latest & most capable" },
];

const ANTHROPIC_MODELS = [
  { value: "", label: "Default (claude-haiku-4-5) — fast & cheap" },
  { value: "claude-sonnet-4-5-20251001", label: "claude-sonnet-4-5 — smarter" },
  { value: "claude-opus-4-5", label: "claude-opus-4-5 — most capable" },
];

type AiProvider = "openai" | "anthropic";

interface ProviderSettings {
  hasUserKey: boolean;
  hasServerKey: boolean;
  maskedKey: string | null;
  model: string | null;
  effectiveModel: string;
}

interface AiSettings {
  provider: AiProvider;
  openai: ProviderSettings;
  anthropic: ProviderSettings;
}

export function SettingsDialog({
  jobCounts: _jobCounts,
  onClose,
  onSaved,
}: {
  jobCounts: JobCounts;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [extensionKey, setExtensionKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Active provider tab in the UI
  const [activeProvider, setActiveProvider] = useState<AiProvider>("openai");

  // Per-provider form state
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AiSettings | null) => {
        if (data) {
          setSettings(data);
          setActiveProvider(data.provider);
          setOpenaiModel(data.openai.model ?? "");
          setAnthropicModel(data.anthropic.model ?? "");
        }
      });
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.apiKey) setExtensionKey(data.apiKey); });
  }, []);

  async function save(provider: AiProvider, payload: { apiKey?: string | null; model?: string | null }) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSuccess(
        data.requeued > 0
          ? `Saved. Re-analyzing ${data.requeued} previously failed item(s)…`
          : "Saved.",
      );
      if (provider === "openai") setOpenaiKey("");
      else setAnthropicKey("");
      const refreshed: AiSettings = await fetch("/api/settings/ai").then((r) => r.json());
      setSettings(refreshed);
      setActiveProvider(provider);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    const key = activeProvider === "openai" ? openaiKey : anthropicKey;
    const model = activeProvider === "openai" ? openaiModel : anthropicModel;
    const currentSettings = settings?.[activeProvider];
    const payload: { apiKey?: string | null; model?: string | null } = {
      model: model === "" ? null : model,
    };
    if (key.trim()) payload.apiKey = key.trim();
    void save(activeProvider, payload);
    void currentSettings; // suppress lint
  }

  const currentSettings = settings?.[activeProvider];
  const models = activeProvider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  const keyPlaceholder = activeProvider === "openai" ? "sk-…" : "sk-ant-…";
  const keyValue = activeProvider === "openai" ? openaiKey : anthropicKey;
  const modelValue = activeProvider === "openai" ? openaiModel : anthropicModel;
  const setKeyValue = activeProvider === "openai" ? setOpenaiKey : setAnthropicKey;
  const setModelValue = activeProvider === "openai" ? setOpenaiModel : setAnthropicModel;

  const isActiveProvider = settings?.provider === activeProvider;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!settings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-700">AI integration</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Active provider:{" "}
                <span className="font-medium text-neutral-700">
                  {settings.provider === "openai" ? "OpenAI" : "Anthropic"}
                </span>
              </p>
            </div>

            {/* Provider tabs */}
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
              {(["openai", "anthropic"] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setActiveProvider(p); setError(null); setSuccess(null); }}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    activeProvider === p
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {p === "openai" ? "OpenAI" : "Anthropic"}
                  {settings.provider === p && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Key field */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-neutral-500">
                {activeProvider === "openai" ? "OpenAI" : "Anthropic"} API key
                {currentSettings?.hasUserKey && currentSettings?.maskedKey && (
                  <span className="ml-2 font-mono text-neutral-400">current: {currentSettings.maskedKey}</span>
                )}
                {!currentSettings?.hasUserKey && currentSettings?.hasServerKey && (
                  <span className="ml-2 text-neutral-400">(using the server-wide key)</span>
                )}
              </span>
              <input
                type="password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={keyPlaceholder}
                autoComplete="off"
                className="rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-400"
              />
              <a
                href={activeProvider === "openai" ? "https://platform.openai.com/api-keys" : "https://console.anthropic.com/settings/keys"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-400 underline"
              >
                Get a key →
              </a>
            </label>

            {/* Model field */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-neutral-500">Model</span>
              <select
                value={modelValue}
                onChange={(e) => setModelValue(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                {models.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {!currentSettings?.hasUserKey && !currentSettings?.hasServerKey && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                No {activeProvider === "openai" ? "OpenAI" : "Anthropic"} key configured for this provider.
              </p>
            )}

            {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">{success}</p>}

            <div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
              <button
                onClick={handleSave}
                disabled={busy || (!keyValue.trim() && !currentSettings?.hasUserKey && modelValue === (currentSettings?.model ?? ""))}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isActiveProvider ? "Save" : `Save & switch to ${activeProvider === "openai" ? "OpenAI" : "Anthropic"}`}
              </button>
              {currentSettings?.hasUserKey && (
                <button
                  onClick={() => void save(activeProvider, { apiKey: null })}
                  disabled={busy}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove key
                </button>
              )}
            </div>

            {extensionKey && (
              <div className="flex flex-col gap-1 border-t border-neutral-100 pt-4">
                <span className="text-xs font-medium text-neutral-500">Extension API key</span>
                <p className="text-xs text-neutral-400">Paste this into the SavedPocket extension to connect remotely.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
                    {extensionKey}
                  </code>
                  <button
                    onClick={() => { void navigator.clipboard.writeText(extensionKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="shrink-0 rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-100"
                  >
                    {copied ? <span className="text-xs text-emerald-600">Copied!</span> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
