import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, getPostLoginDestination } from "@/app/lib/auth";

/**
 * Server-side callback page for role-based routing after authentication.
 * Checks the database for the user's role and onboarding status,
 * then redirects to the appropriate destination.
 */
export default async function AuthCallbackPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId   = session.user.id as string;
  const userRole = session.user.role as "ADMIN" | "INSTRUCTOR" | "USER";

  try {
    const destination = await getPostLoginDestination(userId, userRole);
    redirect(destination);
  } catch {
    redirect("/dashboard");
  }
}
