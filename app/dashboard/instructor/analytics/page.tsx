import { redirect } from "next/navigation";

// This page's content (top lectures, content-by-type, recent comments) has
// been merged into /admin/my-analytics, which already covered enrollment
// and completion analytics for instructors. There is now a single
// instructor analytics page instead of two independently-built ones.
export default function InstructorAnalyticsRedirect() {
  redirect("/admin/my-analytics");
}
