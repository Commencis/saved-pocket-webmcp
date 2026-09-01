export interface ItemDto {
  id: string;
  platform: string;
  externalId: string | null;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  localImagePath: string | null;
  categoryId: number | null;
  categoryName?: string | null;
  tags: string[];
  userTags: string[];
  notes: string | null;
  summary: string | null;
  analysisStatus: string;
  analysisError: string | null;
  analysisTokensIn: number | null;
  analysisTokensOut: number | null;
  imageAnalysisTokensIn: number | null;
  imageAnalysisTokensOut: number | null;
  visitCount: number;
  lastVisitedAt: string | null;
  linkStatus?: string | null;
  linkCheckedAt?: string | null;
  savedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most_visited", label: "Most visited" },
  { value: "recently_visited", label: "Recently visited" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface CategoryDto {
  id: number;
  name: string;
  isSeeded: boolean;
  itemCount: number;
}

export interface CollectionDto {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  visibility: "private" | "link_only" | "public";
  forkable: boolean;
  itemCount: number;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCounts {
  pending?: number;
  processing?: number;
  failed?: number;
  done?: number;
}

export const PLATFORMS = [
  "instagram",
  "linkedin",
  "reddit",
  "x",
  "youtube",
  "web",
  "whatsapp",
] as const;

export const PLATFORM_STYLES: Record<string, { label: string; className: string }> = {
  instagram: { label: "Instagram", className: "bg-pink-100 text-pink-700" },
  linkedin: { label: "LinkedIn", className: "bg-sky-100 text-sky-700" },
  reddit: { label: "Reddit", className: "bg-orange-100 text-orange-700" },
  x: { label: "X", className: "bg-neutral-200 text-neutral-800" },
  youtube: { label: "YouTube", className: "bg-red-100 text-red-700" },
  web: { label: "Web", className: "bg-emerald-100 text-emerald-700" },
  whatsapp: { label: "WhatsApp", className: "bg-green-100 text-green-700" },
};
