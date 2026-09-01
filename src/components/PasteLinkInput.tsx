"use client";

import { Link2, Loader2, Plus } from "lucide-react";
import { useState } from "react";

export function PasteLinkInput({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save link");
      }
      setUrl("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form data-tour="paste-input" onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link to save…"
            className="w-72 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Save
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
