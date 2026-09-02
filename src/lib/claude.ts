import OpenAI from "openai";
import { z } from "zod";

const DEFAULT_MODEL = "gpt-4o-mini";

export function getServerAiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function resolveModel(userModel?: string | null): string {
  return userModel?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
}

export interface AiCredentials {
  apiKey: string;
  model?: string | null;
}

/** Validate key by listing models — no cost, fast. Throws on bad key/model. */
export async function verifyAiCredentials(creds: AiCredentials): Promise<void> {
  const openai = new OpenAI({ apiKey: creds.apiKey });
  const model = resolveModel(creds.model);
  // Cheapest validation: list models and confirm the requested model exists
  const list = await openai.models.list();
  if (creds.model && !list.data.some((m) => m.id === model)) {
    throw Object.assign(new Error(`Model not found: ${model}`), { status: 404 });
  }
}

const SYSTEM_PROMPT = `You are the content analyst for SavedPocket, a personal bookmarking app that unifies posts a user has saved across Instagram, LinkedIn, X (Twitter), YouTube, and the open web. Your job: given whatever metadata is available for one saved item, assign it a category, a set of tags, and a short summary by calling the save_analysis function. You must ALWAYS call the function exactly once, even when metadata is sparse.

## Category rules
- You will receive the user's current category list in the message. STRONGLY prefer an existing category: pick the closest reasonable match rather than inventing a near-duplicate (e.g. do not create "Software" when "Programming" exists, or "Cooking" when "Food" exists).
- Only set is_new_category to true when the item clearly belongs to a recurring theme that no existing category covers even loosely. New category names must be short (1-2 words), Title Case, and broad enough to hold many future items.
- If you genuinely cannot tell what the item is about, use the "Other" category. Never invent a new category for an ambiguous item.

## Tag rules
- Produce 3 to 6 tags: lowercase, single words or short hyphenated phrases (e.g. "machine-learning", "meal-prep", "interview-tips").
- Tags should be more specific than the category and useful for search. Avoid generic filler like "interesting", "post", "video", "content".
- Do not repeat the category name verbatim as a tag unless it truly adds search value.

## Summary rules
- 1-2 plain sentences describing what the item is and why someone might have saved it.
- Be factual and concrete; no marketing tone, no "this fascinating post...". Write in English.
- If metadata is sparse, describe what can be inferred and keep it short rather than speculating wildly.

## Sparse metadata
- Sometimes you only get a URL (login-walled pages). Infer what you can from the domain, path segments, slugs, and platform conventions (e.g. an instagram.com/reel/ URL is a short video). Be conservative: prefer "Other" and generic tags over confident guesses.
- Platform alone is NOT a category signal: an Instagram post can be about finance, a LinkedIn post about cooking. Categorize by content, not source.

## Quality bar
- Category must reflect the primary topic of the content itself.
- When the title is clickbait, look at the description for the real topic.
- Non-English content: still produce English category/tags/summary describing it.`;

const saveAnalysisTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "save_analysis",
    description:
      "Save the categorization result for one saved item. Must be called exactly once per item.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Category name. Prefer one from the provided existing list.",
        },
        is_new_category: {
          type: "boolean",
          description:
            "True only if the category is not in the provided list and a new one is clearly warranted.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "3-6 lowercase tags, hyphenated phrases allowed.",
        },
        summary: {
          type: "string",
          description: "1-2 sentence factual summary of the item.",
        },
      },
      required: ["category", "is_new_category", "tags", "summary"],
    },
  },
};

const analysisSchema = z.object({
  category: z.string().min(1).max(60),
  is_new_category: z.boolean(),
  tags: z.array(z.string().min(1).max(40)).min(1).max(10),
  summary: z.string().min(1).max(1000),
});

export interface AnalysisResult {
  category: string;
  isNewCategory: boolean;
  tags: string[];
  summary: string;
  tokensIn: number;
  tokensOut: number;
}

export interface ImageSource {
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export interface AnalyzableItem {
  url: string;
  platform: string;
  title: string | null;
  description: string | null;
}

export async function analyzeItem(
  item: AnalyzableItem,
  existingCategories: string[],
  creds: AiCredentials,
): Promise<AnalysisResult> {
  const openai = new OpenAI({ apiKey: creds.apiKey });
  const categoryGuidance =
    existingCategories.length >= 40
      ? "The category list is already large — you MUST pick an existing category, do not create new ones."
      : "Prefer an existing category; only create a new one when clearly warranted.";

  const userMessage = [
    `URL: ${item.url}`,
    `Platform: ${item.platform}`,
    `Title: ${item.title ?? "(none)"}`,
    `Description: ${item.description ? item.description.slice(0, 2000) : "(none)"}`,
    "",
    `Existing categories (${existingCategories.length}): ${existingCategories.join(", ")}`,
    categoryGuidance,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: resolveModel(creds.model),
    max_tokens: 600,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    tools: [saveAnalysisTool],
    tool_choice: { type: "function", function: { name: "save_analysis" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Model did not return a tool call");

  const parsed = analysisSchema.parse(JSON.parse(toolCall.function.arguments));
  return {
    category: parsed.category.trim(),
    isNewCategory: parsed.is_new_category,
    tags: [...new Set(parsed.tags.map((t) => t.trim().toLowerCase()))].filter(Boolean),
    summary: parsed.summary.trim(),
    tokensIn: response.usage?.prompt_tokens ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
  };
}

export async function analyzeItemWithImage(
  item: AnalyzableItem,
  image: ImageSource,
  existingCategories: string[],
  creds: AiCredentials,
): Promise<AnalysisResult> {
  const openai = new OpenAI({ apiKey: creds.apiKey });
  const categoryGuidance =
    existingCategories.length >= 40
      ? "The category list is already large — you MUST pick an existing category, do not create new ones."
      : "Prefer an existing category; only create a new one when clearly warranted.";

  const textContent = [
    `URL: ${item.url}`,
    `Platform: ${item.platform}`,
    `Title: ${item.title ?? "(none)"}`,
    `Description: ${item.description ? item.description.slice(0, 2000) : "(none)"}`,
    "",
    `Existing categories (${existingCategories.length}): ${existingCategories.join(", ")}`,
    categoryGuidance,
    "",
    "An image of this item is provided above. Use the visual content to enrich your categorization if it reveals information not present in the text metadata.",
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: resolveModel(creds.model) === DEFAULT_MODEL ? "gpt-4o" : resolveModel(creds.model),
    max_tokens: 600,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${image.mediaType};base64,${image.data}` },
          },
          { type: "text", text: textContent },
        ],
      },
    ],
    tools: [saveAnalysisTool],
    tool_choice: { type: "function", function: { name: "save_analysis" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Model did not return a tool call");

  const parsed = analysisSchema.parse(JSON.parse(toolCall.function.arguments));
  return {
    category: parsed.category.trim(),
    isNewCategory: parsed.is_new_category,
    tags: [...new Set(parsed.tags.map((t) => t.trim().toLowerCase()))].filter(Boolean),
    summary: parsed.summary.trim(),
    tokensIn: response.usage?.prompt_tokens ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
  };
}
