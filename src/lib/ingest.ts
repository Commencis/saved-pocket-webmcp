import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, type Item } from "@/db/schema";
import { cleanLinkedInText, deriveLinkedInTitle } from "./linkedin-clean";
import { fetchMetadata } from "./og-parser";
import { enqueueJob } from "./queue/enqueue";
import { detectPlatform, normalizeUrl, type Platform } from "./url-normalize";

export interface IngestInput {
  userId: string;
  url: string;
  platform?: Platform;
  externalId?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  savedAt?: Date | null;
  /** Skip the server-side OG fetch (e.g. Reddit sync already has metadata). */
  fetchMeta?: boolean;
}

export interface IngestResult {
  item: Item;
  created: boolean;
}

export async function ingestUrl(input: IngestInput): Promise<IngestResult> {
  const url = normalizeUrl(input.url);
  const detected = detectPlatform(url);
  const platform = input.platform ?? detected.platform;
  const externalId = input.externalId ?? detected.externalId;

  const existing = await findExisting(input.userId, url, platform, externalId);
  if (existing) {
    const [updated] = await db
      .update(items)
      .set({
        savedAt: input.savedAt ?? existing.savedAt,
        title: existing.title ?? input.title ?? null,
        description: existing.description ?? input.description ?? null,
        imageUrl: existing.imageUrl ?? input.imageUrl ?? null,
        notes: existing.notes ?? input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(items.id, existing.id))
      .returning();
    return { item: updated, created: false };
  }

  let { title, description, imageUrl } = input;
  if (platform === "linkedin") {
    description = description ? cleanLinkedInText(description) || null : null;
    title = deriveLinkedInTitle(title, description);
  }
  if (input.fetchMeta !== false && (!title || !imageUrl)) {
    const meta = await fetchMetadata(url);
    title = title ?? meta.title ?? null;
    description = description ?? meta.description ?? null;
    imageUrl = imageUrl ?? meta.imageUrl ?? null;
  }

  const [item] = await db
    .insert(items)
    .values({
      userId: input.userId,
      url,
      platform,
      externalId: externalId ?? null,
      title: title ?? null,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      notes: input.notes ?? null,
      savedAt: input.savedAt ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!item) {
    // Lost a race with a concurrent insert of the same URL
    const winner = await findExisting(input.userId, url, platform, externalId);
    if (!winner) throw new Error(`Failed to ingest ${url}`);
    return { item: winner, created: false };
  }

  await enqueueJob("analyze_item", { itemId: item.id });
  // Metadata-based embedding right away; re-embedded after analysis completes
  await enqueueJob("embed_item", { itemId: item.id });
  if (item.imageUrl) await enqueueJob("cache_image", { itemId: item.id });

  return { item, created: true };
}

async function findExisting(
  userId: string,
  url: string,
  platform: Platform,
  externalId: string | null | undefined,
): Promise<Item | undefined> {
  const byUrl = await db.query.items.findFirst({
    where: and(eq(items.userId, userId), eq(items.url, url)),
  });
  if (byUrl) return byUrl;
  if (!externalId) return undefined;
  return db.query.items.findFirst({
    where: and(
      eq(items.userId, userId),
      eq(items.platform, platform),
      eq(items.externalId, externalId),
    ),
  });
}
