import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService, HttpServiceOptions } from "../_shared/util/httpservice.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import {
  buildCourseOutline,
  mapCourseDaoToInternalCourse,
  mapCourseItemClosureDaoToInternalCourseItemClosure,
  mapCourseItemDaoToInternalCourseItem,
  mapInternalToPublicCourse,
} from "../_shared/Mappers.ts";
import { InternalCourse, InternalCourseItem, InternalCourseItemClosure } from "../_shared/InternalModels.ts";
import { GetCourseRequest } from "../_shared/dtos/course/GetCourseRequest.ts";

const httpServiceOptions: HttpServiceOptions = {
  requireLogin: false,
  rateLimit: true,
  isIdle: false,
};

const httpService = new HttpService(httpServiceOptions, async (req: Request) => {
  const contentRequest = new GetCourseRequest(await req.json());

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);

  const courseDao = new CourseDao(supabase);
  const coursePromise = courseDao.getCourseById(contentRequest.course_id!);

  const courseItemDao = new CourseItemDao(supabase);
  const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(contentRequest.course_id!);
  const courseItemClosuresPromise = courseItemDao.getCourseItemClosuresByCourseId(contentRequest.course_id!);

  const [courseResponse, courseItemsResponse, courseItemClosuresResponse] = await Promise.all([
    coursePromise,
    courseItemsPromise,
    courseItemClosuresPromise,
  ]);

  const course: InternalCourse = mapCourseDaoToInternalCourse(courseResponse);
  const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);
  const courseItemClosures: InternalCourseItemClosure[] = courseItemClosuresResponse.map(
    mapCourseItemClosureDaoToInternalCourseItemClosure
  );

  const courseOutline = buildCourseOutline(course, courseItems, courseItemClosures);

  const publicCourse = mapInternalToPublicCourse(courseOutline);

  return publicCourse;
});

serve((req) => httpService.handle(req));
