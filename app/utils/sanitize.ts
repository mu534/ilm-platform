

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "strong", "em", "b", "i", "u",
  "ul", "ol", "li", "blockquote", "br", "hr", "a", "span",
  "div", "section", "article", "code", "pre",
]);


const ALLOWED_TEXT_ALIGN = new Set(["left", "center", "right", "justify"]);
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function extractSafeStyle(match: string): string {
  const styleMatch = match.match(/style\s*=\s*"([^"]*)"/i) ?? match.match(/style\s*=\s*'([^']*)'/i);
  if (!styleMatch) return "";

  const kept: string[] = [];
  for (const decl of styleMatch[1].split(";")) {
    const [propRaw, valRaw] = decl.split(":");
    if (!propRaw || !valRaw) continue;
    const prop = propRaw.trim().toLowerCase();
    const val  = valRaw.trim();

    if (prop === "text-align" && ALLOWED_TEXT_ALIGN.has(val.toLowerCase())) {
      kept.push(`text-align: ${val.toLowerCase()}`);
    } else if (prop === "color" && HEX_COLOR.test(val)) {
      kept.push(`color: ${val}`);
    }
  }

  return kept.length ? ` style="${kept.join("; ")}"` : "";
}

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
      // For opening tags, strip all attributes except href on <a> (above)
      // and a strictly-validated style allow-list (text-align / color).
      return `<${lower}${extractSafeStyle(match)}>`;
    }
    // Unknown tag — strip the tag but keep inner content
    return "";
  });

  return sanitized;
}
