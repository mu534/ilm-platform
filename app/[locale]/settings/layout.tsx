import { StudentLayout } from "@/app/components/student/StudentLayout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}
