import { RequestWrapper } from "./lib/RequestWrapper";
import apiRouter from "./router";

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
		console.log(env);
      let requestWrapper = new RequestWrapper(request, env);

      if (requestWrapper.getUrl().pathname.startsWith("/api/")) {
        // You can also use more robust routing
        return apiRouter.handle(request, requestWrapper);
      }

      return new Response(
        `Try making requests to:
      <ul>
	  <li><code><a href="/api/v1/courses">/api/v1/courses</a></code></li>
	  <li><code><a href="/api/v1/env">/api/v1/env</a></code></li>
	  </ul>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (error) {
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
  },
};
