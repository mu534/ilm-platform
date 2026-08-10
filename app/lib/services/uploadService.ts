import { cloudinary } from "../cloudinary";
import { HttpError } from "../httpError";

export interface SignedUploadParams {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
  "application/pdf",
]);

export class UploadService {
  static validateFileMetadata(filename: string, mimeType: string, sizeBytes: number, maxBytes = 100 * 1024 * 1024) {
    if (sizeBytes > maxBytes) {
      throw new HttpError(`File size exceeds limit of ${Math.round(maxBytes / (1024 * 1024))}MB`, 400);
    }

    const ext = filename.split(".").pop()?.toLowerCase();
    const disallowedExts = new Set(["exe", "sh", "bat", "cmd", "js", "html", "php", "py"]);
    if (ext && disallowedExts.has(ext)) {
      throw new HttpError(`Disallowed file extension: .${ext}`, 400);
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new HttpError(`Unsupported file MIME type: ${mimeType}`, 400);
    }
  }

  /**
   * Generate signed parameters for direct browser-to-Cloudinary upload.
   */
  static generateUploadSignature(folder = "ilm-platform"): SignedUploadParams {
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiKey || !apiSecret || !cloudName) {
      throw new HttpError("Cloudinary configuration missing", 500);
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      timestamp,
      folder,
      signature,
      apiKey,
      cloudName,
    };
  }
}
