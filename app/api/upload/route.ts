// src/app/api/upload/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { successResponse, errorResponse, handleApiError } from "@/utils/api";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const userRole = (session.user as any).role;
    if (!["ADMIN", "SCHOLAR"].includes(userRole)) {
      return errorResponse("Forbidden", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "ilm-platform";

    if (!file) return errorResponse("No file provided", 400);
    if (file.size > MAX_FILE_SIZE)
      return errorResponse("File size exceeds 100MB limit", 400);

    const mimeType = file.type;
    let resourceType: "image" | "video" | "raw" | "auto" = "auto";

    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      resourceType = "image";
    } else if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      resourceType = "video";
    } else if (!mimeType.startsWith("audio/")) {
      return errorResponse("Unsupported file type", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, folder, resourceType);

    return successResponse({
      url: result.url,
      publicId: result.publicId,
      type: resourceType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
