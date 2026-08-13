import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

/**
 * Lectures are created inside a Course via the Course Builder.
 * Redirect to /admin/courses so the user can pick a course first.
 */
export default function NewLectureRedirectPage() {
  redirect(`/${defaultLocale}/admin/courses`);
}
