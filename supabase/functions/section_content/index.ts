import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { SectionContentRequest } from "../_shared/dtos/content/SectionContentRequest.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { SectionDao } from "../_shared/daos/SectionDao.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { BadRequestError } from "../_shared/consts/errors/BadRequestError.ts";
import { NotFoundError } from "../_shared/consts/errors/NotFoundError.ts";
import * as section_utils from "../_shared/util/section_utils.ts";
import * as course_utils from "../_shared/util/course_utils.ts";
import { ISectionContent } from "../_shared/models/internal/ISection.ts";
import { ICourseOutline } from "../_shared/models/internal/ICourseOutline.ts";
import * as defaults from "../_shared/consts/defaults.ts";
import { ISectionContentPublic, ISectionPublic } from "../_shared/models/public/ISectionPublic.ts";

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

  const courseForOutline = course_utils.mapCourseFromDb(course);
  const sectionsForOutline = section_utils.buildNestedSections(sections);
  const courseOutline: ICourseOutline = {
    Course: courseForOutline,
    Sections: sectionsForOutline,
  };

  sectionContentRequest.title = section.title;
  
  const openAIClient = new OpenAIClient();

  const headers = await openAIClient.generateHeaders(
    sectionContentRequest,
    JSON.stringify(courseOutline),
    defaults.gpt35
  );
  
  const currentSection = courseOutline.Sections.find((sec) => sec.id === section.id);
  if (!currentSection) {
    throw new NotFoundError(`Section not found for section id ${sectionContentRequest.section_id}`);
  }

  currentSection.content = headers.map((header: string) => ({
    header,
    text: undefined,
  }));
  
  const contents = await openAIClient.createSectionContent(
    sectionContentRequest,
    JSON.stringify(courseOutline),
    headers,
    defaults.gpt35
  );

  for (let i = 0; i < contents.length; i++) {
    currentSection.content[i].text = contents[i];
  }

  await sectionDao.updateSectionContentBySectionId(section.id, JSON.stringify(currentSection.content));

  const sectionPublic: ISectionPublic = {
    id: section.id,
    title: section.title,
    description: section.description,
    dates: section.dates ?? undefined,
    content: currentSection.content.map((sectionContent) => {
      const mappedContent: ISectionContentPublic = {
        header: sectionContent.header,
        text: sectionContent.text!,
      }
      return mappedContent;
    }) ?? undefined,
    path: section.path
  }
  
  return sectionPublic;
});

serve((req) => httpService.handle(req));
