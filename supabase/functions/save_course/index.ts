import { TopicDao } from './../_shared/daos/TopicDao.ts';
import { User } from '@supabase/supabase-js';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { SaveCourseRequest } from "../_shared/dtos/course/SaveCourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { buildCourseOutline, duplicateCourse, duplicateCourseItems, duplicateTopics, mapCourseDaoToInternalCourse, mapCourseItemDaoToInternalCourseItem, mapInternalToPublicCourse, mapRowToInternalTopic, mapTopicsToInternalTopics } from "../_shared/Mappers.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { InternalCourseItem, InternalTopic } from "../_shared/InternalModels.ts";
import { UnauthorizedError } from "../_shared/consts/Errors.ts";

const httpService = new HttpService({
  requireLogin: true,
  rateLimit: true,
  isIdle: false
}, handle);

serve((req) => httpService.handle(req));

async function handle(reqJson?: string, context?: any) {
  const saveCourseRequest = new SaveCourseRequest(reqJson!);
    saveCourseRequest.Validate();

    const supabase = httpService.getSupabaseClient();
    
    const courseDao = new CourseDao(supabase);
    const courseResponse = await courseDao.getCourseById(saveCourseRequest.course_id!);

    const user = httpService.getUser() as User;

    if(courseResponse.user_id == user.id) throw new UnauthorizedError("User can not save their own course");

    // Get existing course outline
    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(saveCourseRequest.course_id!);
    const topicDao = new TopicDao(supabase);
    const topicsPromise = topicDao.getTopicsByCourseId(saveCourseRequest.course_id!);

    const [courseItemsResponse, topicsResponse] = await Promise.all([
        courseItemsPromise,
        topicsPromise
    ]);

    const course = mapCourseDaoToInternalCourse(courseResponse);
    const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);
    const topics: InternalTopic[] = topicsResponse.map(mapRowToInternalTopic)

    // Duplicate course outline
    const duplicatedCourse = duplicateCourse(course, user.id!);
    const { duplicatedItems, oldToNewCourseItemIdMap } = duplicateCourseItems(courseItems, user.id, duplicatedCourse.id!);
    const duplicatedTopics = duplicateTopics(topics, user.id, oldToNewCourseItemIdMap, duplicatedCourse.id!);

    // Insert duplicated course outline
    const insertedCourse = mapCourseDaoToInternalCourse(await courseDao.insertCourse(duplicatedCourse, courseResponse.search_text, course.id!));
    const insertedItems = (await courseItemDao.insertCourseItems(duplicatedItems)).map(mapCourseItemDaoToInternalCourseItem);
    await topicDao.insertTopics(duplicatedTopics);

    const courseOutline = buildCourseOutline(insertedCourse, insertedItems);
    const publicCourse = mapInternalToPublicCourse(courseOutline);

    return publicCourse;
}