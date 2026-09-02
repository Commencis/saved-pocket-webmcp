"use client";

import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  label: string;
}

export function DocsToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; text: string; context: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-60px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // Full-page text search across all headings + paragraphs
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { setResults([]); return; }

    const found: { id: string; text: string; context: string }[] = [];
    const seen = new Set<string>();

    // Walk every heading (h2/h3) on the page, search surrounding text
    document.querySelectorAll<HTMLElement>("h2[id], h3[id]").forEach((heading) => {
      const id = heading.id;
      const headingText = heading.textContent ?? "";

      // Collect text from this heading's section (until next same/higher-level heading)
      let sectionText = headingText;
      let el = heading.nextElementSibling;
      while (el && !el.matches("h2, h3")) {
        sectionText += " " + (el.textContent ?? "");
        el = el.nextElementSibling;
      }

      if (sectionText.toLowerCase().includes(q) && !seen.has(id)) {
        seen.add(id);
        // Build a short context snippet around the match
        const lower = sectionText.toLowerCase();
        const idx = lower.indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(sectionText.length, idx + q.length + 60);
        const snippet = (start > 0 ? "…" : "") + sectionText.slice(start, end).trim() + (end < sectionText.length ? "…" : "");

        // Find the TOC label for this id, fallback to heading text
        const tocItem = items.find((i) => i.id === id);
        found.push({
          id,
          text: tocItem?.label.replace("↳ ", "") ?? headingText,
          context: snippet,
        });
      }
    });

    setResults(found.slice(0, 8));
  }, [query, items]);

  const filteredToc = query.trim().length < 2
    ? items
    : items.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase())
      );

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
    setQuery("");
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Full-content search results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-sm">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => jumpTo(r.id)}
              className="group flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100"
            >
              <span className="text-xs font-medium text-neutral-800">{r.text}</span>
              <span className="line-clamp-2 text-[11px] leading-relaxed text-neutral-400">{r.context}</span>
            </button>
          ))}
        </div>
      )}

      {/* TOC list */}
      {query.trim().length < 2 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            On this page
          </p>
          <nav className="flex flex-col gap-0.5">
            {filteredToc.map((item) => {
              const isActive = activeId === item.id;
              const isChild = item.label.startsWith("↳");
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={[
                    "rounded-md px-2 py-1 text-sm transition-colors",
                    isChild ? "pl-4" : "",
                    isActive
                      ? "bg-neutral-900 font-medium text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                  ].join(" ")}
                >
                  {isChild ? item.label.replace("↳ ", "") : item.label}
                </a>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
