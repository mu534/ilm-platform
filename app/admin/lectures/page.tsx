import { redirect } from "next/navigation";

/** Lectures are now managed inside each Course via the Course Builder. */
export default function AdminLecturesRedirectPage() {
  redirect("/admin/courses");
}
