import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { enqueueJob } from "@/lib/queue/enqueue";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, id), eq(items.userId, user.id)),
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!item.localImagePath) {
    return NextResponse.json(
      { error: "No cached image available for this item" },
      { status: 422 },
    );
  }

  await db
    .update(items)
    .set({ analysisStatus: "pending", analysisError: null, updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.userId, user.id)));

  await enqueueJob("analyze_item_image", { itemId: id });
  return NextResponse.json({ ok: true });
}
