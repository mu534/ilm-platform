import { redirect } from "next/navigation";

export default function LegacyScholarAnalyticsRedirect() {
  redirect("/dashboard/instructor/analytics");
}
