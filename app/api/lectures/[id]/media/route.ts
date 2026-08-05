import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { uploadToCloudinary } from "../../../../lib/cloudinary";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/next-auth";

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
 *
 * Two ways to attach a resource:
 *  - multipart/form-data with a `file` field — uploads to Cloudinary
 *    (PDFs, notes, workbooks, slides, recordings…)
 *  - application/json with `{ url, filename, category }` — attaches an
 *    external link directly (Qur'an verse pages, hadith collections,
 *    articles, any other URL) with no upload involved.
 *
 * Both accept an optional `category`: "RESOURCE" (default) or "REFERENCE".
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

    const contentType = req.headers.get("content-type") ?? "";

    // ── External link (no upload) ──────────────────────────────────────────
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

    // ── File upload ─────────────────────────────────────────────────────────
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
 * Re-tags a resource's category (RESOURCE <-> REFERENCE).
 */
export async function PATCH(
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
