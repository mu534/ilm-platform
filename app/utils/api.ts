// src/utils/api.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";

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
  console.error("[API Error]", error);
  if (error instanceof ZodError) {
    return errorResponse("Validation failed", 422, error.flatten().fieldErrors);
  }
  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }
  return errorResponse("Internal server error", 500);
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
