import { NextRequest } from "next/server";
import { requireUserFresh } from "../../../lib/authorization";
import { UploadService } from "../../../lib/services/uploadService";
import { successResponse, errorResponse, handleApiError } from "../../../utils/api";
import { checkRateLimit, getClientIp } from "../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`upload-sig:${ip}`, { limit: 30, window: 3600 });
  if (!rl.success) return errorResponse("Too many upload requests. Please try again later.", 429);

  try {
    const user = await requireUserFresh();
    if (!["ADMIN", "INSTRUCTOR"].includes(user.role)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json().catch(() => ({})) as { folder?: string };
    const folder = typeof body.folder === "string" && body.folder ? body.folder : "ilm-platform";

    const params = UploadService.generateUploadSignature(folder);
    return successResponse(params);
  } catch (error) {
    return handleApiError(error);
  }
}
