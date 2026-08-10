import Stripe from "stripe";
import { prisma } from "../prism";
import { getStripe } from "../stripe";
import { createEnrollment, AlreadyEnrolledError, PrerequisiteNotMetError } from "../enrollment";
import { isPublicCourse, getTrustedAppUrl } from "../courseAccess";
import { HttpError } from "../httpError";

export class PaymentService {
  /**
   * Create or return a Stripe Checkout Session for a paid course.
   * Handles customer ID deduplication and Stripe Product/Price caching atomically.
   * Prevents creating duplicate PENDING payment sessions if an active one already exists.
   */
  static async createCheckoutSession(userId: string, courseId: string): Promise<string> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        thumbnailUrl: true,
        enrollmentType: true,
        price: true,
        currency: true,
        stripeProductId: true,
        stripePriceId: true,
        published: true,
        status: true,
        approvalStatus: true,
      },
    });

    if (!course || !isPublicCourse(course)) {
      throw new HttpError("Course not found or not published", 404);
    }
    if (course.enrollmentType !== "PAID" || course.price <= 0) {
      throw new HttpError("This course is free — use the regular enroll endpoint", 400);
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment) {
      throw new HttpError("You are already enrolled in this course", 409);
    }

    // Reuse existing PENDING checkout payment session if created within the last 30 minutes
    const recentPendingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        courseId,
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    const stripe = getStripe();

    if (recentPendingPayment?.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(recentPendingPayment.stripeCheckoutSessionId);
        if (session.status === "open" && session.url) {
          return session.url;
        }
      } catch {
        // Session expired or invalid on Stripe — continue to create a new session
      }
    }

    // Ensure customer ID atomically
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) throw new HttpError("User not found", 404);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      // Update user with stripeCustomerId (ignore race condition if updated concurrently)
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Ensure product and price atomically
    let priceId = course.stripePriceId;
    if (!priceId) {
      let productId = course.stripeProductId;
      if (!productId) {
        const product = await stripe.products.create({
          name: course.title,
          images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
          metadata: { courseId: course.id },
        });
        productId = product.id;
      }

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: course.price,
        currency: course.currency,
      });
      priceId = price.id;

      await prisma.course.update({
        where: { id: course.id },
        data: { stripeProductId: productId, stripePriceId: priceId },
      });
    }

    const origin = getTrustedAppUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/courses/${course.slug}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${course.slug}?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: { userId: user.id, courseId: course.id },
    });

    if (!checkoutSession.url) {
      throw new HttpError("Failed to create checkout session", 500);
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        amount: course.price,
        currency: course.currency,
        status: "PENDING",
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    return checkoutSession.url;
  }

  /**
   * Process a Stripe webhook event idempotently.
   */
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await prisma.payment.updateMany({
          where: { stripeCheckoutSessionId: session.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        break;
      }
      default:
        break;
    }
  }

  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });
    if (!payment) return;

    const metaUserId = session.metadata?.userId;
    const metaCourseId = session.metadata?.courseId;
    if (
      (metaUserId && metaUserId !== payment.userId) ||
      (metaCourseId && metaCourseId !== payment.courseId)
    ) {
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: payment.courseId },
      select: { id: true, enrollmentType: true, price: true },
    });
    if (!course || course.enrollmentType !== "PAID" || course.price <= 0) {
      return;
    }

    // Idempotent payment update
    if (payment.status !== "COMPLETED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        },
      });
    }

    // Attempt enrollment idempotently
    try {
      await createEnrollment(payment.userId, payment.courseId, { skipPublicCheck: true });
    } catch (err) {
      if (err instanceof AlreadyEnrolledError || err instanceof PrerequisiteNotMetError) {
        return;
      }
      throw err;
    }
  }
}
