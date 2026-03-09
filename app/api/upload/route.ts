import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { uploadToCloudinary } from "../../lib/cloudinary";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "../../utils/api";
import type { SessionUser } from "../../types/next-auth";

type ResourceType = "image" | "video" | "raw" | "auto";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

function getResourceType(mimeType: string): ResourceType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  if (mimeType.startsWith("audio/")) return "auto";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { role: userRole } = session.user as SessionUser;
    if (!["ADMIN", "SCHOLAR"].includes(userRole)) {
      return errorResponse("Forbidden", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file");
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
    const result = await uploadToCloudinary(
      buffer,
      resolvedFolder,
      resourceType,
    );

    return successResponse({
      url: result.url,
      publicId: result.publicId,
      type: resourceType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
