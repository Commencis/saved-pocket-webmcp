import { readFile } from "fs/promises";
import { eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, items, user } from "@/db/schema";
import { analyzeItem, analyzeItemWithImage, getServerAiKey, type ImageSource } from "@/lib/claude";
import { decrypt } from "@/lib/crypto";
import { buildItemEmbeddingText, embedText } from "@/lib/embeddings";
import { cachedImageAbsolutePath, cacheImage } from "@/lib/image-cache";
import { enqueueJob } from "./enqueue";

export async function handleAnalyzeItem(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item || item.analysisStatus === "done") return;

  const owner = await db.query.user.findFirst({
    where: eq(user.id, item.userId),
  });
  const rawKey = owner?.anthropicApiKey?.trim();
  const apiKey = rawKey ? decrypt(rawKey) : getServerAiKey();
  if (!apiKey) {
    // 401 marks the failure as permanent (no pointless retries)
    throw Object.assign(
      new Error(
        "No OpenAI API key configured. Add yours in Settings (gear icon), then re-analyze.",
      ),
      { status: 401 },
    );
  }

  await db
    .update(items)
    .set({ analysisStatus: "processing", updatedAt: new Date() })
    .where(eq(items.id, itemId));

  const allCategories = await db.select().from(categories);
  const result = await analyzeItem(
    {
      url: item.url,
      platform: item.platform,
      title: item.title,
      description: item.description,
    },
    allCategories.map((c) => c.name),
    { apiKey, model: owner?.anthropicModel },
  );

  let category = allCategories.find(
    (c) => c.name.toLowerCase() === result.category.toLowerCase(),
  );
  if (!category) {
    if (result.isNewCategory && allCategories.length < 40) {
      const [inserted] = await db
        .insert(categories)
        .values({ name: result.category, isSeeded: false })
        .onConflictDoUpdate({
          target: categories.name,
          set: { name: dsql`excluded.name` },
        })
        .returning();
      category = inserted;
    } else {
      category = allCategories.find((c) => c.name === "Other");
    }
  }

  await db
    .update(items)
    .set({
      categoryId: category?.id ?? null,
      tags: result.tags,
      summary: result.summary,
      analysisStatus: "done",
      analysisError: null,
      analysisTokensIn: result.tokensIn,
      analysisTokensOut: result.tokensOut,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));

  // Re-embed with the fresh tags + summary for semantic search
  await enqueueJob("embed_item", { itemId });
}

export async function handleAnalyzeItemWithImage(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item?.localImagePath) {
    throw Object.assign(
      new Error("No cached image available for visual analysis"),
      { status: 400 },
    );
  }

  const owner = await db.query.user.findFirst({ where: eq(user.id, item.userId) });
  const rawKey = owner?.anthropicApiKey?.trim();
  const apiKey = rawKey ? decrypt(rawKey) : getServerAiKey();
  if (!apiKey) {
    throw Object.assign(
      new Error("No OpenAI API key configured. Add yours in Settings (gear icon), then re-analyze."),
      { status: 401 },
    );
  }

  const ext = item.localImagePath.split(".").pop() ?? "jpg";
  const mediaTypeMap: Record<string, ImageSource["mediaType"]> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp",
  };
  const mediaType = mediaTypeMap[ext] ?? "image/jpeg";

  let imageData: string;
  try {
    const buffer = await readFile(cachedImageAbsolutePath(item.localImagePath));
    imageData = buffer.toString("base64");
  } catch {
    throw Object.assign(new Error("Cached image file not found"), { status: 400 });
  }

  await db
    .update(items)
    .set({ analysisStatus: "processing", updatedAt: new Date() })
    .where(eq(items.id, itemId));

  const allCategories = await db.select().from(categories);
  const result = await analyzeItemWithImage(
    {
      url: item.url,
      platform: item.platform,
      title: item.title,
      description: item.description,
    },
    { data: imageData, mediaType },
    allCategories.map((c) => c.name),
    { apiKey, model: owner?.anthropicModel },
  );

  let category = allCategories.find(
    (c) => c.name.toLowerCase() === result.category.toLowerCase(),
  );
  if (!category) {
    if (result.isNewCategory && allCategories.length < 40) {
      const [inserted] = await db
        .insert(categories)
        .values({ name: result.category, isSeeded: false })
        .onConflictDoUpdate({
          target: categories.name,
          set: { name: dsql`excluded.name` },
        })
        .returning();
      category = inserted;
    } else {
      category = allCategories.find((c) => c.name === "Other");
    }
  }

  await db
    .update(items)
    .set({
      categoryId: category?.id ?? null,
      tags: result.tags,
      summary: result.summary,
      analysisStatus: "done",
      analysisError: null,
      imageAnalysisTokensIn: result.tokensIn,
      imageAnalysisTokensOut: result.tokensOut,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));

  await enqueueJob("embed_item", { itemId });
}

export async function handleEmbedItem(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return;
  const embedding = await embedText(buildItemEmbeddingText(item), "passage");
  await db.update(items).set({ embedding }).where(eq(items.id, itemId));
}

const LINK_CHECK_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function handleCheckLink(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return;

  let status = "ok";
  try {
    let res = await fetch(item.url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": LINK_CHECK_UA },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(item.url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: { "user-agent": LINK_CHECK_UA },
      });
      void res.body?.cancel();
    }
    // Only unambiguous "gone" codes count as dead — social platforms answer
    // 403/429/999 to non-browser requests for perfectly alive posts.
    status = res.status === 404 || res.status === 410 ? "dead" : "ok";
  } catch {
    status = "unknown";
  }

  await db
    .update(items)
    .set({ linkStatus: status, linkCheckedAt: new Date() })
    .where(eq(items.id, itemId));
}

export async function handleCacheImage(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item?.imageUrl || item.localImagePath) return;

  const fileName = await cacheImage(itemId, item.imageUrl);
  if (fileName) {
    await db
      .update(items)
      .set({ localImagePath: fileName, updatedAt: new Date() })
      .where(eq(items.id, itemId));
  }
}
