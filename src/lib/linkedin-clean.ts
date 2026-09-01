const NOISE_PATTERNS: RegExp[] = [
  /status is (?:reachable|offline)/gi,
  /visible to anyone on or off linkedin/gi,
  /\b\d+(?:[.,]\d+)?[KMB]?\s+followers?\b/gi,
  /\b\d+(?:[.,]\d+)?[KMB]?\s+connections?\b/gi,
  /\b(?:1st|2nd|3rd\+?)\s*(?:degree)?\s*(?:connection)?\s*•?/gi,
  /•\s*(?:1st|2nd|3rd\+?)\b/gi,
  /\b\d+\s*(?:mo|w|d|h|yr|min)s?\b\s*•?/gi,
  /\bedited\b\s*•?/gi,
  /(?:…|\.\.\.)\s*(?:see\s*)?more/gi,
  /\bsee more\b/gi,
  /\bshow more\b/gi,
  /\bpromoted\b\s*•?/gi,
];

export function cleanLinkedInText(text: string): string {
  let cleaned = text;
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned
    .replace(/\s*•\s*(?=•|\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s•·|,-]+/, "")
    .replace(/[\s•·|,-]+$/, "")
    .trim();
}

export function deriveLinkedInTitle(
  title: string | null | undefined,
  description: string | null | undefined,
): string | null {
  const source = cleanLinkedInText(title ?? "") || cleanLinkedInText(description ?? "");
  if (!source) return null;
  if (source.length <= 140) return source;
  const cut = source.slice(0, 140);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : 140)}…`;
}
