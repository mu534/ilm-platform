import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireAdmin } from "../../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import { z } from "zod";

const createSchema = z.object({
  name:     z.string().min(1).max(100),
  title:    z.string().max(200).optional(),
  imageUrl: z.string().url(),
});

// GET /api/admin/certificate-settings/signatures
export async function GET() {
  try {
    await requireAdmin();
    const sigs = await prisma.certificateSignature.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return successResponse(sigs);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/certificate-settings/signatures
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json()) as unknown;
    const data = createSchema.parse(body);

    // Only ONE CEO signature allowed at a time
    const existing = await prisma.certificateSignature.findFirst();
    if (existing) {
      return errorResponse(
        "A CEO signature already exists. Update the existing signature instead of creating a new one.",
        409
      );
    }

    const sig = await prisma.certificateSignature.create({ data });
    return successResponse(sig, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
