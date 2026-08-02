"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest",    label: "Newest"      },
  { value: "popular",   label: "Most Popular" },
  { value: "top-rated", label: "Top Rated"   },
  { value: "oldest",    label: "Oldest"      },
];

function SortSelectInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const current      = searchParams.get("sort") ?? "newest";

  const handleChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.set("page", "1");
    router.push(`/courses?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
      aria-label="Sort courses"
    >
      {SORT_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

export function SortSelect() {
  return (
    <Suspense fallback={null}>
      <SortSelectInner />
    </Suspense>
  );
}
