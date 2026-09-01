"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface DigestData {
  savedThisWeek: number;
  savedPrevWeek: number;
  totalUnread: number;
  rediscover: { id: string; title: string | null; url: string }[];
  weekKey: string;
}

const DISMISSED_KEY = "savedpocket_digest_dismissed";

export function DigestCard() {
  const [data, setData] = useState<DigestData | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    void fetch("/api/digest")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DigestData | null) => {
        if (!d) return;
        setData(d);
        const stored = localStorage.getItem(DISMISSED_KEY);
        setDismissed(stored === d.weekKey);
      });
  }, []);

  function dismiss() {
    if (!data) return;
    localStorage.setItem(DISMISSED_KEY, data.weekKey);
    setDismissed(true);
  }

  if (dismissed || !data) return null;
  // Don't show if the user has nothing saved yet
  if (data.savedThisWeek === 0 && data.savedPrevWeek === 0) return null;

  const trend =
    data.savedPrevWeek === 0
      ? null
      : data.savedThisWeek > data.savedPrevWeek
        ? "up"
        : data.savedThisWeek < data.savedPrevWeek
          ? "down"
          : "same";

  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-neutral-700">
            Weekly digest
          </p>
          <p className="text-xs text-neutral-500">
            You saved{" "}
            <span className="font-medium text-neutral-800">
              {data.savedThisWeek}
            </span>{" "}
            item{data.savedThisWeek !== 1 ? "s" : ""} this week
            {trend === "up" && " — more than last week!"}
            {trend === "down" && " — less than last week."}
            {trend === "same" && " — same as last week."}
          </p>
          {data.totalUnread > 0 && (
            <p className="text-xs text-amber-600">
              {data.totalUnread} item{data.totalUnread !== 1 ? "s" : ""} saved
              but never opened — don&apos;t forget them!
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {data.rediscover.length > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="mb-1.5 text-xs font-medium text-neutral-400">
            Rediscover
          </p>
          <ul className="flex flex-col gap-1">
            {data.rediscover.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate rounded-lg px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  ↗ {item.title ?? item.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
