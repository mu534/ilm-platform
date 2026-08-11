import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { privateDocumentUrl } from "../../../lib/cloudinary";
import { errorResponse, handleApiError } from "../../../utils/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFresh(); const { id } = await params;
    const document = await prisma.scholarApplicationDocument.findUnique({ where: { id }, select: { id: true, storageKey: true, application: { select: { userId: true } } } });
    if (!document || (user.role !== "ADMIN" && document.application.userId !== user.id)) return errorResponse("Document not found", 404);
    await prisma.auditLog.create({ data: { userId: user.id, action: "SCHOLAR_DOCUMENT_VIEWED", entityType: "ScholarApplicationDocument", entityId: document.id } });
    return NextResponse.redirect(privateDocumentUrl(document.storageKey));
  } catch (error) { return handleApiError(error); }
}
