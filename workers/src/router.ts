import { IRequest, Router, createCors, error } from "itty-router";
import { CourseManager } from "./managers/CourseManager";
import { NotFoundError, UnauthorizedError } from "./consts/Errors";
import { Env } from "./worker";
import { UserDao } from "./daos/UserDao";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "./consts/database.types";
import { TopicManager } from "./managers/TopicManager";
import { GenerationLogManager } from "./managers/GenerationLogManager";
import { GenerationLogDao } from "./daos/GenerationLogDao";
import { InternalGenerationReferenceType, InternalGenerationStatus } from "./lib/InternalModels";
import * as validators from "./lib/Validators";
import { Environments } from "./consts/Environments";
import { preflight } from "./consts/CorsConfig";
import { LessonContentCreateMessage } from "./lib/Messages";
import Stripe from "stripe";
import StripeServer from "./consts/StripeServer";

// now let's create a router (note the lack of "new")
export type RequestWrapper = {
  env: Env;
  ctx: ExecutionContext;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
  parsedUrl: URL;
} & IRequest;

const router = Router<RequestWrapper>();

router.all("*", preflight, authenticate);

router.post("/api/v1/stripe/create-portal-session", async (request) => {
  try {
    const profile = await request.supabaseClient.from("profile").select("*").eq("id", request.user?.id).single();

    if (profile.error || !profile.data) {
      throw new Error(profile.error.message);
    }

    const stripe = StripeServer.getInstance(request.env);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.data.stripe_id ?? (await getStripeCustomer(request)).id,
      return_url: request.env.FE_URL,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), { status: 200 });
  } catch (error: any) {
    console.log("Error creating portal session:", error);
    // You may want to replace this with a more appropriate error response depending on your use case
    return new Response(JSON.stringify({ message: "Error creating portal session", error: error.toString() }), {
      status: 500,
    });
  }
});

router.post("/api/v1/stripe/create-checkout-session", async (request) => {
  try {
    const stripe = StripeServer.getInstance(request.env);

    // Fetch the list of products
    const products = await stripe.products.list();

    // Find product with name "Pro"
    const proProduct = products.data.find((product) => product.name === "Pro");

    // Make sure the product "Pro" is found
    if (!proProduct) {
      throw new Error("Product 'Pro' not found");
    }

    // Fetch the prices of the "Pro" product
    const prices = await stripe.prices.list({ product: proProduct.id });

    // Make sure there is at least one price for the "Pro" product
    if (prices.data.length === 0) {
      throw new Error("No prices found for the 'Pro' product");
    }

    const customerId = (await getStripeCustomer(request)).id;

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    // Check if any of the active subscriptions belong to the "Pro" product
    const hasProSubscription = existingSubscriptions.data.some((subscription) =>
      subscription.items.data.some((item) => item.price.product === proProduct.id)
    );

    if (hasProSubscription) {
      // The customer already has an active subscription to this plan
      return new Response(JSON.stringify({ message: "You already have an active subscription to this plan" }), {
        status: 400,
      });
    }

    // Use the first price for the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      customer: customerId,
      success_url: `${request.env.FE_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.env.FE_URL}/canceled`,
    });

    if (!session.url) throw new Error("Failed to create session");

    let response = {
      url: session.url,
    };

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
  }
});

async function getStripeCustomer(request: RequestWrapper): Promise<Stripe.Customer> {
  const stripe = StripeServer.getInstance(request.env);
  try {
    const customers = await stripe.customers.list({
      email: request.user?.email,
      expand: ["data.subscriptions"],
    });
    let customer;
    if (customers.data.length === 0) {
      customer = await stripe.customers.create({
        email: request.user?.email,
        name: request.user?.email,
        expand: ["subscriptions"],
      });

      await request.supabaseClient.from("profile").update({ stripe_id: customer.id }).eq("id", request.user?.id);
    } else {
      customer = customers.data[0];
    }
    return customer;
  } catch (err) {
    throw new UnauthorizedError("Failed to get customer");
  }
}

router.post(
  "/api/v1/courses",
  async (request) => await validateGenerationLogs(request, InternalGenerationReferenceType.Course),
  async (request) => {
    let course = new CourseManager();
    return await course.createCourse(request);
  }
);

router.post(
  "/api/v2/courses",
  async (request) => await validateGenerationLogs(request, InternalGenerationReferenceType.Course),
  async (request) => {
    let course = new CourseManager();
    return await course.createCourseV2(request);
  }
);

router.get("/api/v1/courses/:id", async (request) => {
  let course = new CourseManager();
  let publicCourse = await course.getCourse(request);
  return publicCourse;
});

// router.post(
//   "/api/v1/topics",
//   async (request) => await validateGenerationLogs(request, InternalGenerationReferenceType.Lesson),
//   async (request) => {
//     let manager = new TopicManager();
//     return await manager.postTopic(request);
//   }
// );

router.get("/api/v1/generationlogs", authenticate, async (request) => {
  let manager = new GenerationLogManager();
  return await manager.getGenerationLogsByUser(request);
});

router.post("/api/v1/content", authenticate, async (request) => {
  console.log("Received message to create course content");
  let json = await request.json();
  let lessonCreate = json as LessonContentCreateMessage;
  let manager = new TopicManager();
  return await manager.createTopicsForCourse(request.supabaseClient, lessonCreate, request.env);
});

// 404 for everything else
router.all("*", () => error(404));

export default router;

// ###################################################################################
// ################################## MiddleWare #####################################
// ###################################################################################
async function authenticate(request: RequestWrapper, env: Env): Promise<void> {
  let token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new UnauthorizedError("No token provided");

  const userDao = new UserDao(request.supabaseClient);
  request.user = await userDao.getUserByAuthHeader(token);
  // Validate if the user is logged in
  if (!request.user) throw new NotFoundError("User not found");
}

async function validateGenerationLogs(
  request: RequestWrapper,
  reference_type: InternalGenerationReferenceType
): Promise<void> {
  if (request.env.ENVIRONMENT !== Environments.Production) return;
  console.log("Validating generation logs");
  const { supabaseClient, user } = request;
  const generationLogDao = new GenerationLogDao(supabaseClient);
  let generationLogs = await generationLogDao.getGenerationLogByUserIdAndStatus(user!.id, [
    InternalGenerationStatus.InProgress,
  ]);
  validators.validateGenerationLogs(generationLogs, reference_type);
}
