import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prism";
import { requireAdmin } from "../../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../../utils/api";
import { z } from "zod";

const patchSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  title:    z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/admin/certificate-settings/signatures/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const sig = await prisma.certificateSignature.findUnique({ where: { id } });
    if (!sig) return errorResponse("Signature not found", 404);

    const body = (await req.json()) as unknown;
    const data = patchSchema.parse(body);

    const updated = await prisma.certificateSignature.update({ where: { id }, data });
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/certificate-settings/signatures/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const sig = await prisma.certificateSignature.findUnique({ where: { id } });
    if (!sig) return errorResponse("Signature not found", 404);

    await prisma.certificateSignature.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
