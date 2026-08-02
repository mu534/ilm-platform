import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { uploadToCloudinary } from "../../../../lib/cloudinary";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/next-auth";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

function resolveResourceType(mimeType: string): CloudinaryResourceType {
  if (mimeType.startsWith("image/"))                    return "image";
  if (mimeType.startsWith("video/"))                    return "video";
  if (mimeType.startsWith("audio/"))                    return "auto";
  if (mimeType === "application/pdf")                   return "raw";
  if (mimeType.startsWith("application/"))              return "raw";
  return "raw";
}

function resolveMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/"))       return "IMAGE";
  if (mimeType.startsWith("video/"))       return "VIDEO";
  if (mimeType.startsWith("audio/"))       return "AUDIO";
  if (mimeType === "application/pdf")      return "PDF";
  return "DOCUMENT";
}

/**
 * GET /api/lectures/[id]/media
 * Returns all media attached to a lecture.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const media = await prisma.media.findMany({
      where:   { lectureId: id },
      orderBy: { createdAt: "asc" },
    });
    return successResponse(media);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/lectures/[id]/media
 * Uploads a file and attaches it as a resource to the lecture.
 * Accepts multipart/form-data with `file` field.
 * Optional: `filename` override.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) return errorResponse("Forbidden", 403);

    const { id: lectureId } = await params;

    // Verify lecture exists and user has access
    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (!lecture) return errorResponse("Lecture not found", 404);
    if (user.role !== "ADMIN" && lecture.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const formData   = await req.formData();
    const file       = formData.get("file");
    const nameOverride = formData.get("filename");

    if (!(file instanceof File)) return errorResponse("No file provided", 400);
    if (file.size > MAX_FILE_SIZE) return errorResponse("File size exceeds 100 MB limit", 400);

    const resourceType = resolveResourceType(file.type);
    const mediaType    = resolveMediaType(file.type);
    const filename     = typeof nameOverride === "string" && nameOverride
      ? nameOverride
      : file.name;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, "ilm-platform/resources", resourceType);

    const media = await prisma.media.create({
      data: {
        url:        result.url,
        publicId:   result.publicId,
        type:       mediaType as "VIDEO" | "AUDIO" | "PDF" | "IMAGE" | "DOCUMENT",
        filename,
        size:       file.size,
        mimeType:   file.type,
        lectureId,
        uploadedBy: user.id,
      },
    });

    return successResponse(media, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/lectures/[id]/media?mediaId=xxx
 * Removes a media resource from a lecture.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user    = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: lectureId } = await params;
    const mediaId = new URL(req.url).searchParams.get("mediaId");
    if (!mediaId) return errorResponse("mediaId is required", 400);

    const media = await prisma.media.findFirst({
      where: { id: mediaId, lectureId },
    });
    if (!media) return errorResponse("Media not found", 404);

    // Verify ownership
    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (user.role !== "ADMIN" && lecture?.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    await prisma.media.delete({ where: { id: mediaId } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
