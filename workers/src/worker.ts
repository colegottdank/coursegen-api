import { json } from "itty-router/json";
import { BaseError, NotFoundError } from "./consts/Errors";
import apiRouter, { RequestWrapper } from "./router";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./consts/database.types";
import { corsify } from "./consts/CorsConfig";
import { TopicManager } from "./managers/TopicManager";
import { LessonContentCreateMessage } from "./lib/Messages";

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_ORG: string;
  HELICONE_API_KEY: string;
  ENVIRONMENT: string;
  LESSON_CONTENT_CREATE_QUEUE: Queue<string>;
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
          .catch((error: any) => {
            if (error instanceof BaseError) {
              return baseErrorResponse(error);
            } else {
              return errorResponse(error);
            }
          })
          .then(corsify);
      }

      throw new NotFoundError("Path not found");
    } catch (error) {
      return errorResponse(error);
    }
  },
  async queue(batch: MessageBatch<string>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Received batch of ${JSON.stringify(batch.messages)} messages, and the queue is ${batch.queue}`);
    if (batch.queue.startsWith("lesson-content-create-queue")) {
      const supabaseClient = createClient<Database>(env.SUPABASE_URL ?? "", env.SUPABASE_SERVICE_ROLE_KEY ?? "");
      let topicManager = new TopicManager();

      const tasks = batch.messages.map(async (message) => {
        const createMessage: LessonContentCreateMessage = JSON.parse(message.body);
        return topicManager.createTopicsForCourse(supabaseClient, createMessage, env);
      });

      await Promise.all(tasks);
    } else if (batch.queue.startsWith("lesson-content-create-queue-dlq")) {
      console.log("Message received in DLQ");
    }
  },
};

function baseErrorResponse(error: BaseError) {
  return new Response(
    JSON.stringify({
      "coursegen-message": "CourseGen ran into an error servicing your request: " + error.message,
      "coursegen-error-code": error.code,
      support: "Please reach out to support@coursegen.ai",
    }),
    {
      status: parseHttpStatus(error.httpStatus),
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "helicone-error": "true",
      },
    }
  );
}

function errorResponse(error: any) {
  return new Response(
    JSON.stringify({
      "coursegen-message": "CourseGen ran into an error servicing your request: " + error,
      "coursegen-error": JSON.stringify(error),
      support: "Please reach out to support@coursegen.ai",
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

function parseHttpStatus(httpStatus: string): number {
  const parsedStatus = parseInt(httpStatus, 10);

  // Check if parsing was successful and in the range 200 to 599
  if (!isNaN(parsedStatus) && parsedStatus >= 200 && parsedStatus < 600) {
    return parsedStatus;
  }

  // Default to 500
  return 500;
}
