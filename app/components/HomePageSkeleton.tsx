import { LectureCardSkeleton, ScholarCardSkeleton } from "@/app/components/ui/Skeleton";

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen w-full">
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden py-20 sm:py-28 md:py-36 w-full">
        <div className="absolute inset-0 pattern-overlay opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-ink-950 to-transparent pointer-events-none" />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/20 bg-gold-500/5 mb-8">
            <div className="w-16 h-3 bg-gold-500/20 rounded animate-pulse" />
          </div>

          <div className="w-96 h-8 bg-white/10 rounded mb-6 animate-pulse" />

          <div className="w-[600px] h-16 bg-white/10 rounded mb-6 animate-pulse" />

          <div className="w-[400px] h-4 bg-white/5 rounded mb-10 animate-pulse" />

          <div className="w-full max-w-lg mb-8">
            <div className="w-full h-12 bg-ink-800/80 border border-white/10 rounded-xl animate-pulse" />
          </div>

          <div className="flex gap-3">
            <div className="w-32 h-12 bg-gold-600/50 rounded-xl animate-pulse" />
            <div className="w-32 h-12 bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section Skeleton */}
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 sm:p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="w-6 h-6 bg-gold-400/50 rounded animate-pulse" />
              <div className="w-16 h-8 bg-white/20 rounded animate-pulse" />
              <div className="w-12 h-3 bg-ink-400/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>

      {/* Featured Lectures Skeleton */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="w-32 h-3 bg-gold-400/20 rounded mb-1.5 animate-pulse" />
            <div className="w-48 h-8 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="w-16 h-4 bg-gold-400/20 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <LectureCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Latest Lectures Skeleton */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="w-24 h-3 bg-gold-400/20 rounded mb-1.5 animate-pulse" />
            <div className="w-40 h-8 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="w-16 h-4 bg-gold-400/20 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <LectureCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Featured Scholars Skeleton */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-white/5">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="w-36 h-3 bg-gold-400/20 rounded mb-1.5 animate-pulse" />
            <div className="w-48 h-8 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="w-20 h-4 bg-gold-400/20 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <ScholarCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* CTA Banner Skeleton */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="relative rounded-3xl overflow-hidden border border-gold-500/20 bg-gradient-to-br from-gold-900/20 via-ink-900 to-ink-900">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold-500/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 pattern-overlay opacity-20" />
          <div className="relative px-6 py-14 sm:py-20 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gold-500/10 border border-gold-500/20 rounded-2xl mb-6 animate-pulse" />
            <div className="w-80 h-10 bg-white/20 rounded mb-4 animate-pulse" />
            <div className="w-96 h-4 bg-ink-300/50 rounded mb-8 animate-pulse" />
            <div className="flex gap-3">
              <div className="w-40 h-12 bg-gold-600/50 rounded-xl animate-pulse" />
              <div className="w-36 h-12 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}