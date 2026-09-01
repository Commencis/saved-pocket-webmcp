"use client";

import {
  Bookmark,
  BookOpen,
  Download,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  Trash2,
  Tag,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  SORT_OPTIONS,
  type CategoryDto,
  type CollectionDto,
  type ItemDto,
  type JobCounts,
  type SortValue,
} from "@/lib/types";
import { CategorySidebar } from "./CategorySidebar";
import { ChatDialog } from "./ChatDialog";
import { DigestCard } from "./DigestCard";
import { ItemCard } from "./ItemCard";
import { ItemDetailDialog } from "./ItemDetailDialog";
import { PasteLinkInput } from "./PasteLinkInput";
import { SearchBar } from "./SearchBar";
import { SettingsDialog } from "./SettingsDialog";
import { OnboardingTour } from "./OnboardingTour";
import { WebMCPTools } from "./WebMCPTools";
import { WhatsAppImportDialog } from "./WhatsAppImportDialog";

const PAGE_SIZE = 30;

export function Dashboard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [collectionsData, setCollectionsData] = useState<CollectionDto[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>("newest");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDto | null>(null);
  const [jobCounts, setJobCounts] = useState<JobCounts>({});
  const [extensionKey, setExtensionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const pageRef = useRef(1);
  const loadedCountRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const buildParams = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (categoryId !== null) params.set("category", String(categoryId));
      if (collectionId !== null) params.set("collection", String(collectionId));
      if (platform) params.set("platform", platform);
      if (sort !== "newest") params.set("sort", sort);
      if (unreadOnly) params.set("unread", "1");
      params.set("page", String(page));
      params.set("limit", String(limit));
      return params;
    },
    [query, categoryId, collectionId, platform, sort, unreadOnly],
  );

  const applyResult = useCallback(
    (data: { items: ItemDto[]; total: number }, append: boolean) => {
      setItems((prev) => {
        let next: ItemDto[];
        if (append) {
          const seen = new Set(prev.map((i) => i.id));
          next = [...prev, ...data.items.filter((i) => !seen.has(i.id))];
        } else {
          next = data.items;
        }
        loadedCountRef.current = next.length;
        return next;
      });
      setTotal(data.total);
    },
    [],
  );

  const loadFirstPage = useCallback(async () => {
    pageRef.current = 1;
    const res = await fetch(`/api/items?${buildParams(1, PAGE_SIZE)}`);
    if (!res.ok) return;
    applyResult(await res.json(), false);
    setLoading(false);
  }, [buildParams, applyResult]);

  const refreshLoaded = useCallback(async () => {
    const limit = Math.min(200, Math.max(loadedCountRef.current, PAGE_SIZE));
    const res = await fetch(`/api/items?${buildParams(1, limit)}`);
    if (!res.ok) return;
    applyResult(await res.json(), false);
  }, [buildParams, applyResult]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loadedCountRef.current >= total || total === 0) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetch(`/api/items?${buildParams(nextPage, PAGE_SIZE)}`);
      if (!res.ok) return;
      pageRef.current = nextPage;
      applyResult(await res.json(), true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, total, buildParams, applyResult]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.categories);
  }, []);

  const loadCollections = useCallback(async () => {
    const res = await fetch("/api/collections");
    if (!res.ok) return;
    const data = await res.json();
    setCollectionsData(data.collections as CollectionDto[]);
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/sync/status");
    if (!res.ok) return;
    const data = await res.json();
    setJobCounts(data.jobs ?? {});
  }, []);

  const refreshAll = useCallback(() => {
    void refreshLoaded();
    void loadCategories();
    void loadCollections();
    void loadStatus();
  }, [refreshLoaded, loadCategories, loadCollections, loadStatus]);

  useEffect(() => {
    setLoading(true);
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    void loadCategories();
    void loadCollections();
    void loadStatus();
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => setExtensionKey(me?.apiKey ?? null))
      .catch(() => {});
    void fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : null))
      .then((ai) => {
        if (ai) setAiConfigured(ai.hasUserKey || ai.hasServerKey);
      })
      .catch(() => {});
  }, [loadCategories, loadCollections, loadStatus]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Poll while jobs are active
  const activeJobs = (jobCounts.pending ?? 0) + (jobCounts.processing ?? 0);
  useEffect(() => {
    if (activeJobs === 0) return;
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [activeJobs, refreshAll]);

  // "/" shortcut to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function openItem(item: ItemDto) {
    const visited: ItemDto = {
      ...item,
      visitCount: item.visitCount + 1,
      lastVisitedAt: new Date().toISOString(),
    };
    setSelectedItem(visited);
    setItems((prev) => prev.map((i) => (i.id === item.id ? visited : i)));
    void fetch(`/api/items/${item.id}/visit`, { method: "POST" }).catch(() => {});
  }

  // Bulk actions
  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetCategory() {
    if (bulkBusy || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const catId = bulkCategoryId ? Number(bulkCategoryId) : null;
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: catId }),
          }),
        ),
      );
      setSelected(new Set());
      refreshAll();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    if (bulkBusy || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/items/${id}`, { method: "DELETE" }),
        ),
      );
      setSelected(new Set());
      refreshAll();
    } finally {
      setBulkBusy(false);
    }
  }

  const hasMore = items.length < total;

  return (
    <div className="min-h-screen">
      <header data-tour="header" className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3">
          {/* Row 1: logo + controls */}
          <div className="flex items-center gap-4">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Bookmark className="h-6 w-6" /> SavedPocket
            </h1>
            <div className="ml-auto flex items-center gap-3">
              {activeJobs > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analyzing{" "}
                  {activeJobs}…
                </span>
              )}
              {!aiConfigured && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Set AI key
                </button>
              )}
              <button
                data-tour="chat-button"
                onClick={() => setChatOpen(true)}
                title="Chat with your library"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                data-tour="whatsapp-import"
                onClick={() => setImportOpen(true)}
                title="Import from WhatsApp"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <Upload className="h-4 w-4" />
              </button>
              <a
                data-tour="marketplace"
                href="/marketplace"
                title="Collection Marketplace"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <BookOpen className="h-4 w-4" />
              </a>
              <a
                data-tour="docs"
                href="/docs"
                title="Documentation"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <FileText className="h-4 w-4" />
              </a>
              <button
                data-tour="settings-button"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <Settings className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
                <span className="max-w-40 truncate text-xs text-neutral-400">
                  {userEmail}
                </span>
                <button
                  onClick={async () => {
                    await authClient.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {/* Row 2: search + paste */}
          <div className="flex flex-wrap items-center gap-4">
            <SearchBar onSearch={setQuery} inputRef={searchInputRef} />
            <div className="ml-auto">
              <PasteLinkInput onAdded={refreshAll} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 p-6">
        <CategorySidebar
          categories={categories}
          selectedCategoryId={categoryId}
          onSelectCategory={(id) => { setCategoryId(id); setCollectionId(null); }}
          selectedPlatform={platform}
          onSelectPlatform={setPlatform}
          extensionKey={extensionKey}
          unreadOnly={unreadOnly}
          onToggleUnread={() => setUnreadOnly((v) => !v)}
          collections={collectionsData}
          selectedCollectionId={collectionId}
          onSelectCollection={(id) => { setCollectionId(id); setCategoryId(null); }}
          onCollectionsChanged={loadCollections}
        />

        <main className="min-w-0 flex-1">
          <DigestCard />

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-400">
              {items.length} / {total} item{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              {/* Export buttons */}
              <a
                href="/api/export?format=json"
                download
                title="Export JSON"
                className="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <a
                href="/api/export?format=csv"
                download
                title="Export CSV"
                className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
              >
                CSV
              </a>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortValue)}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-400"
                title="Sort items"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
              <span className="text-xs font-medium text-neutral-600">
                {selected.size} selected
              </span>
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600"
              >
                <option value="">Set category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void bulkSetCategory()}
                disabled={bulkBusy || !bulkCategoryId}
                className="flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                <Tag className="h-3.5 w-3.5" /> Apply
              </button>
              <button
                onClick={() => void bulkDelete()}
                disabled={bulkBusy}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-neutral-400 hover:text-neutral-700"
              >
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl bg-neutral-100"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-24 text-center text-neutral-400">
              <Bookmark className="h-10 w-10" />
              <p className="text-sm">
                Nothing here yet. Paste a link above or sync your platforms.
              </p>
            </div>
          ) : (
            <>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {items.map((item) => (
                  <div key={item.id} className="mb-4 break-inside-avoid">
                    <ItemCard
                      item={item}
                      onClick={() => openItem(item)}
                      selected={selected.has(item.id)}
                      onSelect={(e) => toggleSelect(item.id, e)}
                      collections={collectionsData}
                    />
                  </div>
                ))}
              </div>
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-8"
              >
                {loadingMore && (
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                )}
                {!hasMore && total > PAGE_SIZE && (
                  <p className="text-xs text-neutral-300">All items loaded</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {settingsOpen && (
        <SettingsDialog
          jobCounts={jobCounts}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setAiConfigured(true);
            refreshAll();
          }}
        />
      )}

      <WhatsAppImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshAll}
      />

      {chatOpen && (
        <ChatDialog
          onClose={() => setChatOpen(false)}
          collectionId={collectionId ?? undefined}
          collectionName={collectionId ? collectionsData.find((c) => c.id === collectionId)?.name : undefined}
          onOpenItem={async (id) => {
            const res = await fetch(`/api/items/${id}`);
            if (!res.ok) return;
            const data = await res.json();
            openItem(data);
          }}
        />
      )}

      <OnboardingTour onOpenChat={() => setChatOpen(true)} />
      <WebMCPTools apiKey={extensionKey} />

      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          categories={categories}
          collections={collectionsData}
          onClose={() => setSelectedItem(null)}
          onChanged={refreshAll}
        />
      )}
    </div>
  );
}
