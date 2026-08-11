import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
  country: z.string().trim().min(2, "Country is required").max(100),
  termsAccepted: z.literal(true, { message: "You must accept the Terms and Privacy Policy" }),
  privacyAccepted: z.literal(true, { message: "You must accept the Privacy Policy" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const learnerProfileSchema = z.object({
  city: z.string().trim().max(100).optional().or(z.literal("")),
  educationLevel: z.string().trim().max(100).optional().or(z.literal("")),
  fieldOfStudy: z.string().trim().max(150).optional().or(z.literal("")),
  occupation: z.string().trim().max(150).optional().or(z.literal("")),
  preferredLanguage: z.string().min(2).max(10).default("en"),
  preferredDifficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  accountIntention: z.enum(["LEARN", "TEACH"]).default("LEARN"),
  categoryIds: z.array(z.string().min(1)).max(12).default([]),
  goals: z.array(z.string().trim().min(2).max(160)).max(8).default([]),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().int().min(1).max(3).optional(),
});

export const scholarApplicationSchema = z.object({
  bio: z.string().trim().min(30).max(3000),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  education: z.string().trim().max(2000).optional().or(z.literal("")),
  institutions: z.array(z.string().trim().min(2).max(200)).max(12).default([]),
  qualifications: z.array(z.string().trim().min(2).max(300)).max(20).default([]),
  specializations: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  teachingExperience: z.string().trim().max(2000).optional().or(z.literal("")),
  teachingYears: z.number().int().min(0).max(80).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).min(1).max(12).refine((ids) => new Set(ids).size === ids.length, "Categories must be unique"),
  teachingLanguages: z.array(z.string().trim().min(2).max(20)).min(1).max(10),
});

export const scholarApplicationDraftSchema = z.object({
  bio: z.string().trim().max(3000).optional(),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  education: z.string().trim().max(2000).optional().or(z.literal("")),
  institutions: z.array(z.string().trim().min(2).max(200)).max(12).optional(),
  qualifications: z.array(z.string().trim().min(2).max(300)).max(20).optional(),
  specializations: z.array(z.string().trim().min(2).max(120)).max(12).optional(),
  teachingExperience: z.string().trim().max(2000).optional().or(z.literal("")),
  teachingYears: z.number().int().min(0).max(80).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).max(12).optional(),
  teachingLanguages: z.array(z.string().trim().min(2).max(20)).max(10).optional(),
});

export const scholarApplicationReviewSchema = z.object({
  action: z.enum(["UNDER_REVIEW", "APPROVE", "REJECT"]),
  internalNotes: z.string().trim().max(3000).optional().or(z.literal("")),
  decisionReason: z.string().trim().max(1500).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.action === "REJECT" && !data.decisionReason) ctx.addIssue({ code: "custom", path: ["decisionReason"], message: "A rejection reason is required" });
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
  shortDescription: z
    .string()
    .max(300, "Short description must be less than 300 characters")
    .optional()
    .or(z.literal("")),
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
  professionalDesignation: z.string().max(100).optional().or(z.literal("")),
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
  role: z.enum(["ADMIN", "INSTRUCTOR", "USER"]).optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "ar", "om"]).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  certificateName: z.string().trim().min(2).max(100).optional().or(z.literal("")),
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

export const quizSubmissionSchema = z.object({
  timeTaken: z.number().int().min(0).optional(),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.string(),
    })
  ).min(1, "At least one answer is required"),
});

export const createReportSchema = z.object({
  reason: z.enum(["SPAM", "INAPPROPRIATE", "INCORRECT_CONTENT", "ABUSE", "OTHER"]),
  description: z.string().max(1000).optional(),
  commentId: z.string().optional(),
  forumQuestionId: z.string().optional(),
  forumReplyId: z.string().optional(),
  courseId: z.string().optional(),
}).refine(
  (data) => Boolean(data.commentId || data.forumQuestionId || data.forumReplyId || data.courseId),
  { message: "At least one target (commentId, forumQuestionId, forumReplyId, or courseId) must be specified" }
);

export const forumVoteSchema = z.object({
  value: z.number().int().refine((val) => val === 1 || val === -1, { message: "Value must be 1 or -1" }),
  questionId: z.string().optional(),
  replyId: z.string().optional(),
}).refine(
  (data) => Boolean(data.questionId) !== Boolean(data.replyId),
  { message: "Exactly one target (questionId XOR replyId) must be specified" }
);

// ─── Inferred types ──────────────────────────────────────────────────────────

export type RegisterInput       = z.infer<typeof registerSchema>;
export type LearnerProfileInput = z.infer<typeof learnerProfileSchema>;
export type ScholarApplicationInput = z.infer<typeof scholarApplicationSchema>;
export type ScholarApplicationDraftInput = z.infer<typeof scholarApplicationDraftSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type LectureInput        = z.infer<typeof lectureSchema>;
export type CourseInput         = z.infer<typeof courseSchema>;
export type ModuleInput         = z.infer<typeof moduleSchema>;
export type ScholarInput        = z.infer<typeof scholarSchema>;
export type CommentInput        = z.infer<typeof commentSchema>;
export type UpdateUserInput     = z.infer<typeof updateUserSchema>;
export type QuizInput           = z.infer<typeof quizSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;
export type CreateReportInput   = z.infer<typeof createReportSchema>;
export type ForumVoteInput      = z.infer<typeof forumVoteSchema>;
