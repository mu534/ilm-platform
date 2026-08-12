
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

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  // Only ADMIN can access /admin
  if (user?.role !== "ADMIN") {
    // Redirect INSTRUCTOR to their dashboard
    if (user?.role === "INSTRUCTOR") {
      redirect("/dashboard/instructor");
    }
    // Redirect others to login
    redirect("/login?callbackUrl=/admin");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
