import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collectionItems, collections } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { resolveUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
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
    })
    .from(collections)
    .leftJoin(collectionItems, eq(collections.id, collectionItems.collectionId))
    .where(eq(collections.userId, user.id))
    .groupBy(collections.id)
    .orderBy(collections.createdAt);

  return NextResponse.json({ collections: rows });
}

const postSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(["private", "link_only", "public"]).default("private"),
  forkable: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, description, visibility, forkable } = parsed.data;

  // Generate a unique slug (retry up to 3 times on conflict)
  let slug = generateSlug(name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, slug),
    });
    if (!existing) break;
    slug = generateSlug(name);
  }

  const [row] = await db
    .insert(collections)
    .values({ userId: user.id, name, description, slug, visibility, forkable })
    .returning();

  return NextResponse.json({ collection: { ...row, itemCount: 0 } }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(collections)
    .where(and(eq(collections.id, Number(id)), eq(collections.userId, user.id)));

  return NextResponse.json({ ok: true });
}
