/**
 * Server-side HTML sanitizer — strips dangerous tags and attributes
 * while preserving safe formatting used in lecture content.
 *
 * Allowed tags: p, h2, h3, h4, strong, em, b, i, u, ul, ol, li,
 *               blockquote, br, hr, a (href only), span
 * Stripped:     script, style, iframe, object, embed, form, input,
 *               on* event handlers, javascript: hrefs, data: URIs
 */

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "strong", "em", "b", "i", "u",
  "ul", "ol", "li", "blockquote", "br", "hr", "a", "span",
  "div", "section", "article",
]);

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<form[\s\S]*?>/gi,
  /<input[\s\S]*?>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]*/gi,
  /javascript\s*:/gi,
  /data\s*:/gi,
  /vbscript\s*:/gi,
];

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Remove disallowed tags (keep content of inline tags, remove block-level unknown tags)
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName: string) => {
    const lower = tagName.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      // For anchor tags, only keep href attribute and strip everything else
      if (lower === "a") {
        const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
          // Block javascript: and data: in href
          if (/^(javascript|data|vbscript):/i.test(href.trim())) {
            return "";
          }
          return `<a href="${href}" rel="noopener noreferrer" target="_blank">`;
        }
        return match.startsWith("</") ? "</a>" : "";
      }
      // Allow closing tags for all allowed tags
      if (match.startsWith("</")) return match;
      // For opening tags, strip all attributes except for <a> (handled above)
      return `<${lower}>`;
    }
    // Unknown tag — strip the tag but keep inner content
    return "";
  });

  return sanitized;
}
