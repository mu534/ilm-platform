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
  type: z.enum(["TEXT", "VIDEO", "AUDIO", "PDF"]),
  tags: z.array(z.string()).max(10, "Maximum 10 tags").default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  scholarId: z.string().optional(),
  moduleId: z.string().optional(),
  categoryId: z.string().optional(),
  order: z.number().int().default(0),
  duration: z.number().int().optional(),
  mediaUrl: z.string().url("Invalid media URL").optional().or(z.literal("")),
  thumbnailUrl: z
    .string()
    .url("Invalid thumbnail URL")
    .optional()
    .or(z.literal("")),
});

// ─── Course ───────────────────────────────────────────────────────────────────

export const courseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  subtitle: z
    .string()
    .max(300, "Subtitle must be less than 300 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be less than 5000 characters"),
  thumbnailUrl: z
    .string()
    .url("Invalid thumbnail URL")
    .optional()
    .or(z.literal("")),
  bannerUrl: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .or(z.literal("")),
  objectives:        z.array(z.string()).max(20).default([]),
  prerequisites:     z.array(z.string()).max(20).default([]),
  difficulty:        z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  language:          z.string().max(10).default("en"),
  estimatedDuration: z.number().int().min(0).default(0),
  tags:              z.array(z.string()).max(15, "Maximum 15 tags").default([]),
  featured:          z.boolean().default(false),
  published:         z.boolean().default(false),
  categoryId:        z.string().optional(),
  scholarId:         z.string().optional(),
  enrollmentType:    z.enum(["FREE", "PAID"]).default("FREE"),
  price:             z.number().int().min(0).max(99999999).default(0), // cents
  currency:          z.string().min(3).max(3).default("usd"),
  sequentialLearning: z.boolean().default(false),
  // SEO
  seoTitle:          z.string().max(70,  "SEO title max 70 chars").optional().or(z.literal("")),
  seoDescription:    z.string().max(160, "SEO description max 160 chars").optional().or(z.literal("")),
});

// ─── Module ───────────────────────────────────────────────────────────────────

export const moduleSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000).optional(),
  order: z.number().int().default(0),
  courseId: z.string().min(1, "Course ID is required"),
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
  parentId: z.string().optional(),
});

// ─── User ────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["ADMIN", "SCHOLAR", "USER"]).optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "ar", "om"]).optional(),
});

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export const quizSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  moduleId: z.string().min(1, "Module ID is required"),
  passingScore: z.number().int().min(1).max(100).default(70),
  timeLimit: z.number().int().min(1).optional(),
});

export const quizQuestionSchema = z.object({
  question: z.string().min(5).max(1000),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE"]),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.string().min(1),
  explanation: z.string().max(1000).optional(),
  order: z.number().int().default(0),
  points: z.number().int().min(1).default(1),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type RegisterInput   = z.infer<typeof registerSchema>;
export type LoginInput      = z.infer<typeof loginSchema>;
export type LectureInput    = z.infer<typeof lectureSchema>;
export type CourseInput     = z.infer<typeof courseSchema>;
export type ModuleInput     = z.infer<typeof moduleSchema>;
export type ScholarInput    = z.infer<typeof scholarSchema>;
export type CommentInput    = z.infer<typeof commentSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QuizInput       = z.infer<typeof quizSchema>;
