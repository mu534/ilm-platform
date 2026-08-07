/**
 * Custom Next.js image loader.
 *
 * For Cloudinary URLs: applies Cloudinary transformation parameters directly,
 * bypassing the Next.js /_next/image proxy entirely. This eliminates timeout
 * errors on cold starts and reduces origin latency.
 *
 * For all other URLs: falls back to the default Next.js behaviour
 * (passes through /_next/image for optimization).
 *
 * Configured as the global loader in next.config.ts.
 */

import type { ImageLoaderProps } from "next/image";

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // ── Cloudinary ────────────────────────────────────────────────────────────
  if (src.includes("res.cloudinary.com")) {
    const q = quality ?? 90;             // high quality default

    // Already has transformations applied — return as-is to avoid double-transform
    if (src.includes("/upload/w_") || src.includes("/upload/f_")) return src;

    // f_auto  = serve WebP/AVIF automatically based on browser support
    // q_auto  = Cloudinary's perceptual quality optimiser (better than fixed q)
    // w_{n}   = resize to requested width
    // c_limit = never upscale; shrink only (preserves quality on small displays)
    const xfm = `w_${width},q_${q},f_auto,c_limit`;

    return src.replace("/upload/", `/upload/${xfm}/`);
  }

  // ── All other remote images (Google, GitHub avatars, etc.) ────────────────
  const params = new URLSearchParams({
    url: src,
    w:   String(width),
    q:   String(quality ?? 90),
  });
  return `/_next/image?${params.toString()}`;
}
