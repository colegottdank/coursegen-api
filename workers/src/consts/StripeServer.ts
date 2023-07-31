import Stripe from "stripe";
import { Env } from "../worker";

class StripeServer {
  private static instance: Stripe;

  private constructor() {}

  public static getInstance(env: Env): Stripe {
    if (!StripeServer.instance) {
      StripeServer.instance = new Stripe(env.STRIPE_API_KEY, {
        apiVersion: "2022-11-15",
      });
    }

    return StripeServer.instance;
  }
}

export default StripeServer;
