export type Platform =
  | "instagram"
  | "linkedin"
  | "reddit"
  | "x"
  | "youtube"
  | "web"
  | "whatsapp";

const STRIP_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igsh",
  "igshid",
  "si",
  "share_id",
  "ref_src",
  "rdt",
]);

export function normalizeUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol === "http:") url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  const toDelete: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (key.startsWith("utm_") || STRIP_PARAMS.has(key)) toDelete.push(key);
  });
  toDelete.forEach((key) => url.searchParams.delete(key));

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function detectPlatform(normalizedUrl: string): {
  platform: Platform;
  externalId: string | null;
} {
  const url = new URL(normalizedUrl);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;

  if (host === "instagram.com") {
    const match = path.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    return { platform: "instagram", externalId: match?.[1] ?? null };
  }
  if (host === "linkedin.com") {
    const match =
      path.match(/\/feed\/update\/(urn:li:activity:\d+)/) ??
      path.match(/\/posts\/([^/]+)/);
    return { platform: "linkedin", externalId: match?.[1] ?? null };
  }
  if (host === "reddit.com" || host === "old.reddit.com") {
    const match = path.match(/\/comments\/([a-z0-9]+)/i);
    return {
      platform: "reddit",
      externalId: match ? `t3_${match[1]}` : null,
    };
  }
  if (host === "x.com" || host === "twitter.com") {
    const match = path.match(/\/status\/(\d+)/);
    return { platform: "x", externalId: match?.[1] ?? null };
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v") ?? path.match(/\/shorts\/([^/]+)/)?.[1];
    return { platform: "youtube", externalId: id ?? null };
  }
  if (host === "youtu.be") {
    return { platform: "youtube", externalId: path.slice(1) || null };
  }
  return { platform: "web", externalId: null };
}
