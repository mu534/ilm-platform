import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { requireUserFresh } from "../../../../lib/authorization";
import { uploadPrivateDocument } from "../../../../lib/cloudinary";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const allowedKinds = new Set(["CERTIFICATE", "QUALIFICATION", "SUPPORTING"]);
const maxSize = 15 * 1024 * 1024;
const maxDocuments = 10;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFresh(); const { id } = await params;
    const application = await prisma.scholarApplication.findFirst({ where: { id, userId: user.id, status: { in: ["DRAFT", "REJECTED"] } }, select: { id: true } });
    if (!application) return errorResponse("Application not found", 404);
    const formData = await req.formData(); const file = formData.get("file"); const kind = formData.get("kind");
    if (!(file instanceof File) || typeof kind !== "string" || !allowedKinds.has(kind)) return errorResponse("Invalid document", 400);
    if (!allowedTypes.has(file.type) || file.size > maxSize || file.size === 0) return errorResponse("Documents must be PDF, JPG, PNG, or WebP and no larger than 15 MB", 422);
    const documentCount = await prisma.scholarApplicationDocument.count({ where: { applicationId: id } });
    if (documentCount >= maxDocuments) return errorResponse(`You can upload at most ${maxDocuments} documents`, 422);
    const upload = await uploadPrivateDocument(Buffer.from(await file.arrayBuffer()), `ilm-platform/private/scholar-applications/${id}`);
    const document = await prisma.scholarApplicationDocument.create({ data: { applicationId: id, storageKey: upload.publicId, originalName: file.name.slice(0, 255), mimeType: file.type, size: file.size, kind } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "SCHOLAR_DOCUMENT_UPLOADED", entityType: "ScholarApplicationDocument", entityId: document.id, metadata: JSON.stringify({ kind }) } });
    return successResponse({ id: document.id, originalName: document.originalName, kind: document.kind, createdAt: document.createdAt }, 201);
  } catch (error) { return handleApiError(error); }
}
