import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sourceId = Number(id);

  const source = await db.query.collections.findFirst({
    where: eq(collections.id, sourceId),
  });

  if (!source || source.visibility === "private") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!source.forkable) {
    return NextResponse.json({ error: "This collection is not forkable" }, { status: 403 });
  }
  if (source.userId === user.id) {
    return NextResponse.json({ error: "Cannot fork your own collection" }, { status: 400 });
  }

  const sourceItems = await db
    .select({ itemId: collectionItems.itemId })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, sourceId));

  // Generate unique slug
  let slug = generateSlug(`${source.name} fork`);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, slug),
    });
    if (!existing) break;
    slug = generateSlug(`${source.name} fork`);
  }

  const [newCol] = await db
    .insert(collections)
    .values({
      userId: user.id,
      name: `${source.name} (fork)`,
      description: source.description,
      slug,
      visibility: "private",
      forkable: false,
    })
    .returning();

  if (sourceItems.length > 0) {
    await db
      .insert(collectionItems)
      .values(sourceItems.map((si) => ({ collectionId: newCol.id, itemId: si.itemId })))
      .onConflictDoNothing();
  }

  return NextResponse.json({ collection: { ...newCol, itemCount: sourceItems.length } }, { status: 201 });
}
