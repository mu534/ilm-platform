"use client";

import { useSession } from "next-auth/react";
import { StudentLayout } from "@/app/components/student/StudentLayout";
import { AdminLayout } from "@/app/components/admin/AdminLayout";
import type { SessionUser } from "@/app/types/auth.types";


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
