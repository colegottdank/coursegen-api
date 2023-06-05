import { CourseDao } from "./daos/CourseDao";
import { CourseItemDao } from "./daos/CourseItemDao";
import { CourseRequestPost } from "./dtos/CourseDtos";
import { HttpService } from "./lib/HttpService";
import { InternalCourseItem } from "./lib/InternalModels";
import { mapInternalToPublicCourse } from "./lib/Mappers";
import { OpenAIClient } from "./lib/OpenAIClient";
import { v4 as uuidv4 } from "uuid";
import * as defaults from './consts/Defaults';

export class CourseHandler {
  async postCourse(httpService: HttpService) {
    const reqWrapper = httpService.getRequestWrapper();
    let courseRequest = new CourseRequestPost(await reqWrapper.getBodyAsText());
    courseRequest.Validate();

    // Initialize Supabase client
    const supabase = httpService.getSupabaseClient();
    const user = httpService.getUser();

    // Initialize new OpenAI API client
    const openAIClient = new OpenAIClient(reqWrapper);
    let courseOutline = await openAIClient.createCourseOutlineTitles(courseRequest, defaults.gpt4);
    courseOutline.user_id = user?.id;

    // Insert course and sections into db
    const courseDao = new CourseDao(supabase);
    const insertedCourse = await courseDao.insertCourse(courseOutline, `${courseRequest.search_text}`, null);
    courseOutline.id = insertedCourse.id;

    this.updateCourseItemFields(courseOutline.items, user?.id, insertedCourse.id);

    const courseItemDao = new CourseItemDao(supabase);
    await courseItemDao.insertCourseItemsRecursivelyV2(courseOutline.items);

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