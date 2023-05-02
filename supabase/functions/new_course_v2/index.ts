import { TooManyRequestsError } from './../_shared/consts/errors/TooManyRequestsError.ts';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import * as defaults from "../_shared/consts/defaults.ts";
import { GeneratingStatus } from "../_shared/Statuses.ts";
import { UserDao } from "../_shared/daos/UserDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { InternalCourseItem } from "../_shared/InternalModels.ts";
import { mapInternalToPublicCourse } from "../_shared/Mappers.ts";
import { v4 as uuidv4} from "uuid";

const httpService = new HttpService(async (req: Request) => {
  // Parse request parameters
  const courseRequest = new CourseRequest(await req.json());
  courseRequest.Validate();

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);

  const userDao = new UserDao(supabase);
  // Get logged in user
  const user = await userDao.getUserByRequest(req)

  if(user)
  {
    const profile = await userDao.getProfileByUserId(user.id);    
    if(profile.generating_status !== GeneratingStatus.Idle.toString())
    {
      throw new TooManyRequestsError("You are only allowed one generation at a time. Please wait for your current generation to finish.")
    }
  }

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  var courseOutline = await openAIClient.createCourseOutlineV2(courseRequest, defaults.gpt4);
  courseOutline.userId = user?.id;

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  const insertedCourse = await courseDao.insertCourseV2(courseOutline, `Message: ${courseRequest.search_text}, Section Count: ${courseRequest.module_count}, Max Tokens: ${courseRequest.max_tokens}, Temperature: ${courseRequest.temperature}`);
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