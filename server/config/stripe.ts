import Stripe from "stripe";
import { env } from "./env.js";

// One shared client for the whole server. Without an explicit apiVersion the SDK
// uses the version it was built for, so upgrading the package is a deliberate step.
export const stripe = new Stripe(env.stripeSecretKey);
