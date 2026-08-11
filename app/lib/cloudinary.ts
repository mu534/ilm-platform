import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  resourceType: "image" | "video" | "raw" | "auto" = "auto",
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload failed"));
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      )
      .end(fileBuffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function uploadPrivateDocument(fileBuffer: Buffer, folder: string): Promise<{ publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type: "raw", type: "authenticated", access_mode: "authenticated" }, (error, result) => {
      if (error || !result) reject(error || new Error("Upload failed"));
      else resolve({ publicId: result.public_id });
    }).end(fileBuffer);
  });
}

/**
 * Short-lived signed URL for an `authenticated` (private) asset. Never returned
 * to a client — the backend fetches the bytes itself and streams them.
 */
export function privateDocumentUrl(publicId: string): string {
  return cloudinary.url(publicId, { resource_type: "raw", type: "authenticated", sign_url: true, expires_at: Math.floor(Date.now() / 1000) + 300, secure: true });
}

export async function deletePrivateDocument(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
}
