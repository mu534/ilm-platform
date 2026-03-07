import { Role } from '@prisma/client';
import { DefaultSession } from 'next-auth';

// Extend NextAuth's built-in types
declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}

// Named type you can import anywhere
export interface SessionUser extends DefaultSession['user'] {
  id: string;
  role: Role;
  name: string;
  email: string;
  image?: string | null;
}