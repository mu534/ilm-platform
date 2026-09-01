import { RoleAwareDashboardShell } from "@/app/components/shared/RoleAwareDashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleAwareDashboardShell>{children}</RoleAwareDashboardShell>;
}
