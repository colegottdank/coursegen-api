import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { SectionContentRequest } from "../_shared/dtos/content/SectionContentRequest.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { SectionDao } from "../_shared/daos/SectionDao.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { ISection } from "../_shared/models/public/ISection.ts";
import { BadRequestError } from "../_shared/consts/errors/BadRequestError.ts";
import { NotFoundError } from "../_shared/consts/errors/NotFoundError.ts";
import * as section_utils from "../_shared/util/section_utils.ts";
import * as course_utils from "../_shared/util/course_utils.ts";


const httpService = new HttpService(async (req: Request) => {
  const sectionContentRequest = new SectionContentRequest(await req.json());
  sectionContentRequest.Validate();

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);

  const courseDao = new CourseDao(supabase);
  const course = await courseDao.getCourseById(sectionContentRequest.course_id!);

  const sectionDao = new SectionDao(supabase);
  const sections = await sectionDao.getSectionsByCourseKey(sectionContentRequest.course_id!);

  if (!sections || sections.length === 0) {
    throw new NotFoundError(`Sections not found for course id ${sectionContentRequest.course_id}`);
  }

  const section = sections.find((sec) => sec.id === sectionContentRequest.section_id!);

  if (!section) {
    throw new NotFoundError(`Section not found for section id ${sectionContentRequest.section_id}`);
  }

  if (section.content) {
    throw new BadRequestError("Section already has content");
  }

  const courseSections = {
    course: course_utils.mapCourseFromDb(course),
    sections: section_utils.buildNestedSections(sections)
  }

  const courseSectionsStr = JSON.stringify(courseSections);
  console.log(courseSectionsStr);

  sectionContentRequest.title = section.title;
  const openAIClient = new OpenAIClient();
  const content = await openAIClient.createSectionContentStream(sectionContentRequest, supabase);

  await sectionDao.updateSectionContentBySectionId(sectionContentRequest.section_id!, content);

  const publicSection: ISection = {
    id: section.id,
    title: section.title,
    dates: section.dates ?? undefined,
    description: section.description,
    content: content ?? undefined,
    path: section.path,
  };

  return publicSection;
});

serve((req) => httpService.handle(req));

