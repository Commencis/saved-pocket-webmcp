import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db/client";
import { collectionItems, collections, items, user } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth: session or API key
  let userId: string;

  const apiKey = request.headers.get("x-savedpocket-key");
  if (apiKey) {
    const row = await db.query.user.findFirst({ where: eq(user.apiKey, apiKey) });
    if (!row) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = row.id;
  } else {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = sessionUser.id;
  }

  const { id } = await params;
  const collectionId = Number(id);

  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.userId, userId)),
  });
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = request.nextUrl.searchParams.get("format") ?? "markdown";

  const { embedding: _e, searchVector: _sv, ...itemCols } = getTableColumns(items);

  const rows = await db
    .select({ ...itemCols })
    .from(collectionItems)
    .innerJoin(items, eq(collectionItems.itemId, items.id))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(desc(collectionItems.addedAt));

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Nothing to export — this collection has no items." },
      { status: 400 },
    );
  }

  const safeName = col.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
  const dateTag = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(
      JSON.stringify(
        {
          collection: {
            id: col.id,
            name: col.name,
            description: col.description,
            slug: col.slug,
            visibility: col.visibility,
            itemCount: rows.length,
            exportedAt: new Date(),
          },
          items: rows.map((r) => ({
            id: r.id,
            title: r.title,
            url: r.url,
            platform: r.platform,
            summary: r.summary,
            description: r.description,
            notes: r.notes,
            tags: [...(r.tags ?? []), ...(r.userTags ?? [])],
            savedAt: r.savedAt,
          })),
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${safeName}-${dateTag}.json"`,
        },
      },
    );
  }

  // Markdown format (default)
  const lines: string[] = [];
  lines.push(`# ${col.name}`);
  lines.push("");
  if (col.description) {
    lines.push(col.description);
    lines.push("");
  }
  lines.push(
    `> SavedPocket collection | ${rows.length} item${rows.length !== 1 ? "s" : ""} | Exported: ${dateTag}`,
  );
  lines.push("");

  const youtubeUrls: string[] = [];

  for (const row of rows) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${row.title ?? row.url}`);
    lines.push("");
    lines.push(`**Platform:** ${row.platform}`);
    lines.push(`**URL:** ${row.url}`);
    if (row.summary) lines.push(`**Summary:** ${row.summary}`);
    if (row.description && row.description !== row.summary) {
      lines.push(`**Description:** ${row.description}`);
    }
    const allTags = [...(row.tags ?? []), ...(row.userTags ?? [])];
    if (allTags.length > 0) lines.push(`**Tags:** ${allTags.join(", ")}`);
    if (row.notes) lines.push(`**Notes:** ${row.notes}`);
    lines.push("");

    if (row.platform === "youtube") {
      youtubeUrls.push(row.url);
    }
  }

  if (youtubeUrls.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## YouTube Sources (for NotebookLM)");
    lines.push("");
    lines.push(
      "The following YouTube URLs can be added as individual YouTube sources in NotebookLM:",
    );
    lines.push("");
    for (const url of youtubeUrls) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-${dateTag}.md"`,
    },
  });
}
