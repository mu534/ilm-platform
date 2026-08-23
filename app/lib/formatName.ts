/**
 * Normalize a certificate display name.
 * Each word is Title-Cased; extra spaces are collapsed.
 * The original DB value is never mutated — use this only for display/snapshot.
 *
 * "mudasir najimudin abubakar" → "Mudasir Najimudin Abubakar"
 * "  JOHN  doe  "              → "John Doe"
 */
export function formatCertificateName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
