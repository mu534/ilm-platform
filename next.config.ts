import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  images: {
    // Use our custom Cloudinary loader so images are optimised by Cloudinary directly
    // instead of being proxied through Next.js /_next/image (which causes timeout errors)
    loader:     "custom",
    loaderFile: "./app/lib/imageLoader.ts",

    // Keep remotePatterns as a fallback for non-Cloudinary images rendered with
    // the default loader (e.g. Google avatar images)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],

    // Supported widths — keep in sync with Tailwind breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 48, 64, 96, 128, 256],

    // Long cache TTL — Cloudinary images are content-addressed (versioned)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Increase serverless function timeout for image routes in production
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
