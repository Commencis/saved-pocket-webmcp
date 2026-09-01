import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collectionItems, collections } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(["private", "link_only", "public"]).optional(),
  forkable: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const needsItemCheck =
    (parsed.data.visibility && parsed.data.visibility !== "private") ||
    parsed.data.forkable === true;

  if (needsItemCheck) {
    const [{ value: itemCount }] = await db
      .select({ value: count() })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, Number(id)));
    if (itemCount === 0) {
      return NextResponse.json(
        { error: "Add items to this collection before making it public or enabling forking." },
        { status: 400 },
      );
    }
  }

  const [row] = await db
    .update(collections)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(collections.id, Number(id)), eq(collections.userId, user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ collection: row });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db
    .delete(collections)
    .where(and(eq(collections.id, Number(id)), eq(collections.userId, user.id)))
    .returning({ id: collections.id });

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
