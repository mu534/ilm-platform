import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily-initialized Stripe client. Only throws when a paid-course code
 * path actually tries to use it — an instance running free courses only
 * should never need STRIPE_SECRET_KEY configured at all.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Paid courses require a Stripe " +
      "secret key — see .env.example.",
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
  });
  return _stripe;
}
