import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { UserDao } from "../_shared/daos/UserDao.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemClosureDaoToInternalCourseItemClosure, mapCourseItemDaoToInternalCourseItem, mapInternalCourseItemToPublicCourseItem, mapInternalToPublicCourse, mapTopicsToInternalTopics } from "../_shared/Mappers.ts";
import { InternalCourse, InternalCourseItem, InternalCourseItemClosure } from "../_shared/InternalModels.ts";
import { GetCourseRequest } from "../_shared/dtos/course/GetCourseRequest.ts";
import { GeneratingStatus } from "../_shared/Statuses.ts";
import { TooManyRequestsError } from "../_shared/consts/errors/TooManyRequestsError.ts";

const httpService = new HttpService(async (req: Request) => {
    const contentRequest = new GetCourseRequest(await req.json());

    // Initialize Supabase client
    const supabase = httpService.getSupabaseClient(req);

    const userDao = new UserDao(supabase);
    const user = await userDao.getUserByRequest(req)

    if(user)
    {
        const profile = await userDao.getProfileByUserId(user.id);    
        if(profile.generating_status !== GeneratingStatus.Idle.toString())
        {
            throw new TooManyRequestsError("You are only allowed one generation at a time. Please wait for your current generation to finish.")
        }
    }

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
    const courseItemClosures: InternalCourseItemClosure[] = courseItemClosuresResponse.map(mapCourseItemClosureDaoToInternalCourseItemClosure);

    const courseOutline = buildCourseOutline(course, courseItems, courseItemClosures);

    const publicCourse = mapInternalToPublicCourse(courseOutline);

    return publicCourse;
});
  
serve((req) => httpService.handle(req));
