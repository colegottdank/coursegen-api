import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService, HttpServiceOptions } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import * as defaults from "../_shared/consts/defaults.ts";
import { UserDao } from "../_shared/daos/UserDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { InternalCourseItem } from "../_shared/InternalModels.ts";
import { mapInternalToPublicCourse } from "../_shared/Mappers.ts";
import { v4 as uuidv4} from "uuid";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";

const httpServiceOptions: HttpServiceOptions = {
  requireLogin: true,
  rateLimit: true,
  isIdle: true
};

const httpService = new HttpService(httpServiceOptions, async (req: Request) => {
  // Parse request parameters
  const courseRequest = new CourseRequest(await req.json());
  courseRequest.Validate();

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);

  const userDao = new UserDao(supabase);
  const user = await userDao.getUserByRequest(req);

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  var courseOutline = await openAIClient.createCourseOutlineV2(courseRequest, courseRequest.gpt_model ?? defaults.gpt35);
  courseOutline.user_id = user?.id;

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  const insertedCourse = await courseDao.insertCourse(courseOutline, `${courseRequest.search_text}`, null);
  courseOutline.id = insertedCourse.id;

  updateCourseItemFields(courseOutline.items, user?.id, insertedCourse.id);

  const courseItemDao = new CourseItemDao(supabase);
  await courseItemDao.insertCourseItemsRecursivelyV2(courseOutline.items);

  const publicCourse = mapInternalToPublicCourse(courseOutline);
  return publicCourse;
});

serve((req) => httpService.handle(req));

function updateCourseItemFields(
  items: InternalCourseItem[],
  userId?: string,
  courseId?: string,
  parentId?: string
): void {
  items.forEach((item) => {
    // Set userId, courseId, and parentId for the current item
    item.user_id = userId;
    item.course_id = courseId;
    item.id = uuidv4();
    item.parent_id = parentId;

    // If the current item has child items, recursively set userId, courseId, and parentId for them
    if (item.items && item.items.length > 0) {
      updateCourseItemFields(item.items, userId, courseId, item.id);
    }
  });
}