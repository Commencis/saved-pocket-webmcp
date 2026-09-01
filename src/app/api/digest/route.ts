import { NextResponse } from "next/server";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeekRows, unreadOldRows, totalRows] = await Promise.all([
    // Items saved in the last 7 days
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(
        and(eq(items.userId, user.id), gte(items.createdAt, oneWeekAgo)),
      ),

    // Items older than 7 days that were never opened — up to 5 for "rediscover" suggestions
    db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        categoryId: items.categoryId,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(
        and(
          eq(items.userId, user.id),
          eq(items.visitCount, 0),
          lt(items.createdAt, oneWeekAgo),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(5),

    // Total unread (never opened)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(and(eq(items.userId, user.id), eq(items.visitCount, 0))),
  ]);

  // Rough "streak": saved anything in both halves of the last 14 days?
  const [prevWeekRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(
      and(
        eq(items.userId, user.id),
        gte(items.createdAt, twoWeeksAgo),
        lt(items.createdAt, oneWeekAgo),
      ),
    );

  return NextResponse.json({
    savedThisWeek: thisWeekRows[0].count,
    savedPrevWeek: prevWeekRow.count,
    totalUnread: totalRows[0].count,
    rediscover: unreadOldRows,
    weekKey: weekKey(),
  });
}

function weekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(d.getUTCDate() / 7)).padStart(2, "0")}`;
}
