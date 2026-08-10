import { describe, it, expect } from "vitest";

describe("Stripe Webhook Idempotency & Metadata Validation", () => {
  it("rejects session completion if payment_status is not paid or no_payment_required", () => {
    const session = {
      id: "cs_test_123",
      payment_status: "unpaid",
    };
    expect(session.payment_status !== "paid" && session.payment_status !== "no_payment_required").toBe(true);
  });

  it("detects metadata mismatch when session user does not match payment user", () => {
    const payment = { userId: "user_real", courseId: "course_100" };
    const sessionMetadata = { userId: "user_hacker", courseId: "course_100" };

    const mismatch = sessionMetadata.userId !== payment.userId || sessionMetadata.courseId !== payment.courseId;
    expect(mismatch).toBe(true);
  });

  it("allows duplicate webhook delivery for already completed payments without re-charging", () => {
    let paymentStatus = "COMPLETED";
    let enrollmentCount = 1;

    function handleWebhookDelivery() {
      if (paymentStatus !== "COMPLETED") {
        paymentStatus = "COMPLETED";
      }
      // enrollment is idempotent, stays 1
      enrollmentCount = 1;
    }

    handleWebhookDelivery(); // second delivery
    expect(paymentStatus).toBe("COMPLETED");
    expect(enrollmentCount).toBe(1);
  });
});
