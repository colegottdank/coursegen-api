import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import {
  buildCourseOutline,
  mapCourseDaoToInternalCourse,
  mapCourseItemDaoToInternalCourseItem,
  mapInternalToPublicCourse,
} from "../_shared/Mappers.ts";
import { InternalCourse, InternalCourseItem } from "../_shared/InternalModels.ts";
import { GetCourseRequest } from "../_shared/dtos/course/GetCourseRequest.ts";

const httpService = new HttpService({
  requireLogin: false,
  rateLimit: true,
  isIdle: false,
}, handle);

serve((req) => httpService.handle(req));

async function handle(reqJson?: string, context?: any) {
  const contentRequest = new GetCourseRequest(reqJson!);

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient();

  const courseDao = new CourseDao(supabase);
  const coursePromise = courseDao.getCourseById(contentRequest.course_id!);

  const courseItemDao = new CourseItemDao(supabase);
  const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(contentRequest.course_id!);

  const [courseResponse, courseItemsResponse] = await Promise.all([
    coursePromise,
    courseItemsPromise,
  ]);

  const course: InternalCourse = mapCourseDaoToInternalCourse(courseResponse);
  const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);

  const courseOutline = buildCourseOutline(course, courseItems);

  const publicCourse = mapInternalToPublicCourse(courseOutline);

  return publicCourse;
}