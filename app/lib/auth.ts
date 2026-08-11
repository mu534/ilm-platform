import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
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

async function loadDbUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, email: true, image: true },
  });
}

async function loadDbUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true, email: true, image: true },
  });
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
        try {
          const existing = await prisma.user.findUnique({ where: { email: user.email! } });

          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name ?? "Google User",
                image: user.image ?? null,
                password: null,
                role: "USER",
                emailVerified: true,
              },
            });
          } else if (!existing.image && user.image) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { image: user.image },
            });
          }
        } catch {
          // Log but don't block sign-in — user may already exist
        }
        return true;
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Always redirect to our callback page for role-based routing after sign-in
      // This ensures server-side security for role determination
      return `${baseUrl}/auth/callback`;
    },

    async jwt({ token, user, account }) {
      // Fresh sign-in
      if (user) {
        if (account?.provider === "google" && user.email) {
          // Always bind JWT to the Prisma user id + authoritative role (not Google's sub)
          try {
            const dbUser = await loadDbUserByEmail(user.email);
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role as UserRole;
              token.name = dbUser.name;
              token.email = dbUser.email;
              token.picture = dbUser.image;
              token.roleSyncedAt = Date.now();
              return token;
            }
          } catch {
            // Fall through to best-effort token population
          }
        }

        token.id = user.id;
        token.role = (user.role as UserRole) ?? "USER";
        token.roleSyncedAt = Date.now();
        return token;
      }

      // Subsequent requests — refresh role from DB on an interval so demotions apply
      const syncedAt = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      const needsSync =
        !token.role ||
        !token.id ||
        Date.now() - syncedAt >= ROLE_SYNC_INTERVAL_MS;

      if (needsSync && (token.id || token.email)) {
        try {
          const dbUser = token.id
            ? await loadDbUserById(token.id as string)
            : token.email
              ? await loadDbUserByEmail(token.email as string)
              : null;

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role as UserRole;
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            token.roleSyncedAt = Date.now();
          }
        } catch {
          // DB unavailable — keep existing token values
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role;
      session.user.name = token.name as string | null;
      session.user.email = token.email as string | null;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
};
