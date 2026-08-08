import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prism";
import { uploadToCloudinary } from "../../../../lib/cloudinary";
import { requireUserFresh } from "../../../../lib/authorization";
import { requireLectureLearningAccess } from "../../../../lib/courseAccess";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";
type MediaCategory = "RESOURCE" | "REFERENCE";

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

function resolveCategory(value: unknown): MediaCategory {
  return value === "REFERENCE" ? "REFERENCE" : "RESOURCE";
}

/**
 * GET /api/lectures/[id]/media
 * Returns media attached to a lecture — only for enrolled learners,
 * course owners, or admins. Unpublished course resources are not public.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    const { id } = await params;

    await requireLectureLearningAccess({
      userId: user.id,
      role: user.role,
      lectureId: id,
      enforceSequential: true,
    });

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
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();
    if (!["ADMIN", "SCHOLAR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const { id: lectureId } = await params;

    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (!lecture) return errorResponse("Lecture not found", 404);
    if (user.role !== "ADMIN" && lecture.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { url?: unknown; filename?: unknown; category?: unknown };
      const url      = typeof body.url === "string" ? body.url.trim() : "";
      const filename = typeof body.filename === "string" && body.filename.trim() ? body.filename.trim() : url;

      if (!url || !/^https?:\/\//i.test(url)) {
        return errorResponse("A valid http(s) URL is required", 400);
      }

      const media = await prisma.media.create({
        data: {
          url,
          publicId:   "",
          type:       "LINK",
          category:   resolveCategory(body.category),
          filename,
          size:       0,
          mimeType:   "text/uri-list",
          lectureId,
          uploadedBy: user.id,
        },
      });

      return successResponse(media, 201);
    }

    const formData     = await req.formData();
    const file          = formData.get("file");
    const nameOverride  = formData.get("filename");
    const categoryField = formData.get("category");

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
        category:   resolveCategory(categoryField),
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
 * PATCH /api/lectures/[id]/media?mediaId=xxx
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id: lectureId } = await params;
    const mediaId = new URL(req.url).searchParams.get("mediaId");
    if (!mediaId) return errorResponse("mediaId is required", 400);

    const media = await prisma.media.findFirst({ where: { id: mediaId, lectureId } });
    if (!media) return errorResponse("Media not found", 404);

    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (user.role !== "ADMIN" && lecture?.authorId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const body = (await req.json()) as { category?: unknown };
    const updated = await prisma.media.update({
      where: { id: mediaId },
      data:  { category: resolveCategory(body.category) },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/lectures/[id]/media?mediaId=xxx
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFresh();

    const { id: lectureId } = await params;
    const mediaId = new URL(req.url).searchParams.get("mediaId");
    if (!mediaId) return errorResponse("mediaId is required", 400);

    const media = await prisma.media.findFirst({
      where: { id: mediaId, lectureId },
    });
    if (!media) return errorResponse("Media not found", 404);

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
