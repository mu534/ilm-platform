import { redirect } from "next/navigation";

/** Lectures are created inside a Course via the Course Builder. */
export default function NewLectureRedirectPage() {
  redirect("/admin/courses");
}
