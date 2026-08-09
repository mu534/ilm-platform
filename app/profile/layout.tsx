import { StudentLayout } from "@/app/components/student/StudentLayout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}
