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
    const q    = quality ?? 75;
    const xfm  = `w_${width},q_${q},f_auto,c_limit`;

    // If transformations already applied (re-optimisation guard), return as-is
    if (src.includes("/upload/w_")) return src;

    return src.replace("/upload/", `/upload/${xfm}/`);
  }

  // ── All other remote images (Google, GitHub avatars, etc.) ────────────────
  // Encode for Next.js built-in image optimiser
  const params = new URLSearchParams({
    url: src,
    w:   String(width),
    q:   String(quality ?? 75),
  });
  return `/_next/image?${params.toString()}`;
}
