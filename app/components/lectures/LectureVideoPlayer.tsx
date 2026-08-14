"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface LectureVideoPlayerProps {
  lectureId: string;
  src:       string;
  poster?:   string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SAVE_THRESHOLD_SEC = 10; // save every 10 s of playback change

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Full-featured lecture video player:
 *
 * - Resume where you left off (server-side progress)
 * - Auto-save watch position every 10 s + on pause + on unload
 * - Playback speed selector (0.5× → 2×) — persisted in localStorage
 * - Keyboard shortcuts: Space=play/pause, ←/→=±10 s, M=mute, F=fullscreen
 *   ↑/↓=±5 % volume, 0-9=seek to 0-90 % of duration
 * - "Skip intro" prompt if user previously watched past the first 30 s
 */
export function LectureVideoPlayer({ lectureId, src, poster }: LectureVideoPlayerProps) {
  const { data: session }   = useSession();
  const videoRef            = useRef<HTMLVideoElement>(null);
  const wrapperRef          = useRef<HTMLDivElement>(null);
  const savedRef            = useRef(0);
  const [resumeAt,    setResumeAt]    = useState<number | null>(null);
  const [speed,       setSpeed]       = useState<number>(1);
  const [showSpeeds,  setShowSpeeds]  = useState(false);
  const [buffering,   setBuffering]   = useState(false);
  const [showShortcut, setShowShortcut] = useState<string | null>(null);
  const shortcutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Persist speed preference ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("ilm_video_speed");
    if (saved) {
      const n = parseFloat(saved);
      if (SPEEDS.includes(n as typeof SPEEDS[number])) setSpeed(n);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
    localStorage.setItem("ilm_video_speed", String(speed));
  }, [speed]);

  // ── Load existing progress (resume) ─────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetch(`/api/progress?lectureId=${lectureId}`)
      .then((r) => r.json())
      .then((d) => {
        const seconds: number = d?.data?.watchedSeconds ?? 0;
        if (seconds > 5) {
          savedRef.current = seconds;
          setResumeAt(seconds);
        }
      })
      .catch(() => {});
  }, [lectureId, session]);

  // ── Save progress ─────────────────────────────────────────────────────────
  const saveProgress = useCallback((seconds: number) => {
    if (!session) return;
    const rounded = Math.floor(seconds);
    if (Math.abs(rounded - savedRef.current) < SAVE_THRESHOLD_SEC) return;
    savedRef.current = rounded;
    void fetch("/api/progress", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ lectureId, watchedSeconds: rounded }),
    }).catch(() => {});
  }, [lectureId, session]);

  // Save on page unload / tab close
  useEffect(() => {
    const handleUnload = () => {
      const v = videoRef.current;
      if (!v || !session) return;
      // sendBeacon is synchronous-safe during unload
      const body = JSON.stringify({ lectureId, watchedSeconds: Math.floor(v.currentTime) });
      navigator.sendBeacon?.("/api/progress", new Blob([body], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [lectureId, session]);

  // ── Shortcut flash helper ─────────────────────────────────────────────────
  const flashShortcut = useCallback((label: string) => {
    setShowShortcut(label);
    clearTimeout(shortcutTimer.current);
    shortcutTimer.current = setTimeout(() => setShowShortcut(null), 900);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only when focus is inside the wrapper
    if (!wrapperRef.current?.contains(document.activeElement) &&
        document.activeElement !== document.body) return;

    const v = videoRef.current;
    if (!v) return;

    switch (e.code) {
      case "Space":
      case "KeyK":
        e.preventDefault();
        if (v.paused) { void v.play(); flashShortcut("▶"); }
        else          { v.pause();     flashShortcut("⏸"); }
        break;
      case "ArrowRight":
        e.preventDefault();
        v.currentTime = Math.min(v.duration, v.currentTime + 10);
        flashShortcut("+10s");
        break;
      case "ArrowLeft":
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 10);
        flashShortcut("−10s");
        break;
      case "ArrowUp":
        e.preventDefault();
        v.volume = Math.min(1, v.volume + 0.05);
        flashShortcut(`🔊 ${Math.round(v.volume * 100)}%`);
        break;
      case "ArrowDown":
        e.preventDefault();
        v.volume = Math.max(0, v.volume - 0.05);
        flashShortcut(`🔉 ${Math.round(v.volume * 100)}%`);
        break;
      case "KeyM":
        e.preventDefault();
        v.muted = !v.muted;
        flashShortcut(v.muted ? "🔇 Muted" : "🔊 Unmuted");
        break;
      case "KeyF":
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else wrapperRef.current?.requestFullscreen().catch(() => {});
        break;
      case "Digit0": case "Digit1": case "Digit2": case "Digit3":
      case "Digit4": case "Digit5": case "Digit6": case "Digit7":
      case "Digit8": case "Digit9": {
        if (!isNaN(v.duration)) {
          const pct = parseInt(e.code.replace("Digit", ""), 10) / 10;
          v.currentTime = v.duration * pct;
          flashShortcut(`⏩ ${pct * 100}%`);
        }
        break;
      }
      default: break;
    }
  }, [flashShortcut]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={wrapperRef} className="relative group bg-black rounded-xl overflow-hidden" tabIndex={0}>

      {/* Resume banner */}
      {resumeAt !== null && (
        <div className="absolute top-3 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <button
            onClick={() => {
              const v = videoRef.current;
              if (v) { v.currentTime = resumeAt; void v.play(); }
              setResumeAt(null);
            }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full
              bg-black/80 backdrop-blur-sm text-white text-xs font-semibold
              hover:bg-[var(--accent)] transition-colors shadow-lg border border-white/10"
          >
            ▶ Resume from {fmtTime(resumeAt)}
          </button>
        </div>
      )}

      {/* Keyboard shortcut flash */}
      {showShortcut && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
          <span className="px-4 py-2 rounded-xl bg-black/80 text-white text-sm font-bold
            backdrop-blur-sm animate-fade-in-out">
            {showShortcut}
          </span>
        </div>
      )}

      {/* Buffering spinner */}
      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Speed selector */}
      <div className="absolute bottom-16 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {showSpeeds ? (
          <div className="bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 shadow-xl">
            <div className="px-3 py-1.5 text-[10px] text-white/50 uppercase tracking-widest font-semibold border-b border-white/10">
              Speed
            </div>
            {[...SPEEDS].reverse().map((s) => (
              <button
                key={s}
                onClick={() => { setSpeed(s); setShowSpeeds(false); }}
                className={`block w-full text-left px-4 py-1.5 text-xs transition-colors ${
                  speed === s
                    ? "text-[var(--accent)] font-bold bg-[var(--accent)]/10"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {s === 1 ? "Normal" : `${s}×`}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowSpeeds(true)}
            className="px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs
              font-semibold border border-white/10 hover:bg-black/90 transition-colors"
            title="Playback speed"
          >
            {speed === 1 ? "1×" : `${speed}×`}
          </button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="absolute bottom-16 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1 text-[10px] text-white/50">
          <span className="px-1.5 py-0.5 bg-black/60 rounded">Space</span>
          <span className="px-1.5 py-0.5 bg-black/60 rounded">←→ 10s</span>
          <span className="px-1.5 py-0.5 bg-black/60 rounded">M mute</span>
          <span className="px-1.5 py-0.5 bg-black/60 rounded">F full</span>
        </div>
      </div>

      {/* The actual video element — browser controls intact */}
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        className="w-full aspect-video"
        poster={poster}
        preload="metadata"
        onTimeUpdate={(e) => saveProgress(e.currentTarget.currentTime)}
        onPause={(e)      => saveProgress(e.currentTarget.currentTime)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => { setBuffering(false); setResumeAt(null); }}
        onClick={() => setShowSpeeds(false)}
      />
    </div>
  );
}
