import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prism";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import type { SessionUser } from "../../types/auth.types";
import { z } from "zod";

const cmsSchema = z.object({
  key:      z.string().min(1).max(100),
  title:    z.string().max(200).optional(),
  content:  z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal("")),
  link:     z.string().url().optional().or(z.literal("")),
  active:   z.boolean().default(true),
  order:    z.number().int().default(0),
});

// GET /api/cms?key=homepage_banner — public, fetch CMS content by key
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const item = await prisma.cmsContent.findUnique({ where: { key } });
      return successResponse(item);
    }

    // Return all active CMS items (for admin)
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const isAdmin = user?.role === "ADMIN";

    const items = await prisma.cmsContent.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: { order: "asc" },
    });
    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/cms — admin only, create or update CMS content
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (user?.role !== "ADMIN") return errorResponse("Forbidden", 403);

    const body = (await req.json()) as unknown;
    const data = cmsSchema.parse(body);

    const item = await prisma.cmsContent.upsert({
      where:  { key: data.key },
      create: data,
      update: data,
    });
    return successResponse(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
