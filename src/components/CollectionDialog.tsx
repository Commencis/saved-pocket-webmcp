"use client";

import { Check, Copy, Download, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { type CollectionDto } from "@/lib/types";

interface Props {
  collection?: CollectionDto;
  onClose: () => void;
  onSaved: (c: CollectionDto) => void;
  onDeleted?: (id: number) => void;
}

export function CollectionDialog({ collection, onClose, onSaved, onDeleted }: Props) {
  const isEdit = !!collection;
  const hasItems = (collection?.itemCount ?? 0) > 0;
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [visibility, setVisibility] = useState<"private" | "link_only" | "public">(
    collection?.visibility ?? "private",
  );
  const [forkable, setForkable] = useState(collection?.forkable ?? false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    collection && visibility !== "private"
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/collections/${collection.slug}`
      : null;

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const url = isEdit ? `/api/collections/${collection.id}` : "/api/collections";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          visibility: hasItems ? visibility : "private",
          forkable: hasItems ? forkable : false,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onSaved(data.collection as CollectionDto);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!collection || !confirm("Delete this collection? Items will not be deleted.")) return;
    setBusy(true);
    try {
      await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
      onDeleted?.(collection.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit collection" : "New collection"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-500">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              placeholder="e.g. React resources"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-500">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What's in this collection?"
              className="resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-500">Visibility</span>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { value: "private", label: "Private", desc: "Only you can see this" },
                  { value: "link_only", label: "Anyone with the link", desc: "Share via URL, not listed publicly" },
                  { value: "public", label: "Public", desc: "Listed in the marketplace" },
                ] as const
              ).map(({ value, label, desc }) => {
                const disabled = !hasItems && value !== "private";
                return (
                  <label
                    key={value}
                    className={`flex items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      checked={visibility === value}
                      onChange={() => !disabled && setVisibility(value)}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{label}</p>
                      <p className="text-xs text-neutral-400">{desc}</p>
                    </div>
                  </label>
                );
              })}
              {!hasItems && (
                <p className="text-xs text-neutral-400">Add items to this collection to enable sharing.</p>
              )}
            </div>
          </div>

          {visibility !== "private" && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={forkable}
                onChange={(e) => setForkable(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-neutral-700">Allow forking</p>
                <p className="text-xs text-neutral-400">
                  Others can copy this collection to their library
                </p>
              </div>
            </label>
          )}

          {shareUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-neutral-500">{shareUrl}</span>
              <button
                onClick={copyLink}
                className="shrink-0 text-neutral-400 hover:text-neutral-700"
                title="Copy link"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          {isEdit && hasItems && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Export for LLM / NotebookLM:</span>
              <a
                href={`/api/collections/${collection!.id}/export?format=markdown`}
                download
                className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                title="Download as Markdown"
              >
                <Download className="h-3.5 w-3.5" /> Markdown
              </a>
              <a
                href={`/api/collections/${collection!.id}/export?format=json`}
                download
                className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                title="Download as JSON"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </a>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
            {isEdit ? (
              <button
                onClick={() => void remove()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => void save()}
              disabled={busy || !name.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
