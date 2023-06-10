import { BadRequestError, NotFoundError } from "../consts/Errors";
import { CourseDao } from "../daos/CourseDao";
import { CourseItemDao } from "../daos/CourseItemDao";
import { InternalCourse, InternalCourseItem, InternalGenerationReferenceType } from "../lib/InternalModels";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemDaoToInternalCourseItem, mapInternalTopicsToPublicTopics } from "../lib/Mappers";
import { RequestWrapper } from "../router";
import { LessonContentPost } from "../dtos/TopicDto";
import { TopicDao } from "../daos/TopicDao";
import { OpenAIClient } from "../clients/OpenAIClient";
import { GenerationWrapper } from "../clients/GenerationClientWrapper";

export class TopicManager {
  async postTopic(request: RequestWrapper) {
    const contentRequest = new LessonContentPost(await request.json());

    // Initialize Supabase client
    const { supabaseClient, user } = request;

    const topicDao = new TopicDao(supabaseClient);
    let existingTopics = await topicDao.getTopicsByLessonId(contentRequest.lesson_id!);
    if (existingTopics.length > 0) {
      throw new BadRequestError(`Lesson ${contentRequest.lesson_id} already has topics.`);
    }

    const courseDao = new CourseDao(supabaseClient);
    const coursePromise = courseDao.getCourseById(contentRequest.course_id!);

    const courseItemDao = new CourseItemDao(supabaseClient);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(contentRequest.course_id!);

    const [courseResponse, courseItemsResponse] = await Promise.all([coursePromise, courseItemsPromise]);

    const course: InternalCourse = mapCourseDaoToInternalCourse(courseResponse);
    const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);

    const courseOutline = buildCourseOutline(course, courseItems);
    let gptCourseOutline = mapCourseForGPT(courseOutline);

    const currentLesson = courseItems.find((item) => item.id === contentRequest.lesson_id);
    if (!currentLesson) throw new NotFoundError(`Lesson with id ${contentRequest.lesson_id} not found.`);

    const openAIClient = new OpenAIClient(request);
    const generationWrapper = new GenerationWrapper(supabaseClient);
    let internalTopics = await generationWrapper.wrapGenerationRequest(
      user!.id,
      currentLesson.title,
      currentLesson.id!,
      InternalGenerationReferenceType.Lesson,
      async () => {
        await openAIClient.createLessonContent(
          contentRequest,
          currentLesson.title,
          JSON.stringify(gptCourseOutline),
          course.search_text!,
          course.user_id!
        );
      }
    );

    await topicDao.insertTopics(internalTopics);

    return mapInternalTopicsToPublicTopics(internalTopics);
  }
}