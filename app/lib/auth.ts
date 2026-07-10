import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider      from "next-auth/providers/google";
import bcrypt              from "bcryptjs";
import { prisma }          from "../lib/prism";

type UserRole = "ADMIN" | "SCHOLAR" | "USER";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },

  providers: [
    // ── Google OAuth ───────────────────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // ── Email + Password ───────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where:  { email: credentials.email },
          select: { id: true, email: true, name: true, image: true, password: true, role: true, emailVerified: true },
        });

        if (!user?.password) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        // Block unverified users — only enforce when email verification is enabled
        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image ?? null, role: user.role as UserRole };
      },
    }),
  ],

  callbacks: {
    // ── Google: auto-create or link user ───────────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({ where: { email: user.email! } });

        if (!existing) {
          await prisma.user.create({
            data: {
              email:         user.email!,
              name:          user.name  ?? "Google User",
              image:         user.image ?? null,
              password:      null,
              role:          "USER",
              emailVerified: true, // Google accounts are pre-verified
            },
          });
        } else if (!existing.image && user.image) {
          // Sync avatar from Google if not set
          await prisma.user.update({ where: { id: existing.id }, data: { image: user.image } });
        }
        return true;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user.role as UserRole) ?? "USER";
      } else if (token.id) {
        // Refresh from DB on every token refresh
        const dbUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { role: true, name: true, email: true, image: true },
        });
        if (dbUser) {
          token.role    = dbUser.role as UserRole;
          token.name    = dbUser.name;
          token.email   = dbUser.email;
          token.picture = dbUser.image;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id    = token.id as string;
      session.user.role  = token.role;
      session.user.name  = token.name  as string | null;
      session.user.email = token.email as string | null;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
};
