import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prism";
import { publicCourseWhere } from "@/app/lib/courseAccess";
import { getOptionalUser } from "@/app/lib/authorization";

export async function GET() {
  const user = await getOptionalUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const recommendations = await prisma.lecture.findMany({
      where: {
        published:      true,
        approvalStatus: "APPROVED",
        OR: [
          { moduleId: null },
          { module: { course: { ...publicCourseWhere } } },
        ],
      },
      take: 4,
      orderBy: [
        { views: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        scholar: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      recommendations.map((lecture) => ({
        id: lecture.id,
        title: lecture.title,
        slug: lecture.slug,
        description: lecture.description,
        type: lecture.type,
        scholarName: lecture.scholar?.user.name ?? null,
      })),
    );
  } catch (error) {
    // This route returns a bare array on success (consumed directly as a
    // list), so it intentionally doesn't switch to the {success,data}
    // envelope other routes use — but it still needs to log server-side
    // instead of silently swallowing the cause, same as everywhere else.
    console.error("[API Error] GET /api/recommendations", error);
    return NextResponse.json({ error: "Unable to load recommendations" }, { status: 500 });
  }
}
