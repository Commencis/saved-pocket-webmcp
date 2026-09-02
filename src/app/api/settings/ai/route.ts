import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { items, user } from "@/db/schema";
import {
  getServerAiKey,
  getServerProvider,
  resolveModel,
  verifyAiCredentials,
  type AiProvider,
} from "@/lib/claude";
import { decrypt, encrypt } from "@/lib/crypto";
import { enqueueJob } from "@/lib/queue/enqueue";
import { getSessionUser } from "@/lib/session";

function maskKey(key: string): string {
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db.query.user.findFirst({ where: eq(user.id, sessionUser.id) });
  const provider: AiProvider = (row?.aiProvider as AiProvider) ?? getServerProvider();

  const openaiRaw = row?.openaiApiKey ?? null;
  const openaiKey = openaiRaw ? decrypt(openaiRaw) : null;

  const anthropicRaw = row?.anthropicApiKey ?? null;
  const anthropicKey = anthropicRaw ? decrypt(anthropicRaw) : null;

  return NextResponse.json({
    provider,
    openai: {
      hasUserKey: Boolean(openaiKey),
      hasServerKey: Boolean(getServerAiKey("openai")),
      maskedKey: openaiKey ? maskKey(openaiKey) : null,
      model: row?.openaiModel ?? null,
      effectiveModel: resolveModel("openai", row?.openaiModel),
    },
    anthropic: {
      hasUserKey: Boolean(anthropicKey),
      hasServerKey: Boolean(getServerAiKey("anthropic")),
      maskedKey: anthropicKey ? maskKey(anthropicKey) : null,
      model: row?.anthropicModel ?? null,
      effectiveModel: resolveModel("anthropic", row?.anthropicModel),
    },
  });
}

const putSchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  apiKey: z.string().trim().min(10).max(300).nullable().optional(),
  model: z.string().trim().min(1).max(100).nullable().optional(),
});

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { provider, apiKey, model } = parsed.data;

  const current = await db.query.user.findFirst({ where: eq(user.id, sessionUser.id) });

  // Resolve which raw key to verify against
  const currentEncryptedKey =
    provider === "openai" ? current?.openaiApiKey : current?.anthropicApiKey;
  const keyToVerify =
    apiKey !== undefined ? apiKey : currentEncryptedKey ? decrypt(currentEncryptedKey) : null;

  if (keyToVerify) {
    try {
      await verifyAiCredentials({ provider, apiKey: keyToVerify, model: model ?? null });
    } catch (error) {
      const status = (error as { status?: number }).status;
      const reason =
        status === 401
          ? "Invalid API key"
          : status === 404
            ? "Unknown model"
            : `Could not verify credentials with the ${provider === "anthropic" ? "Anthropic" : "OpenAI"} API`;
      return NextResponse.json({ error: reason }, { status: 400 });
    }
  }

  const updates: Partial<typeof user.$inferInsert> = {
    aiProvider: provider,
    updatedAt: new Date(),
  };

  if (provider === "openai") {
    if (apiKey !== undefined) updates.openaiApiKey = apiKey ? encrypt(apiKey) : null;
    if (model !== undefined) updates.openaiModel = model;
  } else {
    if (apiKey !== undefined) updates.anthropicApiKey = apiKey ? encrypt(apiKey) : null;
    if (model !== undefined) updates.anthropicModel = model;
  }

  await db.update(user).set(updates).where(eq(user.id, sessionUser.id));

  // Re-queue previously failed analyses now that we have a working key
  let requeued = 0;
  if (keyToVerify) {
    const failed = await db
      .update(items)
      .set({ analysisStatus: "pending", analysisError: null, updatedAt: new Date() })
      .where(and(eq(items.userId, sessionUser.id), eq(items.analysisStatus, "failed")))
      .returning({ id: items.id });
    for (const row of failed) await enqueueJob("analyze_item", { itemId: row.id });
    requeued = failed.length;
  }

  return NextResponse.json({ ok: true, requeued });
}
