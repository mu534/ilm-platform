import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://ilm-platform.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow:    ["/", "/courses", "/lectures", "/scholars", "/forum", "/activity"],
        disallow: ["/admin", "/api", "/dashboard", "/profile"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
