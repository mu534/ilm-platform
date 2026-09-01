import { RoleAwareDashboardShell } from "@/app/components/shared/RoleAwareDashboardShell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleAwareDashboardShell>{children}</RoleAwareDashboardShell>;
}
