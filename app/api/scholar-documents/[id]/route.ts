import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prism";
import { requireUserFresh } from "../../../lib/authorization";
import { privateDocumentUrl, deletePrivateDocument } from "../../../lib/cloudinary";
import { errorResponse, successResponse, handleApiError } from "../../../utils/api";

/**
 * Private document delivery. Every request is authorized server-side against the
 * owning application; the Cloudinary asset is `authenticated` and its signed URL
 * never leaves the server — the bytes are streamed back instead.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFresh(); const { id } = await params;
    const document = await prisma.scholarApplicationDocument.findUnique({ where: { id }, select: { id: true, storageKey: true, originalName: true, mimeType: true, application: { select: { userId: true } } } });
    if (!document || (user.role !== "ADMIN" && document.application.userId !== user.id)) return errorResponse("Document not found", 404);

    const upstream = await fetch(privateDocumentUrl(document.storageKey));
    if (!upstream.ok || !upstream.body) return errorResponse("Document is unavailable", 502);

    await prisma.auditLog.create({ data: { userId: user.id, action: "SCHOLAR_DOCUMENT_VIEWED", entityType: "ScholarApplicationDocument", entityId: document.id } });

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) { return handleApiError(error); }
}

/** Applicants may remove their own documents while the application is editable. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFresh(); const { id } = await params;
    const document = await prisma.scholarApplicationDocument.findUnique({ where: { id }, select: { id: true, storageKey: true, application: { select: { userId: true, status: true } } } });
    if (!document || document.application.userId !== user.id) return errorResponse("Document not found", 404);
    if (!["DRAFT", "REJECTED"].includes(document.application.status)) return errorResponse("Documents cannot be removed after submission", 409);

    await prisma.scholarApplicationDocument.delete({ where: { id: document.id } });
    await deletePrivateDocument(document.storageKey).catch(() => undefined);
    await prisma.auditLog.create({ data: { userId: user.id, action: "SCHOLAR_DOCUMENT_DELETED", entityType: "ScholarApplicationDocument", entityId: document.id } });
    return successResponse({ id: document.id });
  } catch (error) { return handleApiError(error); }
}
