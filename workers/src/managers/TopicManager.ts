import { AlreadyGeneratingError, BadRequestError, NotFoundError } from "../consts/Errors";
import { CourseDao } from "../daos/CourseDao";
import { CourseItemDao } from "../daos/CourseItemDao";
import { InternalCourse, InternalCourseItem, InternalCourseItemType, InternalGenerationReferenceType, InternalGenerationStatus, InternalTopic } from "../lib/InternalModels";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseForGPT, mapCourseItemDaoToInternalCourseItem, mapInternalCourseToLessonContent, mapInternalTopicsToPublicTopics } from "../lib/Mappers";
import { RequestWrapper } from "../router";
import { LessonContentPost } from "../dtos/TopicDto";
import { TopicDao } from "../daos/TopicDao";
import { OpenAIClient } from "../clients/OpenAIClient";
import { GenerationWrapper } from "../clients/GenerationClientWrapper";
import { GenerationLogDao } from "../daos/GenerationLogDao";
import SupabaseClient from "@supabase/supabase-js/dist/module/SupabaseClient";
import { Database } from "../consts/database.types";
import { Env } from "../worker";
import { LessonContentCreateMessage } from "../lib/Messages";
import { v4 as uuidv4 } from "uuid";

export class TopicManager {
  async createTopicsForCourse(supabaseClient: SupabaseClient<Database>, message: LessonContentCreateMessage, env: Env) {

    const course = mapInternalCourseToLessonContent(message.course);

    const openAIClient = new OpenAIClient(env);
    console.log("Creating course content");
    const lessons = await openAIClient.createCourseContent(JSON.stringify(course), message.search_text);
    console.log("Finished creating course content");

    let topics : InternalTopic[] = [];
    message.course.items.forEach((item, index) => {
      if (item.type === InternalCourseItemType.Lesson) {
        let topic : InternalTopic = {
          id: uuidv4(),
          title: item.title,
          content: lessons[index].content,
          order_index: index,
          lesson_id: item.id!,
          user_id: message.user_id,
          course_id: item.course_id!
        }
        topics.push(topic);
      }
    });

    const topicDao = new TopicDao(supabaseClient);
    await topicDao.insertTopics(topics);


  }

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

    // Ensure no one else is generating the same lesson
    const generationLogDao = new GenerationLogDao(supabaseClient);
    const generationLog = await generationLogDao.getGenerationLogByReferenceIdAndStatus(currentLesson.id!, [InternalGenerationStatus.InProgress]);
    if(generationLog) throw new AlreadyGeneratingError(InternalGenerationReferenceType.Lesson, currentLesson.id!);

    // Generate topics w/ rate limiting
    const openAIClient = new OpenAIClient(request.env);
    const generationWrapper = new GenerationWrapper(supabaseClient);
    let internalTopics = await generationWrapper.wrapGenerationRequest<InternalTopic[]>(
      user!.id,
      currentLesson.user_id!,
      currentLesson.title,
      currentLesson.id!,
      InternalGenerationReferenceType.Lesson,
      async () => {
        return await openAIClient.createLessonContent(
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