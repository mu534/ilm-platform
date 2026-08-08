import type { MetadataRoute } from "next";
import { prisma } from "./lib/prism";
import { publicCourseWhere } from "./lib/courseAccess";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://ilm-platform.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,              lastModified: new Date(), changeFrequency: "daily",  priority: 1.0 },
    { url: `${baseUrl}/courses`, lastModified: new Date(), changeFrequency: "daily",  priority: 0.9 },
    { url: `${baseUrl}/lectures`,lastModified: new Date(), changeFrequency: "daily",  priority: 0.9 },
    { url: `${baseUrl}/scholars`,lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/login`,   lastModified: new Date(), changeFrequency: "monthly",priority: 0.3 },
    { url: `${baseUrl}/register`,lastModified: new Date(), changeFrequency: "monthly",priority: 0.4 },
  ];

  // Dynamic: published lectures (standalone or under a public course)
  const lectures = await prisma.lecture.findMany({
    where: {
      published: true,
      OR: [
        { moduleId: null },
        { module: { course: { ...publicCourseWhere } } },
      ],
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const lectureRoutes: MetadataRoute.Sitemap = lectures.map((l) => ({
    url:             `${baseUrl}/lectures/${l.slug}`,
    lastModified:    l.updatedAt,
    changeFrequency: "weekly" as const,
    priority:        0.7,
  }));

  // Dynamic: publicly accessible courses only
  const courses = await prisma.course.findMany({
    where: { ...publicCourseWhere },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const courseRoutes: MetadataRoute.Sitemap = courses.map((c) => ({
    url:             `${baseUrl}/courses/${c.slug}`,
    lastModified:    c.updatedAt,
    changeFrequency: "weekly" as const,
    priority:        0.8,
  }));

  // Dynamic: scholars
  const scholars = await prisma.scholar.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const scholarRoutes: MetadataRoute.Sitemap = scholars.map((s) => ({
    url:             `${baseUrl}/scholars/${s.id}`,
    lastModified:    s.updatedAt,
    changeFrequency: "weekly" as const,
    priority:        0.6,
  }));

  return [...staticRoutes, ...lectureRoutes, ...courseRoutes, ...scholarRoutes];
}
