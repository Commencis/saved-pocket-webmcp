import path from "node:path";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// Runs fully locally (CPU) — no data leaves the machine. Multilingual so
// Turkish queries match English content and vice versa. 384 dimensions.
const MODEL_ID = "Xenova/multilingual-e5-small";

const globalForEmbeddings = globalThis as unknown as {
  __savedpocketExtractor?: Promise<FeatureExtractionPipeline>;
};

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!globalForEmbeddings.__savedpocketExtractor) {
    globalForEmbeddings.__savedpocketExtractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir =
        process.env.MODEL_CACHE_DIR ?? path.join(process.cwd(), "data", "models");
      return pipeline("feature-extraction", MODEL_ID, { dtype: "q8" });
    })();
  }
  return globalForEmbeddings.__savedpocketExtractor;
}

// e5 models are trained with these prefixes; omitting them degrades quality.
export async function embedText(
  text: string,
  kind: "query" | "passage",
): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(`${kind}: ${text.slice(0, 2000)}`, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

export function buildItemEmbeddingText(item: {
  url: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  notes: string | null;
  tags: string[];
  userTags: string[];
}): string {
  const tagLine = [...item.tags, ...item.userTags].join(", ");
  const text = [item.title, tagLine, item.summary, item.notes, item.description]
    .filter((part) => part && part.trim())
    .join("\n")
    .trim();
  return text || item.url;
}
