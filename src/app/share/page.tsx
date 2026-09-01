import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ingestUrl } from "@/lib/ingest";

interface Props {
  searchParams: Promise<{ url?: string; title?: string; text?: string }>;
}

export default async function SharePage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const rawUrl = params.url ?? params.text ?? "";
  const title = params.title ?? null;

  // Extract first URL from text if the share was plain text containing a URL
  const urlMatch = /https?:\/\/[^\s]+/.exec(rawUrl);
  const url = urlMatch ? urlMatch[0] : rawUrl;

  if (url.startsWith("http")) {
    try {
      await ingestUrl({ userId: user.id, url, title });
    } catch {
      // Duplicate or network error — still redirect to dashboard
    }
  }

  redirect("/");
}
