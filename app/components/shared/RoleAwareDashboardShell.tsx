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


  if (status === "authenticated" && isStaff) {
    return <AdminLayout>{children}</AdminLayout>;
  }
  return <StudentLayout>{children}</StudentLayout>;
}
