import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items, user } from "@/db/schema";
import { normalizeUrl } from "@/lib/url-normalize";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-savedpocket-key",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-savedpocket-key");
  const owner = apiKey
    ? await db.query.user.findFirst({ where: eq(user.apiKey, apiKey) })
    : undefined;
  if (!owner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json(
      { error: "url param required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(rawUrl);
  } catch {
    return NextResponse.json({ found: false }, { headers: CORS_HEADERS });
  }

  const item = await db.query.items.findFirst({
    where: and(eq(items.userId, owner.id), eq(items.url, normalized)),
    columns: { id: true, title: true },
  });

  return NextResponse.json(
    item ? { found: true, id: item.id, title: item.title } : { found: false },
    { headers: CORS_HEADERS },
  );
}
