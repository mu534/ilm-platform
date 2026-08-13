import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

/**
 * Next.js middleware — runs on the Edge before every matched request.
 *
 * Responsibilities:
 *  1. Handle i18n locale routing
 *  2. Protect /admin, /dashboard, /profile, /onboarding routes (require auth)
 *  3. Restrict /admin (except /admin/courses) to ADMIN or SCHOLAR roles
 *  4. Send learners who have not finished onboarding to /onboarding, and send
 *     learners who already finished it away from /onboarding
 *  5. Add security headers on every response
 *
 * Lectures are managed exclusively inside the Course Builder
 * (/admin/courses/[id]/builder) — there is no separate top-level Lecture
 * admin module, so non-admins land on their course list instead.
 */

// Create the i18n middleware
const i18nMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// Helper function to remove locale prefix from pathname
function getPathnameWithoutLocale(pathname: string): string {
  const localeMatch = pathname.match(/^\/[a-z]{2}/);
  return localeMatch ? pathname.slice(3) : pathname;
}

export default withAuth(
  function middleware(req: NextRequest) {
    const token = (req as NextRequest & { nextauth?: { token?: { role?: string; onboardingCompleted?: boolean } } }).nextauth?.token;
    const pathname = req.nextUrl.pathname;
    const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
    
    // Extract locale from pathname
    const localeMatch = pathname.match(/^\/([a-z]{2})/);
    const currentLocale = localeMatch ? localeMatch[1] : defaultLocale;

    // Handle root path redirect
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${defaultLocale}`, req.url));
    }

    // First, apply i18n middleware for locale routing
    const i18nResponse = i18nMiddleware(req);
    if (i18nResponse) return i18nResponse;

    // Onboarding gate — the flag is copied onto the JWT from the database
    // (LearnerProfile.onboardingCompleted) and never from client storage.
    // Admins and instructors are not learners and are never gated.
    const isLearner = !token?.role || token.role === "USER";
    const onboardingCompleted = token?.onboardingCompleted === true;

    if (pathnameWithoutLocale.startsWith("/onboarding")) {
      if (onboardingCompleted) {
        return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, req.url));
      }
    } else if (token && isLearner && !onboardingCompleted) {
      return NextResponse.redirect(new URL(`/${currentLocale}/onboarding`, req.url));
    }

    // Block non-admin/scholar from admin-only pages
    const adminOnlyPaths = [
      "/admin/users",
      "/admin/analytics",
      "/admin/reports",
      "/admin/categories",
    ];
    const isAdminOnlyPath = adminOnlyPaths.some((p) => pathnameWithoutLocale.startsWith(p));

    if (isAdminOnlyPath && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL(`/${currentLocale}/admin/courses`, req.url));
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
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

        // /admin requires ADMIN or INSTRUCTOR role
        if (pathnameWithoutLocale.startsWith("/admin")) {
          return token?.role === "ADMIN" || token?.role === "INSTRUCTOR";
        }

        // /dashboard, /profile and /onboarding require any authenticated user
        if (
          pathnameWithoutLocale.startsWith("/dashboard") ||
          pathnameWithoutLocale.startsWith("/profile") ||
          pathnameWithoutLocale.startsWith("/onboarding") ||
          pathnameWithoutLocale.startsWith("/scholar-application")
        ) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};