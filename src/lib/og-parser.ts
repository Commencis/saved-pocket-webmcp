import ogs from "open-graph-scraper";

export interface PageMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function fetchMetadata(url: string): Promise<PageMetadata> {
  const og = await fetchOpenGraph(url);
  if (og.title || og.imageUrl) return og;
  const oembed = await fetchOEmbed(url);
  return { ...og, ...oembed };
}

async function fetchOpenGraph(url: string): Promise<PageMetadata> {
  try {
    const { result } = await ogs({
      url,
      timeout: 10,
      fetchOptions: { headers: { "user-agent": BROWSER_UA } },
    });
    return {
      title: result.ogTitle ?? result.twitterTitle ?? result.dcTitle,
      description:
        result.ogDescription ?? result.twitterDescription ?? undefined,
      imageUrl:
        result.ogImage?.[0]?.url ?? result.twitterImage?.[0]?.url ?? undefined,
    };
  } catch {
    return {};
  }
}

const OEMBED_ENDPOINTS: Array<{ hosts: string[]; endpoint: string }> = [
  {
    hosts: ["youtube.com", "youtu.be", "m.youtube.com"],
    endpoint: "https://www.youtube.com/oembed?format=json&url=",
  },
  {
    hosts: ["x.com", "twitter.com"],
    endpoint: "https://publish.twitter.com/oembed?omit_script=1&url=",
  },
];

async function fetchOEmbed(url: string): Promise<PageMetadata> {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const provider = OEMBED_ENDPOINTS.find((p) => p.hosts.includes(host));
  if (!provider) return {};
  try {
    const res = await fetch(provider.endpoint + encodeURIComponent(url), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      html?: string;
    };
    const textFromHtml = data.html
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      title: data.title ?? (data.author_name ? `Post by ${data.author_name}` : undefined),
      description: textFromHtml?.slice(0, 500),
      imageUrl: data.thumbnail_url,
    };
  } catch {
    return {};
  }
}
