/**
 * Minimal ambient type declaration for the `qrcode` npm package (v1.5.x).
 * Replace with @types/qrcode when available in the project.
 */
declare module "qrcode" {
  export interface QRCodeOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?:               number;
    scale?:                number;
    width?:                number;
    color?: {
      dark?:  string;
      light?: string;
    };
  }

  export interface QRCodeToStringOptions extends QRCodeOptions {
    type?: "svg" | "terminal" | "utf8";
  }

  export interface QRCodeToDataURLOptions extends QRCodeOptions {
    type?: "image/png" | "image/jpeg" | "image/webp";
    quality?: number;
  }

  /** Generates an SVG or terminal string representation. */
  export function toString(
    text: string,
    options?: QRCodeToStringOptions,
  ): Promise<string>;

  /** Generates a base-64 data URL (default: PNG). */
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  /** Generates a raw Buffer (PNG by default). */
  export function toBuffer(
    text: string,
    options?: QRCodeOptions,
  ): Promise<Buffer>;
}
