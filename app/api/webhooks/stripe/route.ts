import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../lib/stripe";
import { prisma } from "../../../lib/prism";
import { createEnrollment, AlreadyEnrolledError, checkPrerequisites } from "../../../lib/enrollment";

/**
 * POST /api/webhooks/stripe
 *
 * This is the ONLY place that grants access to a paid course — never the
 * checkout-creation endpoint, and never anything client-side.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await prisma.payment.updateMany({
          where: { stripeCheckoutSessionId: session.id, status: "PENDING" },
          data:  { status: "FAILED" },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[stripe webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Only grant access for actually paid sessions
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    // eslint-disable-next-line no-console
    console.error(
      `[stripe webhook] Ignoring session ${session.id} with payment_status=${session.payment_status}`,
    );
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (!payment) {
    // eslint-disable-next-line no-console
    console.error(`[stripe webhook] No Payment record found for session ${session.id}`);
    return;
  }

  // Idempotent — Stripe may deliver the same event more than once.
  if (payment.status === "COMPLETED") return;

  // Validate metadata against the authoritative Payment row — never trust
  // client-controlled metadata alone for user/course identity.
  const metaUserId = session.metadata?.userId;
  const metaCourseId = session.metadata?.courseId;
  if (
    (metaUserId && metaUserId !== payment.userId) ||
    (metaCourseId && metaCourseId !== payment.courseId)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      `[stripe webhook] Metadata mismatch for session ${session.id}: ` +
      `meta=(${metaUserId},${metaCourseId}) payment=(${payment.userId},${payment.courseId})`,
    );
    return;
  }

  // Verify the course is still a valid purchasable course
  const course = await prisma.course.findUnique({
    where: { id: payment.courseId },
    select: {
      id: true, enrollmentType: true, price: true,
      published: true, status: true, approvalStatus: true,
    },
  });
  if (!course || course.enrollmentType !== "PAID" || course.price <= 0) {
    // eslint-disable-next-line no-console
    console.error(`[stripe webhook] Course ${payment.courseId} is not purchasable`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status:                "COMPLETED",
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  // For paid courses, prerequisites are checked at checkout time (before payment),
  // but we re-verify here to be safe — the prerequisite state could theoretically
  // change between checkout creation and payment completion.
  const prereqCheck = await checkPrerequisites(payment.userId, payment.courseId);
  if (!prereqCheck.satisfied) {
    // eslint-disable-next-line no-console
    console.error(
      `[stripe webhook] Prerequisites not satisfied for user=${payment.userId} course=${payment.courseId}. Enrollment skipped.`,
    );
    return;
  }

  try {
    await createEnrollment(payment.userId, payment.courseId);
  } catch (err) {
    if (!(err instanceof AlreadyEnrolledError)) throw err;
  }
}
