import { CourseDao } from "../daos/CourseDao";
import { CourseItemDao } from "../daos/CourseItemDao";
import { CourseRequestPost } from "../dtos/CourseDtos";
import { InternalCourse, InternalCourseItem } from "../lib/InternalModels";
import { buildCourseOutline, mapCourseDaoToInternalCourse, mapCourseItemDaoToInternalCourseItem, mapInternalToPublicCourse } from "../lib/Mappers";
import { v4 as uuidv4 } from "uuid";
import * as defaults from "../consts/Defaults";
import { OpenAIClient } from "../clients/OpenAIClient";
import * as validators from "../lib/Validators";
import { RequestWrapper } from "../router";

export class CourseManager {
  async postCourse(request: RequestWrapper) {
    let courseRequest = new CourseRequestPost(await request.json());
    courseRequest.Validate();

    // Initialize Supabase client
    const supabase = request.supabaseClient;
    const user = request.user;

    // Initialize new OpenAI API client
    const openAIClient = new OpenAIClient(request);
    let courseOutline = await openAIClient.createCourseOutlineTitles(courseRequest, defaults.gpt4);
    courseOutline.user_id = user?.id;
    console.log(courseOutline);

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

  async getCourse(request: RequestWrapper) {
    let courseId = request.params.id;
    validators.notNullAndValidUUID(courseId, "course_id");

    // Initialize Supabase client
    const supabase = request.supabaseClient;

    const courseDao = new CourseDao(supabase);
    const coursePromise = courseDao.getCourseById(courseId);

    const courseItemDao = new CourseItemDao(supabase);
    const courseItemsPromise = courseItemDao.getCourseItemsByCourseId(courseId);

    const [courseResponse, courseItemsResponse] = await Promise.all([coursePromise, courseItemsPromise]);

    console.log(courseItemsResponse);
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
