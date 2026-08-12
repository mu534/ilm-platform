import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireAdmin } from "../../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";

// GET /api/admin/certificate-signatures - list all signatures
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const signatures = await prisma.certificateSignature.findMany({
      orderBy: { createdAt: "desc" },
    });

    return successResponse(signatures);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/certificate-signatures - create a new signature
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { name, title, imageUrl } = body;

    if (!name || !imageUrl) {
      return errorResponse("Name and image URL are required", 400);
    }

    const signature = await prisma.certificateSignature.create({
      data: {
        name,
        title: title || null,
        imageUrl,
      },
    });

    return successResponse(signature, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
