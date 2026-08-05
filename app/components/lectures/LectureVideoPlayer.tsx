"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

interface LectureVideoPlayerProps {
  lectureId: string;
  src:       string;
  poster?:   string;
}

/**
 * Wraps the native <video> element with two things students expect from a
 * real course platform:
 *
 *  1. Resume — reopening a lecture jumps back to where they left off,
 *     instead of always starting at 0:00.
 *  2. Autosave — watch position is saved periodically (and on pause), so
 *     progress survives closing the tab mid-video, not just on completion.
 */
export function LectureVideoPlayer({ lectureId, src, poster }: LectureVideoPlayerProps) {
  const { data: session } = useSession();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const savedRef   = useRef(0);      // last watchedSeconds we've saved to the API
  const [resumeBanner, setResumeBanner] = useState<number | null>(null);

  // Look up existing progress once, so we know where to resume from
  useEffect(() => {
    if (!session) return;
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => {
        const seconds: number = d?.data?.watchedSeconds ?? 0;
        if (seconds > 5) {
          savedRef.current = seconds;
          setResumeBanner(seconds);
        }
      })
      .catch(() => {});
  }, [lectureId, session]);

  const saveProgress = (seconds: number) => {
    if (!session) return;
    const rounded = Math.floor(seconds);
    // Only bother the network every ~10s of actual playback
    if (Math.abs(rounded - savedRef.current) < 10) return;
    savedRef.current = rounded;
    void fetch("/api/progress", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ lectureId, watchedSeconds: rounded }),
    }).catch(() => {});
  };

  return (
    <div className="relative">
      {resumeBanner !== null && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (v) { v.currentTime = resumeBanner; void v.play(); }
            setResumeBanner(null);
          }}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/85 transition-colors"
        >
          Resume from {Math.floor(resumeBanner / 60)}:{String(resumeBanner % 60).padStart(2, "0")}
        </button>
      )}
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full aspect-video"
        poster={poster}
        preload="metadata"
        onTimeUpdate={(e) => saveProgress(e.currentTarget.currentTime)}
        onPause={(e) => saveProgress(e.currentTarget.currentTime)}
      />
    </div>
  );
}
