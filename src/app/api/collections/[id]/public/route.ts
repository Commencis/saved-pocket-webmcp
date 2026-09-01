import { NextRequest, NextResponse } from "next/server";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections, items, user } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Support lookup by numeric id or by slug
  const idNum = Number(id);
  const col = isNaN(idNum)
    ? await db.query.collections.findFirst({ where: eq(collections.slug, id) })
    : await db.query.collections.findFirst({ where: eq(collections.id, idNum) });

  if (!col || col.visibility === "private") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const author = await db.query.user.findFirst({
    where: eq(user.id, col.userId),
    columns: { name: true },
  });

  const { embedding: _e, searchVector: _sv, ...itemCols } = getTableColumns(items);

  const itemRows = await db
    .select({ ...itemCols })
    .from(collectionItems)
    .innerJoin(items, eq(collectionItems.itemId, items.id))
    .where(eq(collectionItems.collectionId, col.id))
    .orderBy(desc(collectionItems.addedAt));

  // Check if viewer is logged in (for fork button eligibility)
  const sessionUser = await getSessionUser();

  return NextResponse.json({
    collection: {
      id: col.id,
      name: col.name,
      description: col.description,
      slug: col.slug,
      visibility: col.visibility,
      forkable: col.forkable,
      itemCount: itemRows.length,
      authorName: author?.name ?? null,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    },
    items: itemRows,
    viewerLoggedIn: !!sessionUser,
    isOwner: sessionUser?.id === col.userId,
  });
}
