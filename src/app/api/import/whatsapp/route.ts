import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestUrl } from "@/lib/ingest";
import { resolveUser } from "@/lib/session";

const bodySchema = z.object({
  urls: z.array(z.string().url()).min(1).max(500),
});

const CONCURRENCY = 5;

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { urls } = parsed.data;
  let created = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const result = await ingestUrl({
            userId: user.id,
            url,
            platform: "whatsapp",
            savedAt: new Date(),
          });
          if (result.created) created++;
          else duplicates++;
        } catch (err) {
          console.error(`[import/whatsapp] failed for ${url}`, err);
          errors.push(url);
        }
      }),
    );
  }

  return NextResponse.json({ total: urls.length, created, duplicates, errors });
}
