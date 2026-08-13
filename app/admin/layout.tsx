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

  // Only ADMIN and SCHOLAR can access /admin
  if (!["ADMIN", "SCHOLAR"].includes(user.role)) {
    redirect("/login?callbackUrl=/admin");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
