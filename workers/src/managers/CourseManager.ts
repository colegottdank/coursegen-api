import { CourseDao } from "../daos/CourseDao";
import { CourseItemDao } from "../daos/CourseItemDao";
import { CourseRequestPost } from "../dtos/CourseDtos";
import { InternalGenerationReferenceType, InternalCourse, InternalCourseItem } from "../lib/InternalModels";
import {
  buildCourseOutline,
  mapCourseDaoToInternalCourse,
  mapCourseItemDaoToInternalCourseItem,
  mapInternalToPublicCourse,
} from "../lib/Mappers";
import { v4 as uuidv4 } from "uuid";
import * as defaults from "../consts/Defaults";
import { OpenAIClient } from "../clients/OpenAIClient";
import * as validators from "../lib/Validators";
import { RequestWrapper } from "../router";
import { GenerationWrapper } from "../clients/GenerationClientWrapper";
import { CreateCourseOutlineMessage, LessonContentCreateMessage } from "../lib/Messages";
import { PublicCourse } from "../lib/PublicModels";
import { TopicManager } from "./TopicManager";
import { Env } from "../worker";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../consts/database.types";

export class CourseManager {
  async createCourse(request: RequestWrapper): Promise<PublicCourse> {
    let courseRequest = new CourseRequestPost(await request.json());
    courseRequest.Validate();

    // Initialize Supabase client
    const { supabaseClient, user } = request;
    let courseId = uuidv4();

    // Initialize new OpenAI API client
    const generationWrapper = new GenerationWrapper(supabaseClient);
    const openAIClient = new OpenAIClient(request.env);
    let internalCourse = await generationWrapper.wrapGenerationRequest<InternalCourse>(
      user!.id,
      user!.id,
      courseRequest.search_text!,
      courseId,
      InternalGenerationReferenceType.Course,
      async () => {
        return await openAIClient.createCourseOutlineTitles(courseRequest.search_text!, defaults.gpt4);
      }
    );

    internalCourse.user_id = user?.id;
    internalCourse.id = courseId;

    // Insert course and sections into db
    const courseDao = new CourseDao(supabaseClient);
    await courseDao.insertCourse(internalCourse, courseRequest.search_text!, null);

    this.updateCourseItemFields(internalCourse.items, user?.id, internalCourse.id);

    const courseItemDao = new CourseItemDao(supabaseClient);
    await courseItemDao.insertCourseItemsRecursivelyV2(internalCourse.items);

    let lessonContentCreateMsg: LessonContentCreateMessage = {
      course_id: courseId,
      course: internalCourse,
      user_id: user!.id,
      search_text: courseRequest.search_text!,
    };

    console.log(
      "Sending lesson content create fetch, URL: " +
        `${request.parsedUrl.protocol}//${request.parsedUrl.host}/api/v1/content`
    );

    await request.env.CREATE_COURSE_OUTLINE_QUEUE.send(JSON.stringify(lessonContentCreateMsg));

    console.log("Sent lesson content create fetch");

    return mapInternalToPublicCourse(internalCourse);
  }

  async createCourseV2(request: RequestWrapper) {
    const courseRequest = new CourseRequestPost(await request.json());
    courseRequest.Validate();

    const courseId = uuidv4();

    const { user } = request;

    let createCourseOutlineMessage: CreateCourseOutlineMessage = {
      course_id: courseId,
      user_id: user?.id!,
      search_text: courseRequest.search_text!,
    };

    await request.env.CREATE_COURSE_OUTLINE_QUEUE.send(JSON.stringify(createCourseOutlineMessage));

    return { course_id: courseId };
  }

  async createCourseWaitUntil(
    supabaseClient: SupabaseClient<Database>,
    userId: string,
    searchText: string,
    courseId: string,
    env: Env
  ): Promise<void> {
    // Initialize new OpenAI API client
    const generationWrapper = new GenerationWrapper(supabaseClient);
    const openAIClient = new OpenAIClient(env);
    let internalCourse = await generationWrapper.wrapGenerationRequest<InternalCourse>(
      userId,
      userId,
      searchText,
      courseId,
      InternalGenerationReferenceType.Course,
      async () => {
        return await openAIClient.createCourseOutlineTitles(searchText, defaults.gpt4);
      }
    );

    internalCourse.user_id = userId;
    internalCourse.id = courseId;

    // Insert course and sections into db
    const courseDao = new CourseDao(supabaseClient);
    await courseDao.insertCourse(internalCourse, searchText, null);

    this.updateCourseItemFields(internalCourse.items, userId, internalCourse.id);

    const courseItemDao = new CourseItemDao(supabaseClient);
    await courseItemDao.insertCourseItemsRecursivelyV2(internalCourse.items);

    let lessonContentCreateMsg: LessonContentCreateMessage = {
      course_id: courseId,
      course: internalCourse,
      user_id: userId,
      search_text: searchText,
    };

    console.log("Creating lesson content");

    await env.CREATE_LESSON_CONTENT_QUEUE.send(JSON.stringify(lessonContentCreateMsg));

    console.log("Sent lesson content create fetch");
  }

  async getCourse(request: RequestWrapper): Promise<PublicCourse> {
    let courseId = request.params.id;
    validators.notNullAndValidUUID(courseId, "course_id");

    // Initialize Supabase client
    const supabase = request.supabaseClient;

    const courseDao = new CourseDao(supabase);
    const coursePromise = courseDao.getCourseById(courseId);

    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(courseId);

    const [courseResponse, courseItemsResponse] = await Promise.all([coursePromise, courseItemsPromise]);

    const course: InternalCourse = mapCourseDaoToInternalCourse(courseResponse);
    const courseItems: InternalCourseItem[] = courseItemsResponse.map(mapCourseItemDaoToInternalCourseItem);

    const courseOutline = buildCourseOutline(course, courseItems);

    const publicCourse = mapInternalToPublicCourse(courseOutline);

    return publicCourse;
  }

  updateCourseItemFields(items: InternalCourseItem[], userId?: string, courseId?: string, parentId?: string): void {
    items.forEach((item) => {
      // Set userId, courseId, and parentId for the current item
      item.user_id = userId;
      item.course_id = courseId;
      item.id = uuidv4();
      item.parent_id = parentId;

      // If the current item has child items, recursively set userId, courseId, and parentId for them
      if (item.items && item.items.length > 0) {
        this.updateCourseItemFields(item.items, userId, courseId, item.id);
      }
    });
  }
}
