import { sql } from "@/db/client";
import {
  handleAnalyzeItem,
  handleAnalyzeItemWithImage,
  handleCacheImage,
  handleCheckLink,
  handleEmbedItem,
} from "./handlers";

const TICK_MS = 3000;
const CONCURRENCY = 2;
const LINK_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface ClaimedJob {
  id: number;
  type: string;
  payload: { itemId: string };
  attempts: number;
  max_attempts: number;
}

const globalFlag = globalThis as unknown as {
  __savedpocketWorkerStarted?: boolean;
};

export function startWorker(): void {
  if (globalFlag.__savedpocketWorkerStarted) return;
  globalFlag.__savedpocketWorkerStarted = true;

  void recoverStaleJobs().then(() => {
    void backfillEmbeddings();
    void scheduleLinkChecks();
  });
  setInterval(() => void tick(), TICK_MS);
  setInterval(() => void scheduleLinkChecks(), LINK_CHECK_INTERVAL_MS);
  console.log("[queue] worker started");
}

/** Enqueue embed jobs for items that never got an embedding (e.g. pre-upgrade). */
async function backfillEmbeddings(): Promise<void> {
  try {
    const inserted = await sql`
      INSERT INTO jobs (type, payload)
      SELECT 'embed_item', jsonb_build_object('itemId', i.id)
      FROM items i
      WHERE i.embedding IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM jobs j
          WHERE j.type = 'embed_item'
            AND j.status IN ('pending', 'processing')
            AND j.payload->>'itemId' = i.id::text)
      RETURNING id`;
    if (inserted.length > 0) {
      console.log(`[queue] backfilling embeddings for ${inserted.length} item(s)`);
    }
  } catch (err) {
    console.error("[queue] embedding backfill failed", err);
  }
}

/** Re-check item links at most every 30 days, max 100 per day. */
async function scheduleLinkChecks(): Promise<void> {
  try {
    await sql`
      INSERT INTO jobs (type, payload)
      SELECT 'check_link', jsonb_build_object('itemId', i.id)
      FROM items i
      WHERE (i.link_checked_at IS NULL
             OR i.link_checked_at < now() - interval '30 days')
        AND NOT EXISTS (
          SELECT 1 FROM jobs j
          WHERE j.type = 'check_link'
            AND j.status IN ('pending', 'processing')
            AND j.payload->>'itemId' = i.id::text)
      ORDER BY i.link_checked_at ASC NULLS FIRST
      LIMIT 100`;
  } catch (err) {
    console.error("[queue] link check scheduling failed", err);
  }
}

async function recoverStaleJobs(): Promise<void> {
  try {
    const recovered = await sql`
      UPDATE jobs SET status = 'pending', updated_at = now()
      WHERE status = 'processing'
      RETURNING id`;
    if (recovered.length > 0) {
      console.log(`[queue] recovered ${recovered.length} stale job(s)`);
    }
  } catch (err) {
    console.error("[queue] stale recovery failed", err);
  }
}

let busy = false;

async function tick(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const claimed = await sql<ClaimedJob[]>`
      UPDATE jobs
      SET status = 'processing', attempts = attempts + 1, updated_at = now()
      WHERE id IN (
        SELECT id FROM jobs
        WHERE status = 'pending' AND run_at <= now()
        ORDER BY id
        LIMIT ${CONCURRENCY}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, payload, attempts, max_attempts`;
    await Promise.all(claimed.map((job) => runJob(job)));
  } catch (err) {
    console.error("[queue] tick failed", err);
  } finally {
    busy = false;
  }
}

async function runJob(job: ClaimedJob): Promise<void> {
  try {
    if (job.type === "analyze_item") {
      await handleAnalyzeItem(job.payload.itemId);
    } else if (job.type === "analyze_item_image") {
      await handleAnalyzeItemWithImage(job.payload.itemId);
    } else if (job.type === "cache_image") {
      await handleCacheImage(job.payload.itemId);
    } else if (job.type === "embed_item") {
      await handleEmbedItem(job.payload.itemId);
    } else if (job.type === "check_link") {
      await handleCheckLink(job.payload.itemId);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
    await sql`UPDATE jobs SET status = 'done', updated_at = now() WHERE id = ${job.id}`;
  } catch (err) {
    await handleFailure(job, err);
  }
}

async function handleFailure(job: ClaimedJob, err: unknown): Promise<void> {
  const message = (err instanceof Error ? err.message : String(err)).slice(
    0,
    1000,
  );
  const status = (err as { status?: number }).status;
  const permanent = status === 400 || status === 401;

  if (!permanent && job.attempts < job.max_attempts) {
    await sql`
      UPDATE jobs
      SET status = 'pending',
          run_at = now() + (interval '30 seconds' * attempts),
          last_error = ${message},
          updated_at = now()
      WHERE id = ${job.id}`;
    console.warn(
      `[queue] job ${job.id} (${job.type}) failed, retrying: ${message}`,
    );
    return;
  }

  await sql`
    UPDATE jobs
    SET status = 'failed', last_error = ${message}, updated_at = now()
    WHERE id = ${job.id}`;
  if (job.type === "analyze_item" || job.type === "analyze_item_image") {
    await sql`
      UPDATE items
      SET analysis_status = 'failed', analysis_error = ${message}, updated_at = now()
      WHERE id = ${job.payload.itemId}`;
  }
  console.error(`[queue] job ${job.id} (${job.type}) failed permanently: ${message}`);
}
