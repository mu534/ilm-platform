import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prism";
import { publicCourseWhere } from "@/app/lib/courseAccess";
import type { LectureWhereInput } from "../../../generated/prisma/models/Lecture";
import { LectureType } from "../../../generated/prisma/enums";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query    = searchParams.get("q") ?? "";
  const type     = searchParams.get("type") ?? "all";       // "all" | "lectures" | "courses" | "scholars"
  const lectType = searchParams.get("lectureType") ?? "all"; // TEXT | VIDEO
  const scholar  = searchParams.get("scholar") ?? "all";
  const category = searchParams.get("category") ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json({ lectures: [], courses: [], scholars: [] });
  }

  try {
    const results: {
      lectures: unknown[];
      courses:  unknown[];
      scholars: unknown[];
    } = { lectures: [], courses: [], scholars: [] };

    // ── Lectures ─────────────────────────────────────────────────────────────
    if (type === "all" || type === "lectures") {
      const where: LectureWhereInput = {
        published:      true,
        approvalStatus: "APPROVED",
        OR: [
          // Course-linked lectures must belong to a public course
          {
            AND: [
              { module: { course: { ...publicCourseWhere } } },
              {
                OR: [
                  { title:       { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { tags:        { hasSome:  [query] } },
                ],
              },
            ],
          },
          // Standalone published+approved lectures (no module)
          {
            AND: [
              { moduleId: null },
              {
                OR: [
                  { title:       { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { tags:        { hasSome:  [query] } },
                ],
              },
            ],
          },
        ],
      };
      if (lectType !== "all" && (lectType === "TEXT" || lectType === "VIDEO" || lectType === "AUDIO" || lectType === "PDF")) {
        where.type = LectureType[lectType as keyof typeof LectureType];
      }
      if (scholar !== "all") where.scholarId = scholar;
      if (category)          where.categoryId = category;

      results.lectures = await prisma.lecture.findMany({
        where,
        take: 8,
        orderBy: { views: "desc" },
        select: {
          id: true, title: true, slug: true, description: true, type: true,
          thumbnailUrl: true, views: true,
          scholar: { select: { user: { select: { name: true } } } },
          category: { select: { name: true, icon: true } },
        },
      });
    }

    // ── Courses ───────────────────────────────────────────────────────────────
    if (type === "all" || type === "courses") {
      results.courses = await prisma.course.findMany({
        where: {
          ...publicCourseWhere,
          OR: [
            { title:       { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
          ...(category ? { categoryId: category } : {}),
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, slug: true, description: true,
          thumbnailUrl: true, difficulty: true,
          category: { select: { name: true, icon: true } },
          _count: { select: { enrollments: true } },
        },
      });
    }

    // ── Scholars ──────────────────────────────────────────────────────────────
    if (type === "all" || type === "scholars") {
      results.scholars = await prisma.scholar.findMany({
        where: {
          OR: [
            { user:   { name: { contains: query, mode: "insensitive" } } },
            { bio:    { contains: query, mode: "insensitive" } },
            { topics: { hasSome: [query] } },
          ],
        },
        take: 4,
        select: {
          id: true, photo: true, verified: true, topics: true,
          user:   { select: { name: true, image: true } },
          _count: { select: { lectures: true } },
        },
      });
    }

    const response = NextResponse.json({ success: true, data: results });
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
  }
}
