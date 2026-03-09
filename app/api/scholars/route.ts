import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { scholarSchema } from "../../lib/validations";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";
import type { SessionUser } from "../../types/next-auth";

interface ScholarWhereInput {
  featured?: boolean;
  topics?: { has: string };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get("featured") === "true";
    const topic = searchParams.get("topic") ?? "";

    const where: ScholarWhereInput = {};
    if (featured) where.featured = true;
    if (topic) where.topics = { has: topic };

    const scholars = await prisma.scholar.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, image: true } },
        _count: { select: { lectures: true } },
      },
    });

    return successResponse(scholars);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id: userId, role: userRole } = session.user as SessionUser;

    if (!["ADMIN", "SCHOLAR"].includes(userRole)) {
      return errorResponse("Forbidden", 403);
    }

    const existing = await prisma.scholar.findUnique({ where: { userId } });
    if (existing) return errorResponse("Scholar profile already exists", 409);

    const body = (await req.json()) as unknown;
    const data = scholarSchema.parse(body);

    const scholar = await prisma.scholar.create({
      data: { ...data, userId },
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
    });

    return successResponse(scholar, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
