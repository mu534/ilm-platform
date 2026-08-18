import { NextRequest } from "next/server";
import { cloudinary } from "../../lib/cloudinary";
import { requireUserFresh } from "../../lib/authorization";
import { successResponse, errorResponse, handleApiError } from "../../utils/api";
import { z } from "zod";

const schema = z.object({
  folder:       z.string().min(1).max(200),
  resourceType: z.enum(["image", "video", "raw", "auto"]).default("auto"),
});

/**
 * POST /api/upload-signature
 * Returns a signed upload signature so the browser can upload directly to
 * Cloudinary — bypassing the Next.js serverless request body limit (4.5 MB
 * on Vercel). The file never passes through this server.
 *
 * The client should POST the file directly to:
 *   https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload
 * with the params returned here.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();
    const body = schema.parse(await req.json());

    // Only admins/instructors can upload course media
    const isAvatarUpload = body.folder.includes("avatars");
    if (!isAvatarUpload && !["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Params to sign — must match exactly what the browser sends
    const paramsToSign: Record<string, string | number> = {
      folder:    body.folder,
      timestamp,
    };

    // Add eager transformation for videos (HLS + mp4 fallback)
    if (body.resourceType === "video") {
      paramsToSign.eager = "sp_hd/m3u8|f_mp4,vc_auto,q_auto";
      paramsToSign.eager_async = 1;
      paramsToSign.quality = "auto";
    }

    if (body.resourceType === "image") {
      paramsToSign.quality = "auto";
      paramsToSign.fetch_format = "auto";
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET ?? ""
    );

    return successResponse({
      signature,
      timestamp,
      cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:     process.env.CLOUDINARY_API_KEY,
      folder:     body.folder,
      resourceType: body.resourceType,
      // Extra params the browser must include in its Cloudinary POST
      eager: paramsToSign.eager ?? null,
      eager_async: paramsToSign.eager_async ?? null,
      quality: paramsToSign.quality ?? null,
      fetch_format: paramsToSign.fetch_format ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
