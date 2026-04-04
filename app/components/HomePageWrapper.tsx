"use client";

import { Suspense } from "react";
import { HomePageSkeleton } from "./HomePageSkeleton";

interface HomePageWrapperProps {
  children: React.ReactNode;
}

export function HomePageWrapper({ children }: HomePageWrapperProps) {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      {children}
    </Suspense>
  );
}