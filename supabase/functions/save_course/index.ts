import { TopicDao } from './../_shared/daos/TopicDao.ts';
import { User } from '@supabase/supabase-js';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService, HttpServiceOptions } from "../_shared/util/httpservice.ts";
import { SaveCourseRequest } from "../_shared/dtos/course/SaveCourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { buildCourseOutline, duplicateCourse, duplicateCourseItemClosures, duplicateCourseItems, duplicateTopics, mapCourseDaoToInternalCourse, mapCourseItemClosureDaoToInternalCourseItemClosure, mapCourseItemDaoToInternalCourseItem, mapInternalToPublicCourse, mapRowToInternalTopic, mapTopicsToInternalTopics } from "../_shared/Mappers.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { InternalCourseItem, InternalCourseItemClosure, InternalTopic } from "../_shared/InternalModels.ts";
import { UnauthorizedError } from "../_shared/consts/Errors.ts";

const httpServiceOptions: HttpServiceOptions = {
  requireLogin: true,
  rateLimit: true,
  isIdle: false
};

const httpService = new HttpService(httpServiceOptions, async (req: Request) => {
    const saveCourseRequest = new SaveCourseRequest(await req.json());
    saveCourseRequest.Validate();

    const supabase = httpService.getSupabaseClient(req);
    
    const courseDao = new CourseDao(supabase);
    const courseResponse = await courseDao.getCourseById(saveCourseRequest.course_id!);

    const user = httpService.getUser() as User;

    if(courseResponse.user_id == user.id) throw new UnauthorizedError("User can not save their own course");

    // Get existing course outline
    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(saveCourseRequest.course_id!);
    const courseItemClosuresPromise = courseItemDao.getCourseItemClosuresByCourseId(saveCourseRequest.course_id!);
    const topicDao = new TopicDao(supabase);
    const topicsPromise = topicDao.getTopicsByCourseId(saveCourseRequest.course_id!);

    const [courseItemsResponse, courseItemClosuresResponse, topicsResponse] = await Promise.all([
        courseItemsPromise,
        courseItemClosuresPromise,
        topicsPromise
    ]);

    const course = mapCourseDaoToInternalCourse(courseResponse);
    const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);
    const courseItemClosures: InternalCourseItemClosure[] = courseItemClosuresResponse.map(mapCourseItemClosureDaoToInternalCourseItemClosure);
    const topics: InternalTopic[] = topicsResponse.map(mapRowToInternalTopic)

    // Duplicate course outline
    const duplicatedCourse = duplicateCourse(course, user.id!);
    const { duplicatedItems, oldToNewCourseItemIdMap } = duplicateCourseItems(courseItems, user.id, duplicatedCourse.id!);
    const duplicatedTopics = duplicateTopics(topics, user.id, oldToNewCourseItemIdMap, duplicatedCourse.id!);
    const duplicatedClosures = duplicateCourseItemClosures(courseItemClosures, oldToNewCourseItemIdMap, duplicatedCourse.id!);

    // Insert duplicated course outline
    const insertedCourse = mapCourseDaoToInternalCourse(await courseDao.insertCourse(duplicatedCourse, courseResponse.search_text, course.id!));
    const insertedItems = (await courseItemDao.insertCourseItems(duplicatedItems)).map(mapCourseItemDaoToInternalCourseItem);
    await topicDao.insertTopics(duplicatedTopics);
    const insertedClosures = (await courseItemDao.insertCourseItemClosures(duplicatedClosures)).map(mapCourseItemClosureDaoToInternalCourseItemClosure);

    const courseOutline = buildCourseOutline(insertedCourse, insertedItems, insertedClosures);
    const publicCourse = mapInternalToPublicCourse(courseOutline);

    return publicCourse;
});

serve((req) => httpService.handle(req));