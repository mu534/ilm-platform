import { NextRequest } from "next/server";
import { requireUserFresh } from "../../lib/authorization";
import { uploadToCloudinary } from "../../lib/cloudinary";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";

type ResourceType = "image" | "video" | "raw" | "auto";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

    if (!["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const formData = await req.formData();
    const file   = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return errorResponse("No file provided", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File size exceeds 100MB limit", 400);
    }

    const resolvedFolder =
      typeof folder === "string" && folder ? folder : "ilm-platform";
    const resourceType = getResourceType(file.type);

    if (resourceType === null) {
      return errorResponse("Unsupported file type", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, resolvedFolder, resourceType);

    return successResponse({
      url:      result.url,
      publicId: result.publicId,
      type:     resourceType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
