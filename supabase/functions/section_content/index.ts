import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { LessonDao } from "../_shared/daos/SectionDao.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { BadRequestError } from "../_shared/consts/errors/BadRequestError.ts";
import { NotFoundError } from "../_shared/consts/errors/NotFoundError.ts";
import * as section_utils from "../_shared/util/section_utils.ts";
import * as course_utils from "../_shared/util/course_utils.ts";
import { ICourseOutline } from "../_shared/models/internal/ICourseOutline.ts";
import * as defaults from "../_shared/consts/defaults.ts";
import { ITopic, ILessonPublic } from "../_shared/models/public/ILessonPublic.ts";
import { TopicsRequest } from "../_shared/dtos/content/TopicsRequest.ts";

const httpService = new HttpService(async (req: Request) => {
  const topicsRequest = new TopicsRequest(await req.json());
  topicsRequest.Validate();

  // Initialize Supabase client & retrieve course outline
  const supabase = httpService.getSupabaseClient(req);

  const courseDao = new CourseDao(supabase);
  const course = await courseDao.getCourseById(topicsRequest.course_id!);

  const lessonDao = new LessonDao(supabase);
  const lessons = await lessonDao.getSectionsByCourseKey(topicsRequest.course_id!);

  if (!lessons || lessons.length === 0) {
    throw new NotFoundError(`Sections not found for course id ${topicsRequest.course_id}`);
  }

  // Retrieve lesson by lesson id passed in
  const lesson = lessons.find((sec) => sec.id === topicsRequest.section_id!);

  if (!lesson) {
    throw new NotFoundError(`Section not found for section id ${topicsRequest.section_id}`);
  }

  if (lesson.content) {
    throw new BadRequestError("Section already has content");
  }

  topicsRequest.title = lesson.title;

  // Build course outline for OpenAI
  const courseForOutline = course_utils.mapCourseFromDb(course);
  const sectionsForOutline = section_utils.buildNestedSections(lessons);
  const courseOutline: ICourseOutline = {
    Course: courseForOutline,
    Sections: sectionsForOutline,
  };
  
  // Generate topic titles
  const openAIClient = new OpenAIClient();

  const topicTitles = await openAIClient.generateTopicTitles(
    topicsRequest,
    JSON.stringify(courseOutline),
    defaults.gpt4
  );
  
  // Update course outline with topic titles for OpenAI
  const lessonWithTopics = courseOutline.Sections.find((sec) => sec.id === lesson.id);
  if (!lessonWithTopics) {
    throw new NotFoundError(`Lesson not found for section id ${topicsRequest.section_id}`);
  }

  lessonWithTopics.content = topicTitles.map((title: any) => ({
    title,
    content: undefined,
  }));

  // Generate topic content
  const topicContent = await openAIClient.generateTopicContent(
    topicsRequest,
    JSON.stringify(courseOutline),
    topicTitles,
    defaults.gpt35
  );

  // Update lesson with content
  for (let i = 0; i < topicContent.length; i++) {
    lessonWithTopics.content[i].content = topicContent[i];
  }

  await lessonDao.updateSectionContentBySectionId(lesson.id, JSON.stringify(lessonWithTopics.content));

  const sectionPublic: ILessonPublic = {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    dates: lesson.dates ?? undefined,
    content: lessonWithTopics.content.map((topic) => {
      const mappedContent: ITopic = {
        title: topic.title,
        content: topic.content!,
      }
      return mappedContent;
    }) ?? undefined,
    path: lesson.path
  }
  
  return sectionPublic;
});

serve((req) => httpService.handle(req));