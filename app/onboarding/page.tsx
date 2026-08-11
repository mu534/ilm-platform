import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import OnboardingClient from "./OnboardingClient";

/**
 * Server-side protection for onboarding page.
 * Only USER role with incomplete onboarding can access this page.
 * ADMIN and INSTRUCTOR are redirected to their appropriate dashboards.
 */
export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/onboarding");
  }

  const userRole = session.user.role as "ADMIN" | "INSTRUCTOR" | "USER";

  // ADMIN and INSTRUCTOR should not access onboarding
  if (userRole === "ADMIN") {
    redirect("/admin");
  }

  if (userRole === "INSTRUCTOR") {
    redirect("/dashboard/instructor");
  }

  // For USER role, let the client component handle onboarding completion check
  return <OnboardingClient />;
}
