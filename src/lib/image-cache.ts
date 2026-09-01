import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const CACHE_DIR = process.env.IMAGE_CACHE_DIR ?? "./data/images";
const MAX_BYTES = 20 * 1024 * 1024;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export function cachedImageAbsolutePath(fileName: string): string {
  return path.join(path.resolve(CACHE_DIR), fileName);
}

export async function cacheImage(
  itemId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;

    await mkdir(path.resolve(CACHE_DIR), { recursive: true });
    const fileName = `${itemId}.${ext}`;
    await writeFile(cachedImageAbsolutePath(fileName), buffer);
    return fileName;
  } catch {
    return null;
  }
}

export async function deleteCachedImage(fileName: string): Promise<void> {
  try {
    await unlink(cachedImageAbsolutePath(fileName));
  } catch {
    // already gone
  }
}
