import { json } from "itty-router/json";
import { AlreadyExistsError, BaseError, NotFoundError } from "./consts/Errors";
import apiRouter, { RequestWrapper } from "./router";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./consts/database.types";
import { corsify } from "./consts/CorsConfig";
import { TopicManager } from "./managers/TopicManager";
import { CreateCourseOutlineMessage, LessonContentCreateMessage } from "./lib/Messages";
import { CourseManager } from "./managers/CourseManager";
import { stripeRouter } from "./stripeRouter";

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_ORG: string;
  HELICONE_API_KEY: string;
  ENVIRONMENT: string;
  CREATE_COURSE_OUTLINE_QUEUE: Queue<string>;
  CREATE_LESSON_CONTENT_QUEUE: Queue<string>;
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FE_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      let url = new URL(request.url);
      let requestWrapper = request as RequestWrapper;
      requestWrapper.env = env;
      requestWrapper.supabaseClient = createClient<Database>(
        env.SUPABASE_URL ?? "",
        env.SUPABASE_SERVICE_ROLE_KEY ?? ""
      );
      requestWrapper.parsedUrl = url;
      requestWrapper.ctx = ctx;

      let router;
      if(request.url.endsWith("/api/v1/stripe/webhooks")) router = stripeRouter;
      else router = apiRouter;

      return router
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
    } catch (error) {
      return errorResponse(error);
    }
  },
  async queue(batch: MessageBatch<string>, env: Env): Promise<void> {
    console.log(`Received batch of ${JSON.stringify(batch.messages)} messages, and the queue is ${batch.queue}`);

    if (batch.queue.includes("-dlq")) {
      console.log("Message received in DLQ:");
      console.log(JSON.stringify(batch.messages));
      return; // Early exit after handling DLQ
    }

    if (batch.queue.startsWith("create-lesson-content-queue")) {
      const supabaseClient = createClient<Database>(env.SUPABASE_URL ?? "", env.SUPABASE_SERVICE_ROLE_KEY ?? "");
      let topicManager = new TopicManager();

      const tasks = batch.messages.map(async (message) => {
        try {
          console.log(message);
          let body = message.body as string;
          const createMessage: LessonContentCreateMessage = JSON.parse(body);
          await topicManager.createTopicsForCourse(supabaseClient, createMessage, env);
          message.ack();
        } catch (error) {
          if (error instanceof AlreadyExistsError) message.ack();
          console.log(JSON.stringify(error));
          message.retry();
        }
      });

      await Promise.all(tasks);
    } else if (batch.queue.startsWith("create-course-outline-queue")) {
      const supabaseClient = createClient<Database>(env.SUPABASE_URL ?? "", env.SUPABASE_SERVICE_ROLE_KEY ?? "");
      const courseManager = new CourseManager();

      const tasks = batch.messages.map(async (message) => {
        try {
          console.log(message);
          let body = message.body as string;
          const createMessage: CreateCourseOutlineMessage = JSON.parse(body);
          await courseManager.createCourseWaitUntil(
            supabaseClient,
            createMessage.user_id,
            createMessage.search_text,
            createMessage.course_id,
            env
          );
          message.ack();
        } catch (error) {
          if (error instanceof AlreadyExistsError) message.ack();
          console.log(JSON.stringify(error));
          message.retry();
        }
      });

      await Promise.all(tasks);
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
