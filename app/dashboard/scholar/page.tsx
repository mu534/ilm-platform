import { redirect } from "next/navigation";

export default function LegacyScholarDashboardRedirect() {
  redirect("/dashboard/instructor");
}
