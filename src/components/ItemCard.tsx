"use client";

import { Eye, FolderPlus, ImageOff, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PLATFORM_STYLES, type CollectionDto, type ItemDto } from "@/lib/types";

export function ItemCard({
  item,
  onClick,
  selected,
  onSelect,
  collections,
}: {
  item: ItemDto;
  onClick: () => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  collections?: CollectionDto[];
}) {
  const imageSrc = item.localImagePath
    ? `/api/images/${item.id}`
    : item.imageUrl;
  const platform = PLATFORM_STYLES[item.platform] ?? PLATFORM_STYLES.web;
  const analyzing =
    item.analysisStatus === "pending" || item.analysisStatus === "processing";
  const title = item.title ?? displayUrl(item.url);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [addingTo, setAddingTo] = useState<number | null>(null);

  async function addToCollection(e: React.MouseEvent, collectionId: number) {
    e.stopPropagation();
    setAddingTo(collectionId);
    try {
      await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [item.id] }),
      });
    } finally {
      setAddingTo(null);
      setCollectionMenuOpen(false);
    }
  }

  return (
    <button
      onClick={onClick}
      className={`group flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${selected ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-1" : "border-neutral-200"}`}
    >
      <div className="relative aspect-video w-full bg-neutral-100">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${platform.className}`}
        >
          {platform.label}
        </span>
        {onSelect && (
          <span
            onClick={onSelect}
            className={`absolute right-2 bottom-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 bg-white transition ${selected ? "border-neutral-900" : "border-neutral-300 opacity-0 group-hover:opacity-100"}`}
          >
            {selected && (
              <span className="block h-2.5 w-2.5 rounded-sm bg-neutral-900" />
            )}
          </span>
        )}
        {analyzing && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs text-neutral-600">
            <Loader2 className="h-3 w-3 animate-spin" /> analyzing
          </span>
        )}
        {item.linkStatus === "dead" && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-red-50/95 px-2 py-0.5 text-xs text-red-600">
            <TriangleAlert className="h-3 w-3" /> link broken
          </span>
        )}

        {/* Add to collection button */}
        {collections && collections.length > 0 && (
          <div className="absolute left-2 bottom-2 z-10">
            <span
              onClick={(e) => {
                e.stopPropagation();
                setCollectionMenuOpen((v) => !v);
              }}
              title="Add to collection"
              className="flex items-center justify-center rounded-full bg-white/90 p-1 text-neutral-500 opacity-0 transition hover:bg-white hover:text-neutral-800 group-hover:opacity-100"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </span>
            {collectionMenuOpen && (
              <div
                className="absolute bottom-7 left-0 z-20 min-w-36 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Add to collection
                </p>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={(e) => void addToCollection(e, c.id)}
                    disabled={addingTo === c.id}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {addingTo === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
        {item.summary && (
          <p className="line-clamp-2 text-xs text-neutral-500">{item.summary}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1">
          {item.categoryName && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
              {item.categoryName}
            </span>
          )}
          {item.userTags.slice(0, 3).map((tag) => (
            <span
              key={`u-${tag}`}
              className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
            >
              {tag}
            </span>
          ))}
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
            >
              {tag}
            </span>
          ))}
          {item.visitCount > 0 && (
            <span
              className="ml-auto flex items-center gap-1 text-xs text-neutral-400"
              title={
                item.lastVisitedAt
                  ? `Last visited ${new Date(item.lastVisitedAt).toLocaleString()}`
                  : undefined
              }
            >
              <Eye className="h-3.5 w-3.5" /> {item.visitCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname;
  } catch {
    return url;
  }
}
