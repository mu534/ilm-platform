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
 *
 * Returns a Cloudinary signed-upload signature so the browser can POST
 * files DIRECTLY to Cloudinary — bypassing the Next.js 4.5 MB body limit.
 *
 * CRITICAL: Every parameter included in the Cloudinary upload request MUST
 * be included in the params passed to api_sign_request, otherwise Cloudinary
 * returns 401 "signature mismatch".
 *
 * We keep the signed params minimal (folder + timestamp) to avoid any
 * mismatch. Post-upload transformations are handled by the Cloudinary
 * upload preset or via the existing server-side upload route for small files.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFresh();
    const body = schema.parse(await req.json());

    // Only admins/instructors can upload course media; anyone can upload avatars
    const isAvatarUpload = body.folder.includes("avatars");
    if (!isAvatarUpload && !["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const timestamp = Math.round(Date.now() / 1000);

    // ONLY sign the params that the browser will actually send.
    // Any param sent but not signed causes a 401.
    const paramsToSign: Record<string, string | number> = {
      folder:    body.folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET ?? ""
    );

    return successResponse({
      signature,
      timestamp,
      cloudName:    process.env.CLOUDINARY_CLOUD_NAME ?? "",
      apiKey:       process.env.CLOUDINARY_API_KEY ?? "",
      folder:       body.folder,
      resourceType: body.resourceType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
