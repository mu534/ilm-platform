import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import { prisma } from "../lib/prism";

type UserRole = "ADMIN" | "INSTRUCTOR" | "USER";

/**
 * Determine the appropriate post-login destination based on user role and onboarding status.
 * This function performs server-side checks using the database to ensure security.
 */
export async function getPostLoginDestination(userId: string, userRole: UserRole): Promise<string> {
  // ADMIN always goes to /admin
  if (userRole === "ADMIN") {
    return "/admin";
  }

  // INSTRUCTOR always goes to /dashboard/instructor
  if (userRole === "INSTRUCTOR") {
    return "/dashboard/instructor";
  }

  // USER role: check onboarding completion
  if (userRole === "USER") {
    const learnerProfile = await prisma.learnerProfile.findUnique({
      where: { userId },
      select: { onboardingCompleted: true },
    });

    // If no profile exists or onboarding not complete, send to onboarding
    if (!learnerProfile || !learnerProfile.onboardingCompleted) {
      return "/onboarding";
    }

    // Onboarding complete, send to dashboard
    return "/dashboard";
  }

  // Fallback for any unexpected role
  return "/dashboard";
}

/** Re-sync role from DB at most every 60s so demotions/promotions take effect without full re-login. */
const ROLE_SYNC_INTERVAL_MS = 60_000;

const userTokenSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  image: true,
  learnerProfile: { select: { onboardingCompleted: true } },
} as const;

type DbTokenUser = {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
  image: string | null;
  learnerProfile: { onboardingCompleted: boolean } | null;
};

async function loadDbUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userTokenSelect });
}

async function loadDbUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: userTokenSelect });
}

/**
 * Copy the authoritative database state onto the JWT. Onboarding status lives
 * in the database (LearnerProfile) — never in client storage — and admins and
 * instructors are not learners, so they are never gated by onboarding.
 */
function applyDbUserToToken(token: JWT, dbUser: DbTokenUser) {
  token.id = dbUser.id;
  token.role = dbUser.role as UserRole;
  token.name = dbUser.name;
  token.email = dbUser.email;
  token.picture = dbUser.image;
  token.onboardingCompleted =
    dbUser.role === "USER" ? Boolean(dbUser.learnerProfile?.onboardingCompleted) : true;
  token.roleSyncedAt = Date.now();
  return token;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/en/login",
    error:  "/en/login",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            role: true,
            emailVerified: true,
          },
        });

        if (!user?.password) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          role: user.role as UserRole,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          console.error("[Auth] Google signIn: no email on user object");
          return false;
        }
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, image: true, role: true },
          });

          // Auto-promote emails listed in ADMIN_EMAILS env var
          const adminEmails = (process.env.ADMIN_EMAILS ?? "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const isAdminEmail = adminEmails.includes(user.email.toLowerCase());

          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? "Google User",
                image: user.image ?? null,
                password: null,
                role: isAdminEmail ? "ADMIN" : "USER",
                emailVerified: true,
              },
            });
          } else {
            // Update image if missing; also promote to ADMIN if in ADMIN_EMAILS and not already
            const updates: Record<string, unknown> = {};
            if (!existing.image && user.image) updates.image = user.image;
            if (isAdminEmail && existing.role !== "ADMIN") updates.role = "ADMIN";
            if (Object.keys(updates).length > 0) {
              await prisma.user.update({ where: { id: existing.id }, data: updates });
            }
          }
        } catch (err) {
          console.error("[Auth] Google signIn error:", err);
          // Concurrent first sign-in may have created the row already; only
          // allow sign-in when the account genuinely exists.
          const created = await prisma.user
            .findUnique({ where: { email: user.email }, select: { id: true } })
            .catch((e) => { console.error("[Auth] fallback lookup error:", e); return null; });
          if (!created) return false;
        }
        return true;
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      // After sign-out → home
      if (url.includes("/signout") || url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/en`;
      }

      // After sign-in → home page (not dashboard)
      // Users can navigate to dashboard, courses, etc. from there.
      // Onboarding is still enforced by the middleware for new users.
      if (url.includes("/auth/callback") || url.includes("/api/auth")) {
        return `${baseUrl}/en`;
      }

      // If a specific callbackUrl was requested (e.g. from a protected page),
      // honour it so users land where they intended.
      if (url.startsWith(baseUrl)) {
        return url;
      }

      return `${baseUrl}/en`;
    },

    async jwt({ token, user, account, trigger }) {
      // Fresh sign-in — bind the JWT to the Prisma user (never Google's sub)
      if (user) {
        try {
          const dbUser =
            account?.provider === "google" && user.email
              ? await loadDbUserByEmail(user.email)
              : await loadDbUserById(user.id);
          if (dbUser) return applyDbUserToToken(token, dbUser);
        } catch {
          // Fall through to best-effort token population
        }

        token.id = user.id;
        token.role = (user.role as UserRole) ?? "USER";
        token.onboardingCompleted = token.role !== "USER";
        token.roleSyncedAt = Date.now();
        return token;
      }

      // Subsequent requests — refresh from DB on an interval so demotions and a
      // finished onboarding apply. `session.update()` forces an immediate sync.
      const syncedAt = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      const needsSync =
        trigger === "update" ||
        !token.role ||
        !token.id ||
        typeof token.onboardingCompleted !== "boolean" ||
        Date.now() - syncedAt >= ROLE_SYNC_INTERVAL_MS;

      if (needsSync && (token.id || token.email)) {
        try {
          const dbUser = token.id
            ? await loadDbUserById(token.id as string)
            : token.email
              ? await loadDbUserByEmail(token.email as string)
              : null;

          if (dbUser) applyDbUserToToken(token, dbUser);
        } catch {
          // DB unavailable — keep existing token values
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role;
      session.user.onboardingCompleted = token.onboardingCompleted ?? false;
      session.user.name = token.name as string | null;
      session.user.email = token.email as string | null;
      session.user.image = (token.picture as string | null) ?? null;
      return session;
    },
  },
};