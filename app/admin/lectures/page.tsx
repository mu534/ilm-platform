import { redirect } from "next/navigation";

/**
 * Lectures are now managed inside each Course via the Course Builder.
 * Redirect anyone who hits this URL directly.
 */
export default function AdminLecturesRedirectPage() {
  redirect("/admin/courses");
}
