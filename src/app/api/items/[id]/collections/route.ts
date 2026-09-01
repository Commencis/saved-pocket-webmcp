import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections, items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: itemId } = await params;

  // Verify item belongs to user
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.userId, user.id)),
    columns: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({ id: collections.id, name: collections.name })
    .from(collectionItems)
    .innerJoin(collections, eq(collectionItems.collectionId, collections.id))
    .where(
      and(eq(collectionItems.itemId, itemId), eq(collections.userId, user.id)),
    );

  return NextResponse.json({ collections: rows });
}
