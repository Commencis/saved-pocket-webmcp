"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SearchBar({
  onSearch,
  inputRef: externalRef,
}: {
  onSearch: (q: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [value, setValue] = useState("");
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div data-tour="search-bar" className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search saved items… (press / to focus)"
        className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
      />
    </div>
  );
}
