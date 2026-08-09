import { StudentLayout } from "@/app/components/student/StudentLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}
