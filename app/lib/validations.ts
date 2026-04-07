import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Lecture ─────────────────────────────────────────────────────────────────

export const lectureSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  content: z.string().optional(),
  type: z.enum(["TEXT", "VIDEO"]),
  tags: z.array(z.string()).max(10, "Maximum 10 tags").default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  scholarId: z.string().optional(),
  mediaUrl: z.string().url("Invalid media URL").optional().or(z.literal("")),
  thumbnailUrl: z
    .string()
    .url("Invalid thumbnail URL")
    .optional()
    .or(z.literal("")),
});

// ─── Scholar ─────────────────────────────────────────────────────────────────

export const scholarSchema = z.object({
  bio: z
    .string()
    .min(20, "Bio must be at least 20 characters")
    .max(3000, "Bio must be less than 3000 characters"),
  topics: z.array(z.string()).min(1, "At least one topic required").max(20),
  qualifications: z.array(z.string()).max(20).default([]),
  featured: z.boolean().default(false),
  photo: z.string().url("Invalid photo URL").optional().or(z.literal("")),
});

// ─── Comment ─────────────────────────────────────────────────────────────────

export const commentSchema = z.object({
  body: z
    .string()
    .min(2, "Comment must be at least 2 characters")
    .max(1000, "Comment must be less than 1000 characters"),
  lectureId: z.string().min(1, "Lecture ID is required"),
});

// ─── User ────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["ADMIN", "SCHOLAR", "USER"]).optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LectureInput = z.infer<typeof lectureSchema>;
export type ScholarInput = z.infer<typeof scholarSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
