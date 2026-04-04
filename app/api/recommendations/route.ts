import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prism";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const recommendations = await prisma.lecture.findMany({
      where: {
        published: true,
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
