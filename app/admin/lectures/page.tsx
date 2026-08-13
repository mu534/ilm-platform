import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

/**
 * Lectures are now managed inside each Course via the Course Builder.
 * Redirect anyone who hits this URL directly.
 */
export default function AdminLecturesRedirectPage() {
  redirect(`/${defaultLocale}/admin/courses`);
}
