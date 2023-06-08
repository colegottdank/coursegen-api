import { json } from "itty-router/json";
import { NotFoundError } from "./consts/Errors";
import apiRouter, { RequestWrapper } from "./router";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./consts/database.types";

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_ORG: string;
  HELICONE_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      let url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        let requestWrapper = request as RequestWrapper;
        requestWrapper.env = env;
        requestWrapper.supabaseClient = createClient<Database>(
          env.SUPABASE_URL ?? "",
          env.SUPABASE_SERVICE_ROLE_KEY ?? ""
        );

        return apiRouter
          .handle(requestWrapper)
          .then(json)
          .catch((error) => errorResponse(error));
      }

      throw new NotFoundError("Path not found");
    } catch (error) {
      return errorResponse(error);
    }
  },
};

function errorResponse(error: any) {
  return new Response(
    JSON.stringify({
      "coursegen-message": "CourseGen ran into an error servicing your request: " + error,
      support: "Please reach out to support@coursegen.ai",
      "coursegen-error": JSON.stringify(error),
    }),
    {
      status: 500,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "helicone-error": "true",
      },
    }
  );
}
