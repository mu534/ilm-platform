import type { DefaultJWT } from "next-auth/jwt";

export type UserRole = "ADMIN" | "SCHOLAR" | "USER";
export type LectureType = "TEXT" | "VIDEO" | "AUDIO";

export interface SessionUser {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface LectureAuthor {
  id: string;
  name: string;
  image: string | null;
}

export interface LectureScholar {
  id: string;
  bio: string;
  photo: string | null;
  topics: string[];
  user: { name: string };
}

export interface Lecture {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: string | null;
  type: LectureType;
  mediaUrl?: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: string;
  author: LectureAuthor;
  scholar?: LectureScholar | null;
  _count?: { comments: number };
}

export interface ScholarUser {
  name: string;
  email: string;
  image: string | null;
}

export interface Scholar {
  id: string;
  userId: string;
  bio: string;
  photo: string | null;
  topics: string[];
  qualifications: string[];
  featured: boolean;
  user: ScholarUser;
  _count?: { lectures: number };
}

export interface CommentAuthor {
  id: string;
  name: string;
  image: string | null;
}

export interface Comment {
  id: string;
  body: string;
  lectureId: string;
  approved: boolean;
  createdAt: string;
  author: CommentAuthor;
}

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
  }
}
