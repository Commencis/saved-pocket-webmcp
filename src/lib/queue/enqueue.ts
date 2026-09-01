import { db } from "@/db/client";
import { jobs } from "@/db/schema";

export type JobType =
  | "analyze_item"
  | "analyze_item_image"
  | "cache_image"
  | "embed_item"
  | "check_link";

export async function enqueueJob(
  type: JobType,
  payload: { itemId: string },
): Promise<void> {
  await db.insert(jobs).values({ type, payload });
}
