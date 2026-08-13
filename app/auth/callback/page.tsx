import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, getPostLoginDestination } from "@/app/lib/auth";
import { defaultLocale } from "@/i18n/config";

/**
 * Server-side callback page for role-based routing after authentication.
 * This ensures security by checking the database for the user's role and onboarding status.
 */
export default async function AuthCallbackPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect(`/${defaultLocale}/login`);
  }

  const userId = session.user.id as string;
  const userRole = session.user.role as "ADMIN" | "INSTRUCTOR" | "USER";

  try {
    const destination = await getPostLoginDestination(userId, userRole);
    redirect(`/${defaultLocale}${destination}`);
  } catch (error) {
    // Fallback to dashboard if something goes wrong
    redirect(`/${defaultLocale}/dashboard`);
  }
}
