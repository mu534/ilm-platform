import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const category = await prisma.category.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        _count: { select: { courses: true, lectures: true } },
      },
    });
    if (!category) return errorResponse("Category not found", 404);
    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = (await req.json()) as unknown;
    const data = updateSchema.parse(body);

    const category = await prisma.category.update({ where: { id }, data });
    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    return successResponse({ message: "Category deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
