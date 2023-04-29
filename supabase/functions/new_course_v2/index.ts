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
    console.log(profile);
    
    if(profile.generating_status !== GeneratingStatus.Idle.toString())
    {
      throw new TooManyRequestsError("You are only allowed one generation at a time. Please wait for your current generation to finish.")
    }
  }

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  var courseOutline = await openAIClient.createCourseOutlineV2(courseRequest, defaults.gpt35);
  console.log(courseOutline);

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  courseOutline.userId = user?.id;
  const insertedCourse = await courseDao.insertCourseV2(courseOutline, `Message: ${courseRequest.search_text}, Section Count: ${courseRequest.section_count}, Max Tokens: ${courseRequest.max_tokens}, Temperature: ${courseRequest.temperature}`);
  courseOutline.id = insertedCourse.id;

  setCourseAndUserIds(courseOutline.items, user?.id, insertedCourse.id);

  const courseItemDao = new CourseItemDao(supabase);
  const insertedCourseItems = courseItemDao.insertCourseItemsRecursively(courseOutline.items);
  console.log(insertedCourseItems);

  const publicCourse = mapInternalToPublicCourse(courseOutline);

  return publicCourse;
});

serve((req) => httpService.handle(req));

function setCourseAndUserIds(
  items: InternalCourseItem[],
  userId?: string,
  courseId?: string
): void {
  items.forEach((item) => {
    // Set userId and courseId for the current item
    item.user_id = userId;
    item.course_id = courseId;

    // If the current item has child items, recursively set userId and courseId for them
    if (item.items && item.items.length > 0) {
      setCourseAndUserIds(item.items, userId, courseId);
    }
  });
}