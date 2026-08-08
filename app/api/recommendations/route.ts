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
    console.error("Recommendation API error:", error);
    return NextResponse.json({ error: "Unable to load recommendations" }, { status: 500 });
  }
}
