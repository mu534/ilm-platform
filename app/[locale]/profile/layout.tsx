import { RoleAwareDashboardShell } from "@/app/components/shared/RoleAwareDashboardShell";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleAwareDashboardShell>{children}</RoleAwareDashboardShell>;
}
