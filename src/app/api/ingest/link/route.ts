import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestUrl } from "@/lib/ingest";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid url is required" }, { status: 400 });
  }

  try {
    const { item, created } = await ingestUrl({
      userId: user.id,
      url: parsed.data.url,
    });
    return NextResponse.json({ item, created }, { status: created ? 201 : 200 });
  } catch (err) {
    console.error("ingest/link failed", err);
    return NextResponse.json({ error: "Failed to ingest URL" }, { status: 500 });
  }
}
