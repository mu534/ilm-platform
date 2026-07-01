import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prism";
import type { LectureWhereInput } from "../../../generated/prisma/models/Lecture";
import { LectureType } from "../../../generated/prisma/enums";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";
  const scholar = searchParams.get("scholar") || "all";

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Build where clause using the generated Prisma type directly
    const where: LectureWhereInput = {
      published: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: [query] } },
      ],
    };

    // Add type filter — cast through the generated enum
    if (type !== "all" && (type === "TEXT" || type === "VIDEO")) {
      where.type = LectureType[type];
    }

    // Add scholar filter
    if (scholar !== "all") {
      where.scholarId = scholar;
    }

    const lectures = await prisma.lecture.findMany({
      where,
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        scholar: {
          select: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    const response = NextResponse.json(lectures);
    // Cache for 5 minutes, serve stale for 10 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    return response;
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
