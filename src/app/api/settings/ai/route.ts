import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { items, user } from "@/db/schema";
import { getServerAiKey, resolveModel, verifyAiCredentials } from "@/lib/claude";
import { decrypt, encrypt } from "@/lib/crypto";
import { enqueueJob } from "@/lib/queue/enqueue";
import { getSessionUser } from "@/lib/session";

function maskKey(key: string): string {
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
  });
  const rawKey = row?.anthropicApiKey ?? null;
  const userKey = rawKey ? decrypt(rawKey) : null;
  return NextResponse.json({
    hasUserKey: Boolean(userKey),
    hasServerKey: Boolean(getServerAiKey()),
    maskedKey: userKey ? maskKey(userKey) : null,
    model: row?.anthropicModel ?? null,
    effectiveModel: resolveModel(row?.anthropicModel),
  });
}

const putSchema = z.object({
  apiKey: z.string().trim().min(10).max(300).nullable().optional(),
  model: z.string().trim().min(1).max(100).nullable().optional(),
});

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { apiKey, model } = parsed.data;

  // Validate new credentials against the Anthropic API (free count_tokens call)
  // before saving; also re-validate the model when only the model changes.
  const current = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
  });
  const keyToVerify =
    apiKey ?? (apiKey === null ? null : current?.anthropicApiKey ?? null);
  if (keyToVerify) {
    try {
      await verifyAiCredentials({ apiKey: keyToVerify, model: model ?? null });
    } catch (error) {
      const status = (error as { status?: number }).status;
      const reason =
        status === 401
          ? "Invalid API key"
          : status === 404
            ? "Unknown model"
            : "Could not verify credentials with the Anthropic API";
      return NextResponse.json({ error: reason }, { status: 400 });
    }
  }

  const updates: Partial<typeof user.$inferInsert> = { updatedAt: new Date() };
  if (apiKey !== undefined) {
    updates.anthropicApiKey = apiKey ? encrypt(apiKey) : apiKey;
  }
  if (model !== undefined) updates.anthropicModel = model;
  await db.update(user).set(updates).where(eq(user.id, sessionUser.id));

  // A newly working key means previously failed analyses can now succeed.
  let requeued = 0;
  if (keyToVerify) {
    const failed = await db
      .update(items)
      .set({
        analysisStatus: "pending",
        analysisError: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(items.userId, sessionUser.id), eq(items.analysisStatus, "failed")),
      )
      .returning({ id: items.id });
    for (const row of failed) {
      await enqueueJob("analyze_item", { itemId: row.id });
    }
    requeued = failed.length;
  }

  return NextResponse.json({ ok: true, requeued });
}
