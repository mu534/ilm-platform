import { NextRequest } from "next/server";
import { requireUserFresh } from "../../lib/authorization";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { UploadService } from "../../lib/services/uploadService";

type ResourceType = "image" | "video" | "raw" | "auto";

// Per-type limits:  videos 2 GB, everything else 100 MB
const VIDEO_MAX  = 2  * 1024 * 1024 * 1024;
const DEFAULT_MAX = 100 * 1024 * 1024;

function getResourceType(mimeType: string): ResourceType | null {
  if (mimeType.startsWith("image/"))        return "image";
  if (mimeType.startsWith("video/"))        return "video";
  if (mimeType.startsWith("audio/"))        return "auto";
  if (mimeType === "application/pdf")       return "raw";
  if (mimeType.startsWith("application/")) return "raw";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();

    const formData = await req.formData();
    const file   = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return errorResponse("No file provided", 400);
    }

    const isVideo   = file.type.startsWith("video/");
    const maxBytes  = isVideo ? VIDEO_MAX : DEFAULT_MAX;

    UploadService.validateFileMetadata(file.name, file.type, file.size, maxBytes);

    const resolvedFolder =
      typeof folder === "string" && folder ? folder : "ilm-platform";

    const isAvatarUpload = resolvedFolder === "ilm-platform/avatars";
    if (!isAvatarUpload && !["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }
    if (isAvatarUpload && !file.type.startsWith("image/")) {
      return errorResponse("Profile photos must be images", 422);
    }

    const resourceType = getResourceType(file.type);
    if (resourceType === null) {
      return errorResponse("Unsupported file type", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, resolvedFolder, resourceType);

    return successResponse({
      url:       result.url,
      publicId:  result.publicId,
      type:      resourceType,
      // Return metadata for UI feedback
      duration:  result.duration  ?? null,
      width:     result.width     ?? null,
      height:    result.height    ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
