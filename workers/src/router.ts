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

// now let's create a router (note the lack of "new")
export type RequestWrapper = {
  env: Env;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
} & IRequest;

const router = Router<RequestWrapper>();

router.all("*", preflight, authenticate);

router.post(
  "/api/v1/courses",
  (request) => validateGenerationLogs(request, InternalGenerationReferenceType.Course),
  async (request) => {
    let course = new CourseManager();
    return await course.createCourse(request);
  }
);

router.get("/api/v1/courses/:id", async (request) => {
  let course = new CourseManager();
  let publicCourse = await course.getCourse(request);
  return publicCourse;
});

router.post(
  "api/v1/topics",
  async (request) => await validateGenerationLogs(request, InternalGenerationReferenceType.Lesson),
  async (request) => {
    let manager = new TopicManager();
    return await manager.postTopic(request);
  }
);

router.get("api/v1/generationlogs", authenticate, async (request) => {
  let manager = new GenerationLogManager();
  return await manager.getGenerationLogsByUser(request);
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