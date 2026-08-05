"use client";

import { useState } from "react";

export interface CourseDetailTab {
  id:      string;
  label:   string;
  count?:  number | null;
  content: React.ReactNode;
}

interface CourseDetailTabsProps {
  tabs: CourseDetailTab[];
}

/**
 * Udacity-style sticky sub-navigation: Overview / Syllabus / Instructor / Reviews.
 * Tabs render as a persistent strip beneath the hero; switching is client-side
 * (no navigation), matching the classic nanodegree program page pattern.
 */
export function CourseDetailTabs({ tabs }: CourseDetailTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      {/* Sticky tab strip */}
      <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-0 mb-8 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-sm">
        <div
          role="tablist"
          aria-label="Course details"
          className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-0"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={`relative flex-shrink-0 whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
                {typeof tab.count === "number" && (
                  <span className="ml-1.5 text-xs text-[var(--text-muted)] tabular-nums">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels — kept mounted (hidden) so anchor links / scroll position persist */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={tab.id}
          hidden={tab.id !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
