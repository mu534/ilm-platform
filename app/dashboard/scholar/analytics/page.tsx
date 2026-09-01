import { redirect } from "next/navigation";

export default function LegacyScholarAnalyticsRedirect() {
  redirect("/admin/my-analytics");
}
