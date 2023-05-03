import { BadRequestError } from './../_shared/consts/errors/BadRequestError.ts';
import { NotFoundError } from './../_shared/consts/errors/NotFoundError.ts';
import * as defaults from "../_shared/consts/defaults.ts";
import { UnauthorizedError } from './../_shared/consts/errors/UnauthorizedError.ts';
import { LessonContentRequest } from './../_shared/dtos/content/LessonContentRequest.ts';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { UserDao } from "../_shared/daos/UserDao.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { CourseItemDao } from "../_shared/daos/CourseItemDao.ts";
import { buildCourseOutline, mapContentToInternalTopics, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemClosureDaoToInternalCourseItemClosure, mapCourseItemDaoToInternalCourseItem, mapInternalCourseItemToPublicCourseItem, mapTopicsToInternalTopics } from "../_shared/Mappers.ts";
import { InternalCourse, InternalCourseItem, InternalCourseItemClosure } from "../_shared/InternalModels.ts";
import { TopicDao } from "../_shared/daos/TopicDao.ts";

const httpService = new HttpService(async (req: Request) => {
    const contentRequest = new LessonContentRequest(await req.json());

    // Initialize Supabase client
    const supabase = httpService.getSupabaseClient(req);

    const userDao = new UserDao(supabase);
    const user = await userDao.getUserByRequest(req)

    if(!user)
    {
        throw new UnauthorizedError("You must be logged in to generate lesson content.");
    }

    const topicDao = new TopicDao(supabase);
    let existingTopics = await topicDao.getTopicsByLessonIdAndUserId(contentRequest.lesson_id!, user.id);
    if(existingTopics.length > 0)
    {
        throw new BadRequestError(`Lesson ${contentRequest.lesson_id} already has topics.`)
    }

    // const profile = await userDao.getProfileByUserId(user.id);

    const courseDao = new CourseDao(supabase);
    const coursePromise = courseDao.getCourseByIdAndUserId(contentRequest.course_id!, user.id);

    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseIdAndUserId(contentRequest.course_id!, user.id);
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

    const topics = await openAIClient.generateLessonTopics(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), contentRequest.gpt_model ?? defaults.gpt35);
    const internalTopics = mapTopicsToInternalTopics(topics, contentRequest.lesson_id!, user.id, contentRequest.course_id!);

    currentLesson.topics = internalTopics;

    gptCourseOutline = mapCourseForGPT(courseOutline);

    const topicContent = await openAIClient.generateLessonTopicContent(contentRequest, currentLesson.title, JSON.stringify(gptCourseOutline), topics, defaults.gpt35);
    mapContentToInternalTopics(internalTopics, topicContent);
    currentLesson.topics = internalTopics;

    topicDao.insertTopics(internalTopics);

    return mapInternalCourseItemToPublicCourseItem(currentLesson);
});
  
serve((req) => httpService.handle(req));
