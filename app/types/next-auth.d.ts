import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

type UserRole = "ADMIN" | "INSTRUCTOR" | "USER";
export interface SessionUser {
  id: string;
  role: UserRole;
  name: string | null;
  email: string | null;
  image: string | null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      /** Mirrors LearnerProfile.onboardingCompleted in the database. */
      onboardingCompleted: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    /** Epoch ms of last DB role sync — used to refresh stale JWT roles. */
    roleSyncedAt?: number;
    /** Mirrors LearnerProfile.onboardingCompleted in the database. */
    onboardingCompleted?: boolean;
  }
}
