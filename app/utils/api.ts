// src/utils/api.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return errorResponse(error.message, error.status, error.details);
  }
  if (error instanceof ZodError) {
    return errorResponse("Validation failed", 422, error.flatten().fieldErrors);
  }

  console.error("[API Error]", error);

  // Mask Prisma/internal errors to avoid exposing database schema or internal paths
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    ((error as { code: string }).code.startsWith("P") || (error as { name?: string }).name?.includes("Prisma"))
  ) {
    return errorResponse("Database error occurred", 500);
  }

  return errorResponse("An unexpected internal error occurred", 500);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
