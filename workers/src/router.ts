import { IRequest, Router, createCors, error } from "itty-router";
import { CourseManager } from "./managers/CourseManager";
import { NotFoundError, UnauthorizedError } from "./consts/Errors";
import { Env } from "./worker";
import { UserDao } from "./daos/UserDao";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "./consts/database.types";
import { TopicManager } from "./managers/TopicManager";

// now let's create a router (note the lack of "new")
export type RequestWrapper = {
  env: Env;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
} & IRequest;

const router = Router<RequestWrapper>();

// router.all("*", createCors);

// Course
router
  .post("/api/v1/courses", authenticate, async (request) => {
    let course = new CourseManager();
    return await course.postCourse(request);
  })
  .get("/api/v1/courses/:id", authenticate, async (request) => {
    let course = new CourseManager();
    let publicCourse = await course.getCourse(request);
    return publicCourse;
  });

router.post("api/v1/topics", authenticate, async (request) => {
  let manager = new TopicManager();
  return await manager.postTopic(request);
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

const { preflight, corsify } = createCors({
  origins: ["*"],
  methods: ["OPTIONS"],
  headers: ["authorization, x-client-info, apikey, content-type"],
});
