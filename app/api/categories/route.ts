import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireAdmin, getOptionalUser } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().default(0),
});

// GET /api/categories — public, returns all active categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { courses: true, lectures: true } },
      },
    });
    return successResponse(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/categories — admin only
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = (await req.json()) as unknown;
    const data = categorySchema.parse(body);

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing) return errorResponse("Category with this name or slug already exists", 409);

    const category = await prisma.category.create({ data });
    return successResponse(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
