import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
}

// Base shimmer skeleton block
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("rounded-lg bg-ink-800/60 shimmer", className)} />;
}

// Pre-built skeletons for each content type
export function LectureCardSkeleton() {
  return (
    <div className="glass-card gold-border rounded-2xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/5" />
        </div>
      </div>
    </div>
  );
}

export function ScholarCardSkeleton() {
  return (
    <div className="glass-card gold-border rounded-2xl p-6 text-center space-y-3">
      <div className="flex justify-center">
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/3 mx-auto" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5 mx-auto" />
      <div className="flex gap-1.5 justify-center flex-wrap pt-1">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="glass-card gold-border rounded-2xl p-8 space-y-6">
      <div className="flex items-start gap-6">
        <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-white/5">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
