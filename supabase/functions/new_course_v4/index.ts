import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { InternalCourseItem } from "../_shared/InternalModels.ts";
import { mapInternalToPublicCourse } from "../_shared/Mappers.ts";
import { v4 as uuidv4} from "uuid";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";

const envName = Deno.env.get("ENV_NAME");

const httpService = new HttpService({
  requireLogin: true,
  rateLimit: true,
  isIdle: envName === "staging" ? true : false
}, handle);

serve((req) => httpService.handle(req));

async function handle(reqJson?: string, context?: any) {
  // Parse request parameters
  const courseRequest = new CourseRequest(reqJson!);
  courseRequest.Validate();

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient();
  const user = httpService.getUser();

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  let courseOutline = await openAIClient.createCourseOutline(courseRequest);
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
}

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