import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { categories, items } from "@/db/schema";
import { deleteCachedImage } from "@/lib/image-cache";
import { enqueueJob } from "@/lib/queue/enqueue";
import { resolveUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .select({ item: items, categoryName: categories.name })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(and(eq(items.id, id), eq(items.userId, user.id)));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...row.item, categoryName: row.categoryName });
}

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  categoryId: z.number().int().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  userTags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const data = { ...parsed.data };
  if (data.userTags) {
    // lowercase so array_to_tsvector lexemes match websearch_to_tsquery terms
    data.userTags = [...new Set(data.userTags.map((t) => t.toLowerCase()))];
  }
  if (typeof data.notes === "string" && data.notes.trim() === "") {
    data.notes = null;
  }
  const [updated] = await db
    .update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const embeddingAffected =
    data.title !== undefined ||
    data.tags !== undefined ||
    data.userTags !== undefined ||
    data.notes !== undefined;
  if (embeddingAffected) await enqueueJob("embed_item", { itemId: updated.id });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(items)
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (deleted.localImagePath) await deleteCachedImage(deleted.localImagePath);
  return NextResponse.json({ ok: true });
}
