import { NextRequest, NextResponse } from "next/server";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections, user } from "@/db/schema";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const where = q
    ? sql`${collections.visibility} = 'public' AND (${ilike(collections.name, `%${q}%`)} OR ${ilike(collections.description, `%${q}%`)})`
    : eq(collections.visibility, "public");

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        slug: collections.slug,
        visibility: collections.visibility,
        forkable: collections.forkable,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        itemCount: sql<number>`count(${collectionItems.itemId})::int`,
        authorName: user.name,
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collections.id, collectionItems.collectionId))
      .leftJoin(user, eq(collections.userId, user.id))
      .where(where)
      .groupBy(collections.id, user.name)
      .orderBy(desc(collections.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(collections)
      .where(where),
  ]);

  return NextResponse.json({ collections: rows, total: count, page, pageSize: PAGE_SIZE });
}
