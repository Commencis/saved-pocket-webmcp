import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const collectionId = Number(id);

  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.userId, user.id)),
  });
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.itemId, itemId),
      ),
    );

  return NextResponse.json({ ok: true });
}
