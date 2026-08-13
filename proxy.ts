import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from './i18n/config';

// These routes have their own locale-aware pages under app/[locale]. All other
// application pages currently live at the app root and are served through an
// internal rewrite after their locale prefix has been processed.
const localeRoutePrefixes = [
  "/activity",
  "/forgot-password",
  "/login",
  "/onboarding",
  "/profile",
  "/register",
  "/reset-password",
  "/scholar-application",
  "/settings",
  "/terms",
  "/verify",
  "/verify-email",
  "/privacy",
];

function hasLocaleRoute(pathname: string): boolean {
  return pathname === "/" || localeRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

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

// Helper function to remove locale prefix from pathname
function getPathnameWithoutLocale(pathname: string): string {
  const localeMatch = pathname.match(/^\/(en|om|ar|am)(?=\/|$)/);
  return localeMatch ? pathname.slice(3) : pathname;
}

// Helper function to extract locale from pathname
function getLocale(pathname: string): string {
  const localeMatch = pathname.match(/^\/(en|om|ar|am)(?=\/|$)/);
  return localeMatch ? localeMatch[1] : defaultLocale;
}

export default withAuth(
  function middleware(req: NextRequest) {
    const token = (req as NextRequest & { nextauth?: { token?: { role?: string; onboardingCompleted?: boolean } } }).nextauth?.token;
    const pathname = req.nextUrl.pathname;
    const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
    const currentLocale = getLocale(pathname);

    // Handle root path - redirect to default locale
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${defaultLocale}`, req.url));
    }

    // Handle paths without locale prefix
    const localeMatch = pathname.match(/^\/(en|om|ar|am)(?=\/|$)/);
    if (!localeMatch) {
      // Check if it's a valid path without locale
      // Redirect to add locale prefix
      return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}`, req.url));
    }

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

    // Most feature pages have not yet moved beneath app/[locale]. Keep the
    // locale in the browser URL, while rendering their existing root route.
    // This makes /om/courses, /ar/dashboard and similar links work without
    // duplicating the entire route tree.
    const response = hasLocaleRoute(pathnameWithoutLocale)
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(pathnameWithoutLocale + req.nextUrl.search, req.url));
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
