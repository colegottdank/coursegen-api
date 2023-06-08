import { BadRequestError, NotFoundError } from "../consts/Errors";
import { CourseDao } from "../daos/CourseDao";
import { CourseItemDao } from "../daos/CourseItemDao";
import { InternalCourse, InternalCourseItem } from "../lib/InternalModels";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemDaoToInternalCourseItem, mapInternalTopicsToPublicTopics } from "../lib/Mappers";
import { RequestWrapper } from "../router";
import { LessonContentPost } from "../dtos/TopicDto";
import { TopicDao } from "../daos/TopicDao";
import { OpenAIClient } from "../clients/OpenAIClient";

export class TopicManager {
  async postTopic(request: RequestWrapper) {
    const contentRequest = new LessonContentPost(await request.json());

    // Initialize Supabase client
    const supabase = request.supabaseClient;

    const topicDao = new TopicDao(supabase);
    let existingTopics = await topicDao.getTopicsByLessonId(contentRequest.lesson_id!);
    if (existingTopics.length > 0) {
      throw new BadRequestError(`Lesson ${contentRequest.lesson_id} already has topics.`);
    }

    const courseDao = new CourseDao(supabase);
    const coursePromise = courseDao.getCourseById(contentRequest.course_id!);

    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(contentRequest.course_id!);

    const [courseResponse, courseItemsResponse] = await Promise.all([coursePromise, courseItemsPromise]);

    const course: InternalCourse = mapCourseDaoToInternalCourse(courseResponse);
    const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);

    const courseOutline = buildCourseOutline(course, courseItems);
    let gptCourseOutline = mapCourseForGPT(courseOutline);

    const openAIClient = new OpenAIClient(request);
    const currentLesson = courseItems.find((item) => item.id === contentRequest.lesson_id);
    if (!currentLesson) throw new NotFoundError(`Lesson with id ${contentRequest.lesson_id} not found.`);

    const internalTopics = await openAIClient.createLessonContent(
      contentRequest,
      currentLesson.title,
      JSON.stringify(gptCourseOutline),
      course.search_text!,
      course.user_id!
    );
    currentLesson.topics = internalTopics;

    topicDao.insertTopics(internalTopics);

    return mapInternalTopicsToPublicTopics(internalTopics);
  }
}
