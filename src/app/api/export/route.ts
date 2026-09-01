import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, items } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") ?? "json";

  const rows = await db
    .select({
      id: items.id,
      platform: items.platform,
      url: items.url,
      title: items.title,
      description: items.description,
      category: categories.name,
      tags: items.tags,
      userTags: items.userTags,
      summary: items.summary,
      notes: items.notes,
      visitCount: items.visitCount,
      savedAt: items.savedAt,
      createdAt: items.createdAt,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(eq(items.userId, user.id))
    .orderBy(desc(items.createdAt));

  if (format === "csv") {
    const headers = [
      "id",
      "platform",
      "url",
      "title",
      "description",
      "category",
      "tags",
      "userTags",
      "summary",
      "notes",
      "visitCount",
      "savedAt",
      "createdAt",
    ] as const;
    const csvLines: string[] = [headers.join(",")];
    for (const row of rows) {
      csvLines.push(
        headers
          .map((h) => {
            const v = row[h];
            if (v === null || v === undefined) return "";
            const str = Array.isArray(v) ? v.join(";") : String(v);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(","),
      );
    }
    return new NextResponse(csvLines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="savedpocket-${dateTag()}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify({ exportedAt: new Date(), items: rows }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="savedpocket-${dateTag()}.json"`,
    },
  });
}

function dateTag() {
  return new Date().toISOString().slice(0, 10);
}
