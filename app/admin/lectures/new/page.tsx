import { redirect } from "next/navigation";

/**
 * Lectures are created inside a Course via the Course Builder.
 * Redirect to /admin/courses so the user can pick a course first.
 */
export default function NewLectureRedirectPage() {
  redirect("/admin/courses");
}
