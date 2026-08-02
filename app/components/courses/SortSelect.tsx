"use client";

interface SortSelectProps {
  value:   string;
  options: { value: string; label: string }[];
  buildUrl: (sort: string) => string;
}

export function SortSelect({ value, options, buildUrl }: SortSelectProps) {
  return (
    <select
      defaultValue={value}
      onChange={(e) => { window.location.href = buildUrl(e.target.value); }}
      className="text-xs py-1.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
      aria-label="Sort courses"
    >
      {options.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
