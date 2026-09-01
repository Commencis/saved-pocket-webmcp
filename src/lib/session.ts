import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, email, name } = session.user;
  return { id, email, name };
}

/** Resolves user from API key header first, then falls back to session cookie. */
export async function resolveUser(request: NextRequest): Promise<SessionUser | null> {
  const apiKey = request.headers.get("x-savedpocket-key");
  if (apiKey) {
    const row = await db.query.user.findFirst({ where: eq(user.apiKey, apiKey) });
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name ?? "" };
  }
  return getSessionUser();
}
