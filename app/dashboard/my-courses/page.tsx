// Redirect to the main dashboard which shows courses
import { redirect } from "next/navigation";

export default function MyCoursesPage() {
  redirect("/dashboard");
}
