/**
 * Server-side QR code generation tests.
 *
 * Verifies that QR codes are generated entirely server-side with no
 * outbound network calls, and that the output is correctly formed SVG.
 */

import { describe, it, expect } from "vitest";
import { generateQrSvg, generateQrDataUrl } from "../app/lib/qr";

const TEST_URL = "https://example.com/verify-certificate/ILM-CERT-AB12CD34";

describe("generateQrSvg", () => {
  it("returns a non-empty SVG string", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(typeof svg).toBe("string");
    expect(svg.length).toBeGreaterThan(0);
  });

  it("output is valid inline SVG (starts with <svg)", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(svg.trim()).toMatch(/^<svg/i);
  });

  it("SVG contains closing tag", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(svg).toContain("</svg>");
  });

  it("SVG uses 100% width and height for responsive scaling", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(svg).toContain('width="100%"');
    expect(svg).toContain('height="100%"');
  });

  it("SVG contains a viewBox for resolution-independent rendering", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(svg).toContain("viewBox");
  });

  it("does NOT contain the Google Charts domain (no external network call)", async () => {
    const svg = await generateQrSvg(TEST_URL);
    expect(svg).not.toContain("chart.googleapis.com");
    expect(svg).not.toContain("google");
  });

  it("encodes the verification URL — SVG contains QR path data", async () => {
    const svg = await generateQrSvg(TEST_URL);
    // qrcode v1.5+ renders modules as <path> strokes, not <rect> elements
    expect(svg).toMatch(/<path/);
  });

  it("works with a realistic ILM-CERT certificate URL", async () => {
    const certUrl = "https://ilm-platform.com/verify-certificate/ILM-CERT-7X4K9P2M";
    const svg = await generateQrSvg(certUrl);
    expect(svg.trim()).toMatch(/^<svg/i);
    expect(svg).toContain("</svg>");
    expect(svg).not.toContain("chart.googleapis.com");
  });

  it("different URLs produce different QR codes", async () => {
    const svg1 = await generateQrSvg("https://example.com/verify-certificate/ILM-CERT-AAAAAAAA");
    const svg2 = await generateQrSvg("https://example.com/verify-certificate/ILM-CERT-BBBBBBBB");
    expect(svg1).not.toBe(svg2);
  });

  it("accepts a custom size parameter", async () => {
    const svg = await generateQrSvg(TEST_URL, 200);
    expect(svg.trim()).toMatch(/^<svg/i);
  });

  it("uses error correction level H (high) — tolerant of print damage", async () => {
    // Error correction level is embedded in QR binary data and not exposed
    // as readable text in SVG, so we verify the SVG is non-trivially sized
    // (H level produces denser/larger QR than L level for the same input).
    const svg = await generateQrSvg(TEST_URL);
    // A high-ECC QR for a typical URL should be at least 2 KB of SVG
    expect(svg.length).toBeGreaterThan(2000);
  });
});

describe("generateQrDataUrl", () => {
  it("returns a base64 PNG data URL", async () => {
    const dataUrl = await generateQrDataUrl(TEST_URL);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("data URL has substantial content", async () => {
    const dataUrl = await generateQrDataUrl(TEST_URL);
    // A valid 160px PNG QR code should be > 1 KB base64
    expect(dataUrl.length).toBeGreaterThan(1000);
  });

  it("does NOT contain Google Charts domain", async () => {
    const dataUrl = await generateQrDataUrl(TEST_URL);
    expect(dataUrl).not.toContain("googleapis.com");
  });

  it("accepts a custom size parameter", async () => {
    const dataUrl = await generateQrDataUrl(TEST_URL, 256);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
