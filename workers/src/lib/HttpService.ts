import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { corsHeaders } from "../consts/CorsHeaders";
import { Database } from "../consts/database.types";
import { RequestWrapper } from "./RequestWrapper";
import { AlreadyGeneratingError, NotFoundError, SupabaseError, UnauthorizedError } from "../consts/Errors";
import { UserDao } from "../daos/UserDao";

interface IErrorResponse {
  error: {
    code: number;
    message: string;
  };
}

export class HttpServiceOptions {
  constructor(public requireLogin: boolean = false, public rateLimit: boolean = true, public isAsync: boolean = false) {}
}

export class HttpService {
  private supabaseClient: SupabaseClient<Database> | null = null;
  private user: User | null = null;
  private context: any = {};
  constructor(private request : RequestWrapper, private options: Partial<HttpServiceOptions> = new HttpServiceOptions(), private handler: (httpService: HttpService) => Promise<any>, private preHandle?: (httpService: HttpService) => Promise<any>) {}

  async handle(): Promise<Response> {
    // This is needed if you're planning to invoke your function from a browser.
    if (this.request.getMethod() === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    this.context = {};

    try {
      await this.runMiddleware();

      // If async, run the preHandle function, set timeout to run the handler (async), and return a 202 response
      if (this.options.isAsync && this.preHandle) {
        const response = await this.preHandle(this);
        setTimeout(async () => {
          try {
            await this.handler(this);
          } finally {
            // await this.resetIdleStatus();
          }
        }, 1);

        return this.createResponse(response, 202);
      }

      const response = await this.handler(this);
      return this.createResponse(response, 200);
    }
    catch (error) {
      return this.handleError(error);
    }
    finally {
    //   if (!this.options.isAsync) {
    //     await this.resetIdleStatus();
    //   }

    //   this.context.TooManyRequests = false;
    }
  }

  getSupabaseClient(): SupabaseClient<Database> {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    try {
      this.supabaseClient = createClient<Database>(
        this.request?.getSupabaseUrl() ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
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

  getRequestWrapper(): RequestWrapper {
    return this.request;
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

  private async runMiddleware(): Promise<void> {
    if (this.options.requireLogin) await this.requireLogin();
    // if (this.options.rateLimit) await this.rateLimit();
  }

  async requireLogin(): Promise<void> {
    if(!this.request?.getAuthorization()) throw new UnauthorizedError("You must be logged in to access this endpoint.");
    
    const supabase = this.getSupabaseClient();
    const userDao = new UserDao(supabase);
    this.user = await userDao.getUserByAuthHeader(this.request.getAuthorization()!);
    // Validate if the user is logged in
    if (!this.user) throw new NotFoundError("User not found");
  }
}
