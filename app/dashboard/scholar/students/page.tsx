import { redirect } from "next/navigation";

export default function LegacyScholarStudentsRedirect() {
  redirect("/dashboard/instructor/students");
}
