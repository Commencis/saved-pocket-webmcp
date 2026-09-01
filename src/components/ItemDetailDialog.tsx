"use client";

import { Check, Eye, ExternalLink, FolderPlus, Image as ImageIcon, Loader2, Plus, RotateCw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PLATFORM_STYLES, type CategoryDto, type CollectionDto, type ItemDto } from "@/lib/types";

export function ItemDetailDialog({
  item,
  categories,
  collections,
  onClose,
  onChanged,
}: {
  item: ItemDto;
  categories: CategoryDto[];
  collections?: CollectionDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [itemCollections, setItemCollections] = useState<{ id: number; name: string }[]>([]);
  const [collectionsBusy, setCollectionsBusy] = useState<number | null>(null);

  useEffect(() => {
    void fetch(`/api/items/${item.id}/collections`)
      .then((r) => r.json())
      .then((data: { collections: { id: number; name: string }[] }) => {
        setItemCollections(data.collections ?? []);
      });
  }, [item.id]);

  const [notes, setNotes] = useState(item.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);
  const [userTags, setUserTags] = useState<string[]>(item.userTags);
  const [tagInput, setTagInput] = useState("");
  const imageSrc = item.localImagePath
    ? `/api/images/${item.id}`
    : item.imageUrl;
  const platform = PLATFORM_STYLES[item.platform] ?? PLATFORM_STYLES.web;

  async function updateCategory(categoryId: number | null) {
    setBusy(true);
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (notesSaved) return;
    setBusy(true);
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() === "" ? null : notes }),
      });
      setNotesSaved(true);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveUserTags(next: string[]) {
    setUserTags(next);
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userTags: next }),
    });
    onChanged();
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    setTagInput("");
    if (!tag || userTags.includes(tag) || userTags.length >= 20) return;
    void saveUserTags([...userTags, tag]);
  }

  async function reanalyze() {
    setBusy(true);
    try {
      await fetch(`/api/items/${item.id}/reanalyze`, { method: "POST" });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function reanalyzeWithImage() {
    setBusy(true);
    try {
      await fetch(`/api/items/${item.id}/reanalyze/image`, { method: "POST" });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function addToCollection(collectionId: number) {
    setCollectionsBusy(collectionId);
    try {
      await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [item.id] }),
      });
      const col = collections?.find((c) => c.id === collectionId);
      if (col) setItemCollections((prev) => [...prev, { id: col.id, name: col.name }]);
    } finally {
      setCollectionsBusy(null);
    }
  }

  async function removeFromCollection(collectionId: number) {
    setCollectionsBusy(collectionId);
    try {
      await fetch(`/api/collections/${collectionId}/items/${item.id}`, { method: "DELETE" });
      setItemCollections((prev) => prev.filter((c) => c.id !== collectionId));
    } finally {
      setCollectionsBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this item?")) return;
    setBusy(true);
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={item.title ?? item.url}
            className="max-h-72 w-full rounded-t-2xl object-cover"
          />
        )}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${platform.className}`}
              >
                {platform.label}
              </span>
              <h2 className="text-lg font-semibold">
                {item.title ?? item.url}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Eye className="h-3.5 w-3.5" />
            {item.visitCount} visit{item.visitCount === 1 ? "" : "s"}
            {item.lastVisitedAt &&
              ` · last visited ${new Date(item.lastVisitedAt).toLocaleString()}`}
          </p>

          {item.summary && (
            <p className="text-sm text-neutral-600">{item.summary}</p>
          )}

          {(item.analysisTokensIn || item.imageAnalysisTokensIn) && (
            <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
              {item.analysisTokensIn && (
                <span title="Token usage for text-based analysis">
                  Text: {item.analysisTokensIn.toLocaleString()} in ·{" "}
                  {(item.analysisTokensOut ?? 0).toLocaleString()} out
                </span>
              )}
              {item.imageAnalysisTokensIn && (
                <span title="Token usage for image-based analysis">
                  Image: {item.imageAnalysisTokensIn.toLocaleString()} in ·{" "}
                  {(item.imageAnalysisTokensOut ?? 0).toLocaleString()} out
                </span>
              )}
            </div>
          )}

          {item.analysisStatus === "failed" && (
            <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
              Analysis failed: {item.analysisError}
            </p>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-500">
              My tags
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {userTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                >
                  {tag}
                  <button
                    onClick={() =>
                      void saveUserTags(userTags.filter((t) => t !== tag))
                    }
                    title="Remove tag"
                    className="text-amber-400 hover:text-amber-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag…"
                  className="w-24 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-xs outline-none focus:border-neutral-400"
                />
                <button
                  onClick={addTag}
                  title="Add tag"
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">
                Notes
              </span>
              {!notesSaved && (
                <button
                  onClick={saveNotes}
                  disabled={busy}
                  className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save note
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              onBlur={saveNotes}
              rows={3}
              placeholder="Write a private note about this post…"
              className="w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-neutral-500">
              Category
            </span>
            <select
              value={item.categoryId ?? ""}
              disabled={busy}
              onChange={(e) =>
                updateCategory(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {collections && collections.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                <FolderPlus className="h-3.5 w-3.5" /> Collections
              </span>
              <div className="flex flex-wrap gap-1.5">
                {itemCollections.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700"
                  >
                    {c.name}
                    <button
                      onClick={() => void removeFromCollection(c.id)}
                      disabled={collectionsBusy === c.id}
                      title="Remove from collection"
                      className="text-violet-400 hover:text-violet-700 disabled:opacity-50"
                    >
                      {collectionsBusy === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </span>
                ))}
                {collections
                  .filter((c) => !itemCollections.some((ic) => ic.id === c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => void addToCollection(c.id)}
                      disabled={collectionsBusy === c.id}
                      title={`Add to "${c.name}"`}
                      className="flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                    >
                      {collectionsBusy === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 opacity-0" />
                      )}
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              >
                <ExternalLink className="h-4 w-4" /> Open original
              </a>
              <button
                onClick={remove}
                disabled={busy}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={reanalyze}
                  disabled={busy}
                  title="Re-run AI analysis (uses LLM tokens)"
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  <RotateCw className="h-4 w-4" /> Re-analyze
                </button>
                {item.localImagePath && (
                  <button
                    onClick={reanalyzeWithImage}
                    disabled={busy}
                    title="Re-analyze using the saved image (uses more LLM tokens than text-only)"
                    className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <ImageIcon className="h-4 w-4" /> + Image
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Re-analyzing consumes LLM tokens.{item.localImagePath && " + Image uses significantly more."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
