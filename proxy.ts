import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware — runs on the Edge before every matched request.
 *
 * Responsibilities:
 *  1. Protect /admin, /dashboard, /profile, /onboarding routes (require auth)
 *  2. Restrict /admin (except /admin/courses) to ADMIN or SCHOLAR roles
 *  3. Send learners who have not finished onboarding to /onboarding, and send
 *     learners who already finished it away from /onboarding
 *  4. Add security headers on every response
 *
 * Lectures are managed exclusively inside the Course Builder
 * (/admin/courses/[id]/builder) — there is no separate top-level Lecture
 * admin module, so non-admins land on their course list instead.
 */
export default withAuth(
  function middleware(req: NextRequest) {
    const token    = (req as NextRequest & { nextauth?: { token?: { role?: string; onboardingCompleted?: boolean } } }).nextauth?.token;
    const pathname = req.nextUrl.pathname;

    // Onboarding gate — the flag is copied onto the JWT from the database
    // (LearnerProfile.onboardingCompleted) and never from client storage.
    // Admins and instructors are not learners and are never gated.
    const isLearner = !token?.role || token.role === "USER";
    const onboardingCompleted = token?.onboardingCompleted === true;

    if (pathname.startsWith("/onboarding")) {
      if (onboardingCompleted) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else if (token && isLearner && !onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Block non-admin/scholar from admin-only pages
    const adminOnlyPaths = [
      "/admin/users",
      "/admin/analytics",
      "/admin/reports",
      "/admin/categories",
    ];
    const isAdminOnlyPath = adminOnlyPaths.some((p) => pathname.startsWith(p));

    if (isAdminOnlyPath && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/courses", req.url));
    }

    // Add security headers
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    return response;
  },
  {
    callbacks: {
      // Return true to allow access — withAuth handles redirecting to /login automatically
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // /admin requires ADMIN or INSTRUCTOR role
        if (pathname.startsWith("/admin")) {
          return token?.role === "ADMIN" || token?.role === "INSTRUCTOR";
        }

        // /dashboard, /profile and /onboarding require any authenticated user
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/profile") ||
          pathname.startsWith("/onboarding") ||
          pathname.startsWith("/scholar-application")
        ) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/scholar-application/:path*",
    "/scholar-application",
  ],
};
