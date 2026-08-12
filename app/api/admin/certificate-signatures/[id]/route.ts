import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

// PATCH /api/admin/certificate-signatures/[id] - update a signature
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, title, imageUrl, isActive } = body;

    const signature = await prisma.certificateSignature.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return successResponse(signature);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/certificate-signatures/[id] - delete a signature
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.certificateSignature.delete({
      where: { id },
    });

    return successResponse({ message: "Signature deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
