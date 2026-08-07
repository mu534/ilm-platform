import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../lib/stripe";
import { prisma } from "../../../lib/prism";
import { createEnrollment, AlreadyEnrolledError } from "../../../lib/enrollment";

/**
 * POST /api/webhooks/stripe
 *
 * This is the ONLY place that grants access to a paid course — never the
 * checkout-creation endpoint, and never anything client-side. Stripe calls
 * this directly from their servers once a payment is actually confirmed.
 *
 * Register this URL in the Stripe Dashboard (or via `stripe listen` for
 * local testing) subscribed to at least `checkout.session.completed`.
 *
 * Signature verification requires the RAW request body — this route reads
 * it via req.text() before any JSON parsing, which Next.js Route Handlers
 * support natively (no special config needed, unlike the old Pages Router).
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
        // Unhandled event types are fine to ignore
        break;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[stripe webhook] Error handling ${event.type}:`, err);
    // Return 500 so Stripe retries — this is a server-side failure, not a
    // bad event, and we want another attempt rather than silently dropping it.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status:                 "COMPLETED",
      stripePaymentIntentId:  typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  try {
    await createEnrollment(payment.userId, payment.courseId);
  } catch (err) {
    // Already enrolled (e.g. duplicate webhook delivery racing itself, or
    // the user was granted access some other way in the meantime) — the
    // payment is still correctly marked COMPLETED above, so this is fine.
    if (!(err instanceof AlreadyEnrolledError)) throw err;
  }
}
