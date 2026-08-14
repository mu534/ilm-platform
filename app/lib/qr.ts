/**
 * Server-side QR-code generation utility.
 *
 * Uses the `qrcode` npm package (already a project dependency) to generate
 * QR codes entirely server-side with NO outbound network requests.
 *
 * Output: inline SVG string — embeds cleanly in HTML, scales perfectly
 * to any print size, and requires no additional <img> or data-URL tricks.
 */

import QRCode from "qrcode";

/**
 * Generate an inline SVG QR code for the given URL.
 * The SVG uses `width="100%" height="100%"` so it fills any container.
 *
 * @param url  - The URL to encode (e.g. the certificate verification URL).
 * @param size - Pixel size hint used for the internal module scale (default 160).
 * @returns    Inline SVG string ready to embed directly in HTML.
 */
export async function generateQrSvg(url: string, size = 160): Promise<string> {
  const raw = await QRCode.toString(url, {
    type:                 "svg",
    errorCorrectionLevel: "H",  // High — 30 % data recovery; best for printed certs
    margin:               1,    // Quiet zone: 1 module on each side
    width:                size,
    color: {
      dark:  "#000000",
      light: "#ffffff",
    },
  });

  // Replace fixed width/height with 100% so the SVG scales at any print DPI.
  return raw
    .replace(/\bwidth="\d+"/, 'width="100%"')
    .replace(/\bheight="\d+"/, 'height="100%"');
}

/**
 * Generate a base-64 PNG data URL QR code.
 * Useful when embedding in contexts that require raster images.
 *
 * @param url  - The URL to encode.
 * @param size - Pixel dimensions of the output PNG (default 160 px).
 */
export async function generateQrDataUrl(url: string, size = 160): Promise<string> {
  return QRCode.toDataURL(url, {
    type:                 "image/png",
    errorCorrectionLevel: "H",
    margin:               1,
    width:                size,
    color: {
      dark:  "#000000",
      light: "#ffffff",
    },
  });
}
