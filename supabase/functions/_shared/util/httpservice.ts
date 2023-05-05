import { corsHeaders } from "./../consts/cors.ts";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "../database.types.ts";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { UserDao } from "../daos/UserDao.ts";
import { GeneratingStatus } from "../Statuses.ts";
import { NotFoundError, SupabaseError, TooManyRequestsError, UnauthorizedError } from "../consts/errors/Errors.ts";

interface IErrorResponse {
  error: {
    code: number;
    message: string;
  };
}

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: "@upstash/ratelimit",
});

export class HttpServiceOptions {
  constructor(public requireLogin: boolean = false, public rateLimit: boolean = true, public isIdle: boolean = true) {}
}

export class HttpService {
  private supabaseClient: SupabaseClient<Database> | null = null;
  private user: User | null = null;
  constructor(private options: HttpServiceOptions, private handler: (req: Request) => Promise<any>) {}

  async handle(req: Request): Promise<Response> {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    console.log(Deno.env.get("UPSTASH_REDIS_REST_URL"));
    console.log(Deno.env.get("UPSTASH_REDIS_REST_TOKEN"));

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    try {
      if (this.options.requireLogin) await this.requireLogin(req);
      if (this.options.rateLimit) await this.rateLimit();
      if (this.options.isIdle) await this.isIdle(req, this.options.requireLogin);

      const response = await this.handler(req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.log("Error:", error.code, error.message);
      let errorCode = error.code || 400;
      const errorResponse: IErrorResponse = { error: { code: errorCode, message: error.message } };
      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorCode,
      });
    }
    finally {
      if (this.options.isIdle) await this.setIdle(req, this.options.requireLogin);
    }
  }

  getSupabaseClient(req: Request): SupabaseClient<Database> {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    try {
      this.supabaseClient = createClient<Database>(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
    } catch (error) {
      console.error("Error creating the client:", error);
      throw new SupabaseError("403", "Error creating the client");
    }

    return this.supabaseClient;
  }

  async isIdle(req: Request, requireLogin: boolean): Promise<void> {
    if (!this.user && requireLogin) throw new UnauthorizedError("You must be logged in to access this endpoint.");
    if (!this.user) return;

    const supabase = this.getSupabaseClient(req);
    const userDao = new UserDao(supabase);
    const profile = await userDao.getProfileByUserId(this.user.id);

    if (!profile) throw new NotFoundError("Profile not found");

    if (profile.generating_status !== GeneratingStatus.Idle.toString()) {
      throw new TooManyRequestsError(
        "You are only allowed one generation at a time. Please wait for your current generation to finish."
      );
    }

    await userDao.updateProfileGeneratingStatus(this.user.id, GeneratingStatus.Generating.toString());
  }

  async setIdle(req: Request, requireLogin: boolean): Promise<void> {
    if (!this.user && requireLogin) throw new UnauthorizedError("You must be logged in to access this endpoint.");
    if (!this.user) return;

    const supabase = this.getSupabaseClient(req);
    const userDao = new UserDao(supabase);
    await userDao.updateProfileGeneratingStatus(this.user.id, GeneratingStatus.Idle.toString());
  }

  async rateLimit(): Promise<void> {
    const identifier = "api";
    const { success } = await ratelimit.limit(identifier);

    if (!success) throw new TooManyRequestsError("Too many requests");
  }

  async requireLogin(req: Request): Promise<void> {
    const supabase = this.getSupabaseClient(req);
    const userDao = new UserDao(supabase);
    this.user = await userDao.getUserByRequest(req);
    // Validate if the user is logged in
    if (!this.user) throw new UnauthorizedError("You must be logged in to access this endpoint.");
  }

  getUser(): User | null {
    if(this.options.requireLogin && !this.user)
    {
      throw new UnauthorizedError("You must be logged in to access this endpoint.");
    }

    return this.user;
  }
}
