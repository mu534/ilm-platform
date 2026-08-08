import { NextRequest } from "next/server";
import { prisma } from "../../lib/prism";
import { requireAdmin, getOptionalUser } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
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

// GET /api/cms?key=homepage_banner — public read by key; admin sees all
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const item = await prisma.cmsContent.findUnique({ where: { key } });
      return successResponse(item);
    }

    const user    = await getOptionalUser();
    const isAdmin = user?.role === "ADMIN";

    const items = await prisma.cmsContent.findMany({
      where:   isAdmin ? {} : { active: true },
      orderBy: { order: "asc" },
    });
    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/cms — admin only
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

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

// DELETE /api/cms?key=xxx — admin only
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return errorResponse("key is required", 400);

    await prisma.cmsContent.delete({ where: { key } });
    return successResponse({ message: "Deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
