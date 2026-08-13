
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import { AdminLayout } from "../components/admin/AdminLayout";
import type { SessionUser } from "@/app/types/auth.types";
import { defaultLocale } from "@/i18n/config";

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (!session) {
    redirect(`/${defaultLocale}/login?callbackUrl=/${defaultLocale}/admin`);
  }

  // Only ADMIN can access /admin
  if (user?.role !== "ADMIN") {
    // Redirect INSTRUCTOR to their dashboard
    if (user?.role === "INSTRUCTOR") {
      redirect(`/${defaultLocale}/dashboard/instructor`);
    }
    // Redirect others to login
    redirect(`/${defaultLocale}/login?callbackUrl=/${defaultLocale}/admin`);
  }

  return <AdminLayout>{children}</AdminLayout>;
}
