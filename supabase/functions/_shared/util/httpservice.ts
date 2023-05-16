import { GeneratingStatus } from './../Statuses.ts';
import { corsHeaders } from "./../consts/cors.ts";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "../database.types.ts";
import { Redis } from "@upstash/redis";
import { UserDao } from "../daos/UserDao.ts";
import { AlreadyGeneratingError, NotFoundError, SupabaseError, UnauthorizedError } from "../consts/Errors.ts";

interface IErrorResponse {
  error: {
    code: number;
    message: string;
  };
}

// const redis = new Redis({
//   url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
//   token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
// });

// const ratelimit = new Ratelimit({
//   redis: Redis.fromEnv(),
//   limiter: Ratelimit.slidingWindow(10, "10 s"),
//   analytics: true,
//   /**
//    * Optional prefix for the keys used in redis. This is useful if you want to share a redis
//    * instance with other applications and want to avoid key collisions. The default prefix is
//    * "@upstash/ratelimit"
//    */
//   prefix: "@upstash/ratelimit",
// });

export class HttpServiceOptions {
  constructor(public requireLogin: boolean = false, public rateLimit: boolean = true, public isIdle: boolean = true, public isAsync: boolean = false) {}
}

export class HttpService {
  private supabaseClient: SupabaseClient<Database> | null = null;
  private user: User | null = null;
  private context: any = {};
  constructor(private options: Partial<HttpServiceOptions> = new HttpServiceOptions(), private handler: (reqJson?: string, context?: any) => Promise<any>, private preHandle?: (reqJson?: string, context?: any) => Promise<any>) {}

  async handle(req: Request): Promise<Response> {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    this.context = {};

    try {
      await this.runMiddleware(req);
      const reqJson = await req.json();

      // If async, run the preHandle function, set timeout to run the handler (async), and return a 202 response
      if (this.options.isAsync && this.preHandle) {
        const response = await this.preHandle(reqJson, this.context);
        setTimeout(async () => {
          try {
            await this.handler(reqJson, this.context);
          } finally {
            await this.resetIdleStatus();
          }
        }, 1);

        return this.createResponse(response, 202);
      }

      const response = await this.handler(reqJson, this.context);
      return this.createResponse(response, 200);
    }
    catch (error) {
      return this.handleError(error);
    }
    finally {
      if (!this.options.isAsync) {
        await this.resetIdleStatus();
      }

      this.context.TooManyRequests = false;
    }
  }

  getSupabaseClient(): SupabaseClient<Database> {
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

  getUser(): User | null {
    if(this.options.requireLogin && !this.user)
    {
      throw new UnauthorizedError("You must be logged in to access this endpoint.");
    }

    return this.user;
  }

  private createResponse(body: any, status: number = 200): Response {
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }

  private handleError(error: any): Response {
    if (error instanceof AlreadyGeneratingError) {
      this.context.TooManyRequests = true;
    }

    let errorCode = error.code || 400;
    const errorResponse: IErrorResponse = { error: { code: errorCode, message: error.message } };
    return this.createResponse(errorResponse, errorCode);
  }

  private async resetIdleStatus(): Promise<void> {
    if (this.options.isIdle && this.options.requireLogin && !this.context.TooManyRequests) {
      await this.setIdle();
    }
  }

  async setIdle(): Promise<void> {
    const supabase = this.getSupabaseClient();
    const userDao = new UserDao(supabase);
    await userDao.updateProfileGeneratingStatus(this.user!.id, GeneratingStatus.Idle.toString());
  }

  private async runMiddleware(req: Request): Promise<void> {
    if (this.options.requireLogin) await this.requireLogin(req);
    // if (this.options.rateLimit) await this.rateLimit();
    if (this.options.isIdle && this.options.requireLogin) await this.isIdle();
  }

  async isIdle(): Promise<void> {
    const supabase = this.getSupabaseClient();
    const userDao = new UserDao(supabase);
    const profile = await userDao.getProfileByUserId(this.user!.id);

    if (!profile) throw new NotFoundError("Profile not found");

    if (profile.generating_status !== GeneratingStatus.Idle.toString()) {
      throw new AlreadyGeneratingError();
    }

    await userDao.updateProfileGeneratingStatus(this.user!.id, GeneratingStatus.Generating.toString());
  }

  async requireLogin(req: Request): Promise<void> {
    const supabase = this.getSupabaseClient();
    const userDao = new UserDao(supabase);
    this.user = await userDao.getUserByRequest(req);
    // Validate if the user is logged in
    if (!this.user) throw new UnauthorizedError("You must be logged in to access this endpoint.");
  }

  // async isIdleRedis(): Promise<void> {
  //   let currentStatus = await this.getUserGeneratingStatus();

  //   if (currentStatus != GeneratingStatus.Idle.toString()) {
  //     throw new AlreadyGeneratingError()
  //   }

  //   await this.setUserGeneratingStatus(GeneratingStatus.Generating.toString());
  // }

  // async rateLimit(): Promise<void> {
  //   const identifier = "api";
  //   const { success } = await ratelimit.limit(identifier);

  //   if (!success) throw new TooManyRequestsError("Too many requests");
  // }

  // async setUserGeneratingStatus(status: string) {
  //   await redis.set(`user:${this.user!.id}:status`, status);
  // }

  // async getUserGeneratingStatus() {
  //   return await redis.get(`user:${this.user!.id}:status`);
  // }
}
