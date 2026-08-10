import { describe, it, expect } from "vitest";
import { UploadService } from "../app/lib/services/uploadService";

describe("Upload File Metadata Validation", () => {
  it("passes for valid image metadata", () => {
    expect(() => {
      UploadService.validateFileMetadata("avatar.png", "image/png", 1024 * 1024);
    }).not.toThrow();
  });

  it("passes for valid PDF metadata", () => {
    expect(() => {
      UploadService.validateFileMetadata("notes.pdf", "application/pdf", 5 * 1024 * 1024);
    }).not.toThrow();
  });

  it("rejects files exceeding size limit", () => {
    expect(() => {
      UploadService.validateFileMetadata("video.mp4", "video/mp4", 150 * 1024 * 1024, 100 * 1024 * 1024);
    }).toThrow("File size exceeds limit");
  });

  it("rejects unsupported MIME types", () => {
    expect(() => {
      UploadService.validateFileMetadata("file.xyz", "application/x-msdownload", 1024);
    }).toThrow("Unsupported file MIME type");
  });

  it("rejects dangerous file extensions", () => {
    expect(() => {
      UploadService.validateFileMetadata("malicious.sh", "text/plain", 1024);
    }).toThrow("Disallowed file extension");
  });
});
