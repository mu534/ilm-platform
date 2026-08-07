import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prism";
import { getStripe } from "../../../../lib/stripe";
import { successResponse, errorResponse, handleApiError } from "../../../../utils/api";
import type { SessionUser } from "../../../../types/auth.types";

/**
 * POST /api/courses/[id]/checkout
 * Creates a Stripe Checkout Session and returns its URL for the client to
 * redirect to. Access is only granted once Stripe confirms payment via the
 * `checkout.session.completed` webhook — never here.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) return errorResponse("Sign in required to purchase this course", 401);

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId, published: true },
      select: {
        id: true, slug: true, title: true, thumbnailUrl: true,
        enrollmentType: true, price: true, currency: true,
        stripeProductId: true, stripePriceId: true,
      },
    });
    if (!course) return errorResponse("Course not found or not published", 404);
    if (course.enrollmentType !== "PAID" || course.price <= 0) {
      return errorResponse("This course is free — use the regular enroll endpoint", 400);
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existingEnrollment) return errorResponse("You are already enrolled in this course", 409);

    const stripe = getStripe();

    // ── Get or create the Stripe Customer for this user ──────────────────────
    const dbUser = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    });
    let customerId = dbUser?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    dbUser?.email ?? undefined,
        name:     dbUser?.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    // ── Get or create the Stripe Product/Price for this course ───────────────
    // Cached on the course row so we don't recreate them on every checkout.
    let priceId = course.stripePriceId;
    if (!priceId) {
      const product = await stripe.products.create({
        name:        course.title,
        images:      course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
        metadata:    { courseId: course.id },
      });
      const price = await stripe.prices.create({
        product:     product.id,
        unit_amount: course.price,
        currency:    course.currency,
      });
      priceId = price.id;
      await prisma.course.update({
        where: { id: course.id },
        data:  { stripeProductId: product.id, stripePriceId: price.id },
      });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode:                 "payment",
      customer:              customerId,
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:           `${origin}/courses/${course.slug}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:            `${origin}/courses/${course.slug}?checkout=cancelled`,
      client_reference_id:   user.id,
      metadata:              { userId: user.id, courseId: course.id },
    });

    if (!checkoutSession.url) return errorResponse("Failed to create checkout session", 500);

    await prisma.payment.create({
      data: {
        userId:                  user.id,
        courseId:                course.id,
        amount:                  course.price,
        currency:                course.currency,
        status:                  "PENDING",
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    return successResponse({ url: checkoutSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
