import { and, eq, inArray, ne } from "drizzle-orm";
import { BookOpen, ExternalLink, GitFork } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { collectionItems, collections, items, user } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { getSessionUser } from "@/lib/session";
import { PLATFORM_STYLES, type ItemDto } from "@/lib/types";
import { ForkButtonClient } from "@/components/ForkButtonClient";

async function getPublicCollection(slug: string) {
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.slug, slug), ne(collections.visibility, "private")),
  });
  if (!collection) return null;

  const author = await db.query.user.findFirst({
    where: eq(user.id, collection.userId),
    columns: { name: true },
  });

  const rows = await db
    .select({ item: items })
    .from(collectionItems)
    .innerJoin(items, eq(collectionItems.itemId, items.id))
    .where(eq(collectionItems.collectionId, collection.id))
    .orderBy(collectionItems.addedAt);

  return {
    collection: { ...collection, authorName: author?.name ?? null },
    items: rows.map((r) => r.item) as unknown as ItemDto[],
  };
}

async function performFork(sourceId: number, userId: string) {
  const source = await db.query.collections.findFirst({
    where: eq(collections.id, sourceId),
  });
  if (!source || !source.forkable || source.visibility === "private") return;
  if (source.userId === userId) return;

  const sourceRows = await db
    .select({ item: items })
    .from(collectionItems)
    .innerJoin(items, eq(collectionItems.itemId, items.id))
    .where(eq(collectionItems.collectionId, sourceId));

  const forkItemIds: string[] = [];

  if (sourceRows.length > 0) {
    const inserted = await db
      .insert(items)
      .values(
        sourceRows.map((r) => ({
          userId,
          platform: r.item.platform,
          url: r.item.url,
          title: r.item.title,
          description: r.item.description,
          imageUrl: r.item.imageUrl,
          tags: r.item.tags,
          userTags: [] as string[],
          summary: r.item.summary,
          analysisStatus: r.item.analysisStatus,
          embedding: r.item.embedding,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: items.id });

    inserted.forEach((i) => forkItemIds.push(i.id));

    if (forkItemIds.length < sourceRows.length) {
      const insertedSet = new Set(forkItemIds);
      const sourceUrls = sourceRows.map((r) => r.item.url);
      const existing = await db
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.userId, userId), inArray(items.url, sourceUrls)));
      existing.forEach((i) => { if (!insertedSet.has(i.id)) forkItemIds.push(i.id); });
    }
  }

  let slug = generateSlug(`${source.name} fork`);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, slug),
    });
    if (!existing) break;
    slug = generateSlug(`${source.name} fork`);
  }

  let forkName = `${source.name} (fork)`;
  let nameConflict = await db.query.collections.findFirst({
    where: and(eq(collections.userId, userId), eq(collections.name, forkName)),
  });
  let counter = 2;
  while (nameConflict) {
    forkName = `${source.name} (fork ${counter})`;
    nameConflict = await db.query.collections.findFirst({
      where: and(eq(collections.userId, userId), eq(collections.name, forkName)),
    });
    counter++;
  }

  const [newCol] = await db
    .insert(collections)
    .values({
      userId,
      name: forkName,
      description: source.description,
      slug,
      visibility: "private",
      forkable: false,
      forkedFrom: sourceId,
    })
    .returning();

  if (forkItemIds.length > 0) {
    await db
      .insert(collectionItems)
      .values(forkItemIds.map((itemId) => ({ collectionId: newCol.id, itemId })))
      .onConflictDoNothing();
  }
}

export default async function SharedCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessionUser = await getSessionUser().catch(() => null);

  const data = await getPublicCollection(slug);
  if (!data) notFound();

  const { collection: c, items: collItems } = data;
  const isOwner = !!sessionUser && sessionUser.id === c.userId;
  const viewerLoggedIn = !!sessionUser;

  const existingFork =
    viewerLoggedIn && !isOwner
      ? await db.query.collections.findFirst({
          where: and(
            eq(collections.userId, sessionUser!.id),
            eq(collections.forkedFrom, c.id)
          ),
          columns: { id: true, name: true },
        })
      : null;

  async function addForkAction() {
    "use server";
    const su = await getSessionUser();
    if (!su) redirect("/login");
    await performFork(c.id, su.id);
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <BookOpen className="h-5 w-5 text-neutral-500" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{c.name}</h1>
            {c.description && (
              <p className="text-sm text-neutral-500">{c.description}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
              <span>{collItems.length} item{collItems.length !== 1 ? "s" : ""}</span>
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
          </div>
          <div className="flex items-center gap-2">
            {c.forkable && !isOwner && (
              viewerLoggedIn ? (
                <ForkButtonClient
                  existingForkName={existingFork?.name ?? null}
                  addForkAction={addForkAction}
                />
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <GitFork className="h-4 w-4" /> Fork (sign in first)
                </Link>
              )
            )}
            <Link
              href="/"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {collItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center text-neutral-400">
            <BookOpen className="h-10 w-10" />
            <p className="text-sm">This collection is empty.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {collItems.map((item) => (
              <ReadonlyItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadonlyItemRow({ item }: { item: ItemDto }) {
  const platform = PLATFORM_STYLES[item.platform] ?? PLATFORM_STYLES.web;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      {(item.localImagePath || item.imageUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.localImagePath ? `/api/images/${item.id}` : (item.imageUrl ?? "")}
          alt={item.title ?? item.url}
          className="h-16 w-24 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${platform.className}`}>
            {platform.label}
          </span>
        </div>
        <p className="truncate font-semibold text-neutral-900">
          {item.title ?? item.url}
        </p>
        {item.summary && (
          <p className="line-clamp-2 text-xs text-neutral-500">{item.summary}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
        title="Open original"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
