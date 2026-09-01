"use server";

import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, GitFork } from "lucide-react";
import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections, user } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { type CollectionDto } from "@/lib/types";

interface MarketplaceCollection extends Omit<CollectionDto, "authorName"> {
  authorName: string | null;
  userId: string;
}

const PAGE_SIZE = 24;

async function getCollections(q?: string, page = 1) {
  const offset = (page - 1) * PAGE_SIZE;

  const where = q
    ? sql`${collections.visibility} = 'public' AND (${ilike(collections.name, `%${q}%`)} OR ${ilike(collections.description ?? sql`''`, `%${q}%`)})`
    : eq(collections.visibility, "public");

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        description: collections.description,
        slug: collections.slug,
        visibility: collections.visibility,
        forkable: collections.forkable,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        itemCount: sql<number>`count(${collectionItems.itemId})::int`,
        authorName: user.name,
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collections.id, collectionItems.collectionId))
      .leftJoin(user, eq(collections.userId, user.id))
      .where(where)
      .groupBy(collections.id, collections.userId, user.name)
      .orderBy(desc(collections.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(collections)
      .where(where),
  ]);

  const mapped: MarketplaceCollection[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { collections: mapped, total: count, page, pageSize: PAGE_SIZE };
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));
  const [{ collections: cols, total, pageSize }, sessionUser] = await Promise.all([
    getCollections(q, page),
    getSessionUser().catch(() => null),
  ]);
  const currentUserId = sessionUser?.id ?? null;
  const totalPages = Math.ceil(total / pageSize);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-neutral-500" />
            <h1 className="text-lg font-semibold">Collection Marketplace</h1>
            {total > 0 && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                {total}
              </span>
            )}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <form className="mb-6">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search collections…"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </form>

        {cols.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center text-neutral-400">
            <BookOpen className="h-10 w-10" />
            <p className="text-sm">
              {q ? `No public collections matching "${q}".` : "No public collections yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cols.map((c) => (
                <CollectionCard key={c.id} collection={c} isOwner={currentUserId === c.userId} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                {hasPrev ? (
                  <Link
                    href={`/marketplace?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg border border-neutral-100 px-3 py-1.5 text-sm text-neutral-300">
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </span>
                )}
                <span className="text-sm text-neutral-500">
                  {page} / {totalPages}
                </span>
                {hasNext ? (
                  <Link
                    href={`/marketplace?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg border border-neutral-100 px-3 py-1.5 text-sm text-neutral-300">
                    Next <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CollectionCard({ collection: c, isOwner }: { collection: MarketplaceCollection; isOwner: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold text-neutral-900">{c.name}</h2>
        {c.description && (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{c.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span>{c.itemCount} item{c.itemCount !== 1 ? "s" : ""}</span>
        {c.authorName && (
          <>
            <span>·</span>
            <span>by {c.authorName}</span>
          </>
        )}
        {c.forkable && (
          <>
            <span>·</span>
            <span className="flex items-center gap-0.5 text-emerald-600">
              <GitFork className="h-3 w-3" /> forkable
            </span>
          </>
        )}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Link
          href={`/share/collections/${c.slug}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View
        </Link>
        {c.forkable && !isOwner && (
          <Link
            href={`/share/collections/${c.slug}#fork`}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <GitFork className="h-3.5 w-3.5" /> Fork
          </Link>
        )}
      </div>
    </div>
  );
}
