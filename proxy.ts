import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from './i18n/config';

// These routes have their own locale-aware pages under app/[locale]. All other
// application pages currently live at the app root and are served through an
// internal rewrite after their locale prefix has been processed.
const localeRoutePrefixes = [
  "/about",
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

    // ── Hard bypass for all API and static routes ─────────────────────────
    // withAuth can run middleware even for /api/* in some Next.js versions.
    // Never locale-redirect or gate API routes — NextAuth session fetches
    // (/api/auth/session, /api/auth/csrf) must reach the handler directly.
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
    const currentLocale = getLocale(pathname);
    const localeMatch = pathname.match(/^\/(en|om|ar|am)(?=\/|$)/);

    // Handle root path - redirect to default locale
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${defaultLocale}`, req.url));
    }

    // Handle paths without locale prefix.
    // (API routes already returned early above.)
    if (!localeMatch) {
      return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}`, req.url));
    }

    // Onboarding gate — the flag is copied onto the JWT from the database
    // (LearnerProfile.onboardingCompleted) and never from client storage.
    // Admins, instructors, and scholars are never gated by onboarding.
    const staffRoles = ["ADMIN", "INSTRUCTOR", "SCHOLAR"];
    const isLearner = !token?.role || !staffRoles.includes(token.role);
    const onboardingCompleted = token?.onboardingCompleted === true;

    if (pathnameWithoutLocale.startsWith("/onboarding")) {
      if (onboardingCompleted || !isLearner) {
        return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, req.url));
      }
    } else if (token && isLearner && !onboardingCompleted) {
      // /scholar-application is the destination for teachers finishing onboarding —
      // always allow it so the "Continue to Application" redirect is never blocked.
      if (!pathnameWithoutLocale.startsWith("/scholar-application")) {
        return NextResponse.redirect(new URL(`/${currentLocale}/onboarding`, req.url));
      }
    }

    // ── Role-based access inside /admin ──────────────────────────────────
    // ADMIN  → full access to everything
    // INSTRUCTOR / SCHOLAR → course builder paths only
    // Everyone else → blocked at the authorized() callback below
    if (pathnameWithoutLocale.startsWith("/admin")) {
      const role = token?.role;
      const isAdmin      = role === "ADMIN";
      const isInstructor = role === "INSTRUCTOR" || (role as string) === "SCHOLAR";

      // Paths instructors are allowed to access
      const instructorAllowed = [
        "/admin/courses",
        "/admin/lectures",
        "/admin/modules",
        "/admin/my-analytics",
      ];

      if (!isAdmin && isInstructor) {
        const allowed = instructorAllowed.some((p) =>
          pathnameWithoutLocale.startsWith(p)
        );
        if (!allowed) {
          // Redirect instructors away from admin-only pages to their course list
          return NextResponse.redirect(
            new URL("/admin/courses", req.url)
          );
        }
      }
    }

    // Block non-admin from legacy admin-only sub-pages (belt-and-suspenders)
    const adminOnlyPaths = [
      "/admin/users",
      "/admin/analytics",
      "/admin/reports",
      "/admin/categories",
      "/admin/certificates",
      "/admin/certificate-settings",
      "/admin/audit-log",
      "/admin/enrollments",
      "/admin/scholar-applications",
      "/admin/scholars",
      "/admin/instructors",
      "/admin/cms",
      "/admin/newsletter",
    ];
    const isAdminOnlyPath = adminOnlyPaths.some((p) =>
      pathnameWithoutLocale.startsWith(p)
    );
    if (isAdminOnlyPath && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/courses", req.url));
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

        // Never block auth pages, API routes, or static assets
        if (
          pathnameWithoutLocale.startsWith("/login") ||
          pathnameWithoutLocale.startsWith("/register") ||
          pathnameWithoutLocale.startsWith("/forgot-password") ||
          pathnameWithoutLocale.startsWith("/reset-password") ||
          pathnameWithoutLocale.startsWith("/verify-email") ||
          pathnameWithoutLocale.startsWith("/verify-certificate") ||
          pathnameWithoutLocale.startsWith("/certificates/verify") ||
          pathnameWithoutLocale.startsWith("/verify") ||
          pathnameWithoutLocale.startsWith("/courses") ||
          pathnameWithoutLocale.startsWith("/contact") ||
          pathnameWithoutLocale.startsWith("/lectures") ||
          pathnameWithoutLocale.startsWith("/scholars") ||
          pathname.startsWith("/api/") ||
          pathname.startsWith("/_next/")
        ) {
          return true;
        }

        // /admin — ADMIN has full access; INSTRUCTOR/SCHOLAR limited to course builder
        if (pathnameWithoutLocale.startsWith("/admin")) {
          if (!token) return false;
          if (token.role === "ADMIN") return true;
          // Instructors may only reach course-builder paths
          const instructorAllowed = [
            "/admin/courses",
            "/admin/lectures",
            "/admin/modules",
            "/admin/my-analytics",
          ];
          return (
            (token.role === "INSTRUCTOR" || (token.role as string) === "SCHOLAR") &&
            instructorAllowed.some((p) => pathnameWithoutLocale.startsWith(p))
          );
        }

        // /dashboard requires any authenticated user
        // /dashboard/instructor is accessible to INSTRUCTOR and ADMIN
        if (pathnameWithoutLocale.startsWith("/dashboard")) {
          if (!token) return false;
          if (pathnameWithoutLocale.startsWith("/dashboard/instructor")) {
            return token.role === "INSTRUCTOR" || token.role === "ADMIN" || (token.role as string) === "SCHOLAR";
          }
          return true;
        }

        // Other protected routes — any authenticated user
        if (
          pathnameWithoutLocale.startsWith("/profile") ||
          pathnameWithoutLocale.startsWith("/onboarding") ||
          pathnameWithoutLocale.startsWith("/scholar-application") ||
          pathnameWithoutLocale.startsWith("/quiz") ||
          pathnameWithoutLocale.startsWith("/settings")
        ) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/en/login",
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
