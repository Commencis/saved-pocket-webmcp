import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/db/client";
import { categories, items, user } from "@/db/schema";
import { getServerAiKey, getServerProvider, resolveModel, type AiProvider } from "@/lib/claude";
import { decrypt } from "@/lib/crypto";
import { embedText } from "@/lib/embeddings";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  collectionId: z.number().int().positive().optional(),
});

const SYSTEM_PROMPT = `You are SavedPocket's personal librarian. The user is asking about their saved content library.
You will be given a selection of the most relevant items from their library. Answer their question based on those items.
When referencing specific items, include their title in your response. Be concise (2-4 sentences unless detail is requested).
If the context is insufficient, say so rather than speculating. Respond in the same language the user uses.`;

const TOP_K = 8;
const DISTANCE_CUTOFF = 0.35;

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { message, collectionId } = parsed.data;

  const owner = await db.query.user.findFirst({ where: eq(user.id, sessionUser.id) });
  const provider: AiProvider =
    ((owner?.aiProvider ?? getServerProvider()) === "anthropic" ? "anthropic" : "openai");

  const rawKey =
    provider === "openai" ? owner?.openaiApiKey?.trim() : owner?.anthropicApiKey?.trim();
  const apiKey = rawKey ? decrypt(rawKey) : getServerAiKey(provider);

  if (!apiKey) {
    return NextResponse.json(
      { error: `No ${provider === "anthropic" ? "Anthropic" : "OpenAI"} API key configured. Add yours in Settings.` },
      { status: 402 },
    );
  }

  // Embed the query and find nearest neighbours in the user's library
  let contextItems: {
    id: string;
    title: string | null;
    url: string;
    summary: string | null;
    notes: string | null;
    categoryName: string | null;
    tags: string[];
    userTags: string[];
  }[] = [];

  try {
    const queryVector = await embedText(message, "query");
    const vectorLiteral = `[${queryVector.join(",")}]`;

    const rows = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        summary: items.summary,
        notes: items.notes,
        tags: items.tags,
        userTags: items.userTags,
        categoryName: categories.name,
        dist: sql<number>`${items.embedding} <=> ${vectorLiteral}::vector`,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(
        and(
          eq(items.userId, sessionUser.id),
          sql`${items.embedding} IS NOT NULL`,
          sql`${items.embedding} <=> ${vectorLiteral}::vector <= ${DISTANCE_CUTOFF}`,
          collectionId
            ? sql`${items.id} IN (SELECT item_id FROM collection_items WHERE collection_id = ${collectionId})`
            : undefined,
        ),
      )
      .orderBy(sql`${items.embedding} <=> ${vectorLiteral}::vector`)
      .limit(TOP_K);

    contextItems = rows;
  } catch (err) {
    console.error("[chat] embedding failed", err);
  }

  const contextBlock =
    contextItems.length > 0
      ? contextItems
          .map((item, i) => {
            const allTags = [...(item.tags ?? []), ...(item.userTags ?? [])];
            const lines = [
              `[${i + 1}] ${item.title ?? "(untitled)"}`,
              `  URL: ${item.url}`,
              `  Category: ${item.categoryName ?? "–"}`,
              `  Tags: ${allTags.join(", ") || "–"}`,
              `  Summary: ${item.summary ?? "–"}`,
            ];
            if (item.notes?.trim()) lines.push(`  User note: ${item.notes.trim()}`);
            return lines.join("\n");
          })
          .join("\n\n")
      : "No closely matching items found in the library.";

  const userMessage = `User question: ${message}\n\n---\nRelevant library items:\n\n${contextBlock}`;
  const model = provider === "openai"
    ? resolveModel("openai", owner?.openaiModel)
    : resolveModel("anthropic", owner?.anthropicModel);

  let text: string;

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
    text = block?.text ?? "Sorry, I couldn't generate an answer.";
  } else {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });
    text = response.choices[0]?.message?.content ?? "Sorry, I couldn't generate an answer.";
  }

  return NextResponse.json({
    answer: text,
    items: contextItems.map(({ id, title, url }) => ({ id, title, url })),
  });
}
