import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [updated] = await db
    .update(items)
    .set({
      visitCount: sql`${items.visitCount} + 1`,
      lastVisitedAt: new Date(),
    })
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning({
      visitCount: items.visitCount,
      lastVisitedAt: items.lastVisitedAt,
    });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
