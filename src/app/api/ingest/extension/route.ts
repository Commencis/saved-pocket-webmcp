import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { ingestUrl } from "@/lib/ingest";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-savedpocket-key",
};

const bodySchema = z.object({
  platform: z.enum(["instagram", "linkedin", "reddit", "x", "youtube", "web", "whatsapp"]).optional(),
  items: z
    .array(
      z.object({
        url: z.string().url(),
        externalId: z.string().max(200).nullish(),
        title: z.string().max(1000).nullish(),
        description: z.string().max(4000).nullish(),
        imageUrl: z.string().url().max(2000).nullish(),
        notes: z.string().max(4000).nullish(),
        mcpContent: z.string().max(10000).nullish(),
      }),
    )
    .min(1)
    .max(100),
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-savedpocket-key");
  const owner = apiKey
    ? await db.query.user.findFirst({ where: eq(user.apiKey, apiKey) })
    : undefined;
  if (!owner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let created = 0;
  const resultItems: Array<{ id: string; title: string | null }> = [];

  for (const entry of parsed.data.items) {
    try {
      const hasMcp = !!entry.mcpContent;
      const result = await ingestUrl({
        userId: owner.id,
        url: entry.url,
        platform: parsed.data.platform,
        externalId: entry.externalId ?? undefined,
        title: entry.title ?? undefined,
        description: hasMcp
          ? entry.mcpContent!.slice(0, 4000)
          : (entry.description ?? undefined),
        imageUrl: entry.imageUrl ?? undefined,
        notes: entry.notes ?? undefined,
        savedAt: new Date(),
        fetchMeta: !hasMcp && !entry.description,
      });
      if (result.created) created++;
      resultItems.push({ id: result.item.id, title: result.item.title });
    } catch (err) {
      console.error(`ingest/extension failed for ${entry.url}`, err);
    }
  }

  return NextResponse.json(
    { created, received: parsed.data.items.length, items: resultItems },
    { headers: CORS_HEADERS },
  );
}
