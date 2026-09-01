import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { categories, items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      isSeeded: categories.isSeeded,
      itemCount: sql<number>`count(${items.id})::int`,
    })
    .from(categories)
    .leftJoin(
      items,
      and(eq(items.categoryId, categories.id), eq(items.userId, user.id)),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return NextResponse.json({ categories: rows });
}

const postSchema = z.object({ name: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const [category] = await db
    .insert(categories)
    .values({ name: parsed.data.name.trim() })
    .onConflictDoNothing()
    .returning();
  if (!category) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
  return NextResponse.json(category, { status: 201 });
}
