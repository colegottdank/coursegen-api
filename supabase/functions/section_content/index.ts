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

  const content: ISectionContent[] = [];

  for (const header of headers) {
    const sectionContent: ISectionContent = {
      header: header,
      text: undefined,
    };
    content.push(sectionContent);
  }

  currentSection.content = content;

  const contents = await openAIClient.createSectionContent(
    sectionContentRequest,
    JSON.stringify(courseOutline),
    headers,
    defaults.gpt35
  );

  console.log(contents.length);
  for (let i = 0; i < contents.length; i++) {
    console.log("-----------------", contents[i]);
    currentSection.content[i].text = contents[i];
  }

  return courseOutline;
  // const sectionContent = await openAIClient.createSectionContentStream(sectionContentRequest, supabase);

  // await sectionDao.updateSectionContentBySectionId(sectionContentRequest.section_id!, JSON.stringify(sectionContent));

  // const publicSection: ISection = {
  //   id: section.id,
  //   title: section.title,
  //   dates: section.dates ?? undefined,
  //   description: section.description,
  //   content: sectionContent.map((sectionContent) => ({
  //     header: sectionContent.header,
  //     text: sectionContent.text,
  //   })) ?? undefined,
  //   path: section.path,
  // };

  // return publicSection;
});

interface IContent {
  content: string;
}

serve((req) => httpService.handle(req));
