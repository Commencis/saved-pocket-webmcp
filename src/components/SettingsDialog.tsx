"use client";

import { Copy, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { JobCounts } from "@/lib/types";

const MODEL_OPTIONS = [
  { value: "", label: "Default (gpt-4o-mini) — fast & cheap" },
  { value: "gpt-4o", label: "gpt-4o — smarter, vision-capable" },
  { value: "gpt-4.1", label: "gpt-4.1 — latest & most capable" },
];

interface AiSettings {
  hasUserKey: boolean;
  hasServerKey: boolean;
  maskedKey: string | null;
  model: string | null;
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
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setModel(data.model ?? "");
        }
      });
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.apiKey) setExtensionKey(data.apiKey); });
  }, []);

  async function save(payload: { apiKey?: string | null; model?: string | null }) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSuccess(
        data.requeued > 0
          ? `Saved. Re-analyzing ${data.requeued} previously failed item(s)…`
          : "Saved.",
      );
      setApiKey("");
      const refreshed = await fetch("/api/settings/ai").then((r) => r.json());
      setSettings(refreshed);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    const payload: { apiKey?: string | null; model?: string | null } = {
      model: model === "" ? null : model,
    };
    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    void save(payload);
  }

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
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!settings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-neutral-700">
              AI integration
            </h3>
            <p className="text-xs text-neutral-500">
              SavedPocket uses the OpenAI API to categorize, tag and
              summarize your saved items. Your key is stored only in your local
              database and never leaves this app. Get one at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                platform.openai.com
              </a>
              .
            </p>

            {!settings.hasUserKey && !settings.hasServerKey && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                No API key configured — new items will be saved but not
                analyzed until you add one.
              </p>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-neutral-500">
                OpenAI API key
                {settings.hasUserKey && settings.maskedKey && (
                  <span className="ml-2 font-mono text-neutral-400">
                    current: {settings.maskedKey}
                  </span>
                )}
                {!settings.hasUserKey && settings.hasServerKey && (
                  <span className="ml-2 text-neutral-400">
                    (using the server-wide key)
                  </span>
                )}
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
                autoComplete="off"
                className="rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-400"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-neutral-500">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                {success}
              </p>
            )}

            <div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
              <button
                onClick={handleSave}
                disabled={busy || (!apiKey.trim() && !settings.hasUserKey && model === (settings.model ?? ""))}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
              {settings.hasUserKey && (
                <button
                  onClick={() => void save({ apiKey: null })}
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
