import Stripe from "stripe";

declare global {
	// eslint-disable-next-line no-var
	var __stripe: Stripe | undefined;
}

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

const stripe =
	global.__stripe ??
	new Stripe(process.env.STRIPE_SECRET_KEY, {
		typescript: true,
	});

global.__stripe = stripe;

export default stripe;
