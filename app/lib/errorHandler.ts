/**
 * Centralized error handling utilities for the Ilm Platform
 * Provides consistent error handling across API routes, server actions, and client components
 */

import { HttpError } from "./httpError";

/**
 * Sanitize error messages for user-facing display
 * Removes technical details, stack traces, and sensitive information
 */
export function getUserFacingMessage(error: unknown): string {
  // Handle known HttpError types
  if (error instanceof HttpError) {
    return error.message;
  }

  // Handle Prisma errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Prisma constraint violations
    if (message.includes("unique constraint")) {
      return "This record already exists. Please use a different value.";
    }
    if (message.includes("foreign key constraint")) {
      return "This operation conflicts with related data. Please check your inputs.";
    }
    if (message.includes("record not found")) {
      return "The requested record was not found.";
    }
    
    // Database connection errors
    if (message.includes("connection") || message.includes("timeout")) {
      return "Unable to connect to the database. Please try again later.";
    }
  }

  // Default generic message
  return "Something went wrong. Please try again.";
}

/**
 * Determine if an error should be logged to monitoring (vs expected user errors)
 */
export function shouldLogToMonitoring(error: unknown): boolean {
  // Don't log expected validation/authorization errors
  if (error instanceof HttpError) {
    const statusCode = (error as HttpError).status;
    // 4xx errors are typically client errors, not worth monitoring
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }
  }

  // Log all other errors
  return true;
}

/**
 * Extract safe error context for monitoring
 * Removes sensitive information like passwords, tokens, emails
 */
export function getSafeErrorContext(error: unknown, context?: Record<string, unknown>): Record<string, unknown> {
  const safeContext: Record<string, unknown> = { ...context };

  // Remove sensitive fields
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "email",
    "authorization",
    "cookie",
    "session",
  ];

  sensitiveKeys.forEach((key) => {
    if (safeContext[key]) {
      safeContext[key] = "[REDACTED]";
    }
  });

  // Add error details
  if (error instanceof Error) {
    safeContext.errorName = error.name;
    safeContext.errorMessage = error.message;
  }

  return safeContext;
}

/**
 * Standard API error response handler
 * Returns consistent error responses across all API routes
 */
export function handleApiError(error: unknown) {
  console.error("[API Error]", error);

  const userMessage = getUserFacingMessage(error);
  const statusCode = error instanceof HttpError ? error.status : 500;

  return {
    success: false,
    error: userMessage,
    statusCode,
  };
}

/**
 * Wrap async functions with consistent error handling
 * Useful for server actions and API route handlers
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    errorMessage?: string;
    logToMonitoring?: boolean;
  }
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (options?.logToMonitoring !== false && shouldLogToMonitoring(error)) {
        // In production, this would send to Sentry
        console.error("[Error Monitoring]", getSafeErrorContext(error));
      }
      throw error;
    }
  }) as T;
}
