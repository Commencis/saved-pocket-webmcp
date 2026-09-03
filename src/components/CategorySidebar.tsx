"use client";

import { Check, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PLATFORMS, PLATFORM_STYLES, type CategoryDto, type CollectionDto } from "@/lib/types";
import { CollectionDialog } from "./CollectionDialog";

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  selectedPlatform,
  onSelectPlatform,
  extensionKey,
  unreadOnly,
  onToggleUnread,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCollectionsChanged,
}: {
  categories: CategoryDto[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
  extensionKey: string | null;
  unreadOnly: boolean;
  onToggleUnread: () => void;
  collections: CollectionDto[];
  selectedCollectionId: number | null;
  onSelectCollection: (id: number | null) => void;
  onCollectionsChanged: () => void;
}) {
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionDto | undefined>();
  const [keyCopied, setKeyCopied] = useState(false);

  function handleCopyKey() {
    if (!extensionKey) return;
    navigator.clipboard.writeText(extensionKey).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  }

  function openCreate() {
    setEditingCollection(undefined);
    setCollectionDialogOpen(true);
  }

  function openEdit(c: CollectionDto, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCollection(c);
    setCollectionDialogOpen(true);
  }
  return (
    <aside data-tour="sidebar" className="sticky top-[116px] flex max-h-[calc(100vh-140px)] w-56 shrink-0 flex-col gap-6 self-start overflow-y-auto">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Categories
        </h2>
        <ul className="flex flex-col gap-0.5">
          <li>
            <SidebarButton
              active={selectedCategoryId === null && !unreadOnly}
              onClick={() => { onSelectCategory(null); if (unreadOnly) onToggleUnread(); }}
            >
              All items
            </SidebarButton>
          </li>
          <li>
            <SidebarButton active={unreadOnly} onClick={onToggleUnread}>
              Unread
            </SidebarButton>
          </li>
          {categories
            .filter((c) => c.itemCount > 0)
            .map((category) => (
              <li key={category.id}>
                <SidebarButton
                  active={selectedCategoryId === category.id}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <span className="flex-1 truncate">{category.name}</span>
                  <span className="text-xs text-neutral-400">
                    {category.itemCount}
                  </span>
                </SidebarButton>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Platforms
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((platform) => {
            const style = PLATFORM_STYLES[platform];
            const active = selectedPlatform === platform;
            return (
              <button
                key={platform}
                onClick={() => onSelectPlatform(active ? null : platform)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-neutral-900 text-white"
                    : style.className + " opacity-80 hover:opacity-100"
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Collections
          </h2>
          <button
            onClick={openCreate}
            title="New collection"
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {collections.length === 0 ? (
          <p className="text-xs text-neutral-400">No collections yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {collections.map((c) => (
              <li key={c.id}>
                <SidebarButton
                  active={selectedCollectionId === c.id}
                  onClick={() => onSelectCollection(c.id)}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-neutral-400">{c.itemCount}</span>
                  <button
                    onClick={(e) => openEdit(c, e)}
                    className="ml-1 rounded p-0.5 text-neutral-300 hover:text-neutral-600"
                    title="Edit collection"
                  >
                    ···
                  </button>
                </SidebarButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {extensionKey && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            API key
          </h2>
          <button
            onClick={handleCopyKey}
            title="Copy API key for Chrome extension"
            className="group flex w-full items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2 py-1.5 hover:bg-neutral-50"
          >
            <span className="flex-1 truncate font-mono text-[10px] text-neutral-500">
              {extensionKey}
            </span>
            {keyCopied ? (
              <Check className="h-3 w-3 shrink-0 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
            )}
          </button>
          {keyCopied && (
            <p className="mt-1 text-[10px] text-green-600">Copied</p>
          )}
        </section>
      )}

      {collectionDialogOpen && (
        <CollectionDialog
          collection={editingCollection}
          onClose={() => setCollectionDialogOpen(false)}
          onSaved={() => {
            onCollectionsChanged();
            setCollectionDialogOpen(false);
          }}
          onDeleted={(id) => {
            onCollectionsChanged();
            if (selectedCollectionId === id) onSelectCollection(null);
            setCollectionDialogOpen(false);
          }}
        />
      )}

      <div className="mt-auto border-t border-neutral-100 px-3 py-2 flex gap-3">
        <Link href="/legal" className="text-xs text-neutral-400 hover:text-neutral-600">Legal</Link>
        <Link href="/docs" className="text-xs text-neutral-400 hover:text-neutral-600">Docs</Link>
      </div>
    </aside>
  );
}

function SidebarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition ${
        active
          ? "bg-neutral-900 font-medium text-white"
          : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}
