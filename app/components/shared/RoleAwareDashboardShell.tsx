"use client";

import { useSession } from "next-auth/react";
import { StudentLayout } from "@/app/components/student/StudentLayout";
import { AdminLayout } from "@/app/components/admin/AdminLayout";
import type { SessionUser } from "@/app/types/auth.types";

/**
 * Everything under /dashboard/* used to render inside StudentLayout
 * unconditionally — including /dashboard/instructor/*, which is staff-only
 * content. That meant an instructor's own dashboard, students, and analytics
 * pages showed the *student* sidebar (My Learning, Explore Courses, ...),
 * while the rest of their work (course builder, lectures, /admin/my-analytics)
 * lived under /admin/* in a completely different sidebar (AdminSidebar).
 * Instructors doing a single task — e.g. check analytics, then check
 * students — bounced between two unrelated shells with different nav items,
 * different widths, different collapse state.
 *
 * This component makes the choice of shell depend on the user's role instead
 * of the URL: students get StudentLayout, staff (ADMIN/INSTRUCTOR) get
 * AdminLayout everywhere under /dashboard/*, matching what they already see
 * under /admin/*. One role, one shell.
 */
export function RoleAwareDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | undefined;
  const isStaff = user?.role === "ADMIN" || user?.role === "INSTRUCTOR";

  // While the session is still resolving, fall back to the student shell so
  // there's no layout flash for the common case. Every page beneath this
  // shell still enforces its own server-side role check, so this is purely
  // a chrome choice, never an authorization decision.
  if (status === "authenticated" && isStaff) {
    return <AdminLayout>{children}</AdminLayout>;
  }
  return <StudentLayout>{children}</StudentLayout>;
}
