import { Role } from '@prisma/client';
import type { SessionUser } from '@/types/auth.types';

// callbacks stay the same but now TypeScript knows the shape
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = user.role as Role;
    }
    return token;
  },
  async session({ session, token }) {
    session.user = {
      ...session.user,
      id: token.id,
      role: token.role,
    };
    return session;
  },
},