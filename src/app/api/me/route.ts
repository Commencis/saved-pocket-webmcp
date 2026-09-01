import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

// Allow the Chrome extension (any ID) to call this endpoint.
// The extension popup uses this for connection testing and API key resolution.
function extensionCors(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (origin.startsWith("chrome-extension://")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-savedpocket-key",
    };
  }
  return {} as Record<string, string>;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCors(request) });
}

export async function GET(request: NextRequest) {
  const cors = extensionCors(request);

  // 1) API key auth — used by extension popup to test the connection
  const apiKey = request.headers.get("x-savedpocket-key");
  if (apiKey) {
    const row = await db.query.user.findFirst({ where: eq(user.apiKey, apiKey) });
    if (!row) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }
    return NextResponse.json(
      { id: row.id, name: row.name, email: row.email, apiKey: row.apiKey },
      { headers: cors },
    );
  }

  // 2) Session auth — web dashboard and cookie-based extension fallback (local dev)
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const row = await db.query.user.findFirst({ where: eq(user.id, sessionUser.id) });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: cors });
  }
  return NextResponse.json(
    { id: row.id, name: row.name, email: row.email, apiKey: row.apiKey },
    { headers: cors },
  );
}
