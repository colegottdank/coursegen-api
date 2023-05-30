import { User } from '@supabase/supabase-js';
import { LessonContentRequest } from './../_shared/dtos/content/LessonContentRequest.ts';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemClosureDaoToInternalCourseItemClosure, mapCourseItemDaoToInternalCourseItem, mapInternalTopicsToPublicTopics, mapTopicsToInternalTopics } from "../_shared/Mappers.ts";
import { InternalCourse, InternalCourseItem, InternalCourseItemClosure } from "../_shared/InternalModels.ts";
import { TopicDao } from "../_shared/daos/TopicDao.ts";
import { BadRequestError, NotFoundError } from "../_shared/consts/Errors.ts";

const httpService = new HttpService({
    requireLogin: true,
    rateLimit: true,
    isIdle: false
}, handle);
  
serve((req) => httpService.handle(req));

async function handle(reqJson?: string, context?: any) {
    const contentRequest = new LessonContentRequest(reqJson!);

    // Initialize Supabase client
    const supabase = httpService.getSupabaseClient();
    const user = httpService.getUser() as User;

    const topicDao = new TopicDao(supabase);
    let existingTopics = await topicDao.getTopicsByLessonId(contentRequest.lesson_id!);
    if(existingTopics.length > 0)
    {
        throw new BadRequestError(`Lesson ${contentRequest.lesson_id} already has topics.`)
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
    let gptCourseOutline = mapCourseForGPT(courseOutline);

    const openAIClient = new OpenAIClient();
    const currentLesson = courseItems.find(item => item.id === contentRequest.lesson_id);
    if(!currentLesson) throw new NotFoundError(`Lesson with id ${contentRequest.lesson_id} not found.`);

    const internalTopics = await openAIClient.createLessonContent(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), course.search_text!, course.user_id!);
    currentLesson.topics = internalTopics;


    //console.log(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), contentRequest.gpt_model ?? defaults.gpt4);
    // const topics = await openAIClient.generateLessonTopics(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), contentRequest.gpt_model ?? defaults.gpt4);

    // const internalTopics = mapTopicsToInternalTopics(topics, contentRequest.lesson_id!, course.user_id!, contentRequest.course_id!);

    // currentLesson.topics = internalTopics;

    // gptCourseOutline = mapCourseForGPT(courseOutline);

    // const topicContent = await openAIClient.generateLessonTopicContent(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), topics, defaults.gpt35);
    // mapContentToInternalTopics(internalTopics, topicContent);
    // currentLesson.topics = internalTopics;

    topicDao.insertTopics(internalTopics);

    return mapInternalTopicsToPublicTopics(internalTopics);
}