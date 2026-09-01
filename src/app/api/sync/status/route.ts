import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counts = await db
    .select({
      status: jobs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(jobs)
    .groupBy(jobs.status);

  const jobCounts: Record<string, number> = {};
  for (const row of counts) jobCounts[row.status] = row.count;

  return NextResponse.json({ jobs: jobCounts });
}
