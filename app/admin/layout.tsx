import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import { AdminLayout } from "../components/admin/AdminLayout";
import type { SessionUser } from "@/app/types/auth.types";

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (!session || !user) {
    redirect("/login?callbackUrl=/admin");
  }

  // Only ADMIN, INSTRUCTOR, and SCHOLAR can access /admin
  if (!["ADMIN", "INSTRUCTOR", "SCHOLAR"].includes(user.role)) {
    redirect("/dashboard");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
