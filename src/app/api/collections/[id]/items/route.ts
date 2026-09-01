import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collectionItems, collections, items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collectionId = Number(id);

  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.userId, user.id)),
  });
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { embedding: _e, searchVector: _sv, ...itemCols } = getTableColumns(items);

  const rows = await db
    .select({ ...itemCols })
    .from(collectionItems)
    .innerJoin(items, eq(collectionItems.itemId, items.id))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(desc(collectionItems.addedAt));

  return NextResponse.json({ items: rows });
}

const postSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collectionId = Number(id);

  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.userId, user.id)),
  });
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify items belong to this user
  const userItems = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, parsed.data.itemIds)));

  const validIds = new Set(userItems.map((i) => i.id));
  const toInsert = parsed.data.itemIds
    .filter((id) => validIds.has(id))
    .map((itemId) => ({ collectionId, itemId }));

  if (toInsert.length > 0) {
    await db.insert(collectionItems).values(toInsert).onConflictDoNothing();
  }

  return NextResponse.json({ ok: true, added: toInsert.length });
}
