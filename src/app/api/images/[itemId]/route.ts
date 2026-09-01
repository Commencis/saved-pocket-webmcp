import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { cachedImageAbsolutePath } from "@/lib/image-cache";
import { getSessionUser } from "@/lib/session";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.userId, user.id)),
  });
  if (!item?.localImagePath) {
    return NextResponse.json({ error: "No cached image" }, { status: 404 });
  }
  try {
    const buffer = await readFile(cachedImageAbsolutePath(item.localImagePath));
    const ext = item.localImagePath.split(".").pop() ?? "jpg";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file missing" }, { status: 404 });
  }
}
