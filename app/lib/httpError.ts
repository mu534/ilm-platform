/**
 * Typed HTTP error for API routes. handleApiError maps `status` onto the
 * response so authz helpers can `throw` instead of returning NextResponse.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}
