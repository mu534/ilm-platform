import { describe, it, expect } from "vitest";
import { HttpError } from "../app/lib/httpError";
import { handleApiError, errorResponse, successResponse } from "../app/utils/api";
import { ZodError, z } from "zod";

describe("HttpError + handleApiError", () => {
  it("maps HttpError status onto the JSON response", async () => {
    const res = handleApiError(new HttpError("Forbidden", 403));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "Forbidden" });
  });

  it("maps ZodError to 422", async () => {
    const schema = z.object({ id: z.string().min(1) });
    let zodErr: ZodError | null = null;
    try {
      schema.parse({ id: "" });
    } catch (e) {
      zodErr = e as ZodError;
    }
    const res = handleApiError(zodErr!);
    expect(res.status).toBe(422);
  });

  it("successResponse wraps data", async () => {
    const res = successResponse({ ok: true }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { ok: true } });
  });

  it("errorResponse includes optional details", async () => {
    const res = errorResponse("bad", 400, { field: "x" });
    const body = await res.json();
    expect(body.details).toEqual({ field: "x" });
  });
});
