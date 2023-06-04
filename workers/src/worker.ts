/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { RequestWrapper } from "./lib/RequestWrapper";
import handleProxy from "./proxy";
import handleRedirect from "./redirect";
import apiRouter from "./router";

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
	  let requestWrapper = new RequestWrapper(request, env);

      if (requestWrapper.getUrl().pathname.startsWith("/api/")) {
        // You can also use more robust routing
        return apiRouter.handle(request, requestWrapper);
      }

      return new Response(
        `Try making requests to:
      <ul>
      <li><code><a href="/redirect?redirectUrl=https://example.com/">/redirect?redirectUrl=https://example.com/</a></code>,</li>
      <li><code><a href="/proxy?modify&proxyUrl=https://example.com/">/proxy?modify&proxyUrl=https://example.com/</a></code>, or</li>
      <li><code><a href="/api/todos">/api/todos</a></code></li>
	  <li><code><a href="/api/v1/courses">/api/v1/courses</a></code></li>
	  </ul>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          "coursegen-message": "CourseGen ran into an error servicing your request: " + error,
          support: "Please reach out...!",
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
