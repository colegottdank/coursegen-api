import { ICourseOutlinePublic } from './../_shared/models/public/ICourseOutlinePublic.ts';
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { SectionDao } from "../_shared/daos/SectionDao.ts";
import { SupabaseError } from "../_shared/consts/errors/SupabaseError.ts";
import { ISectionPublic } from "../_shared/models/public/ISectionPublic.ts";

const httpService = new HttpService(async (req: Request) => {
  // Parse request parameters
  const courseRequest = new CourseRequest(await req.json());
  courseRequest.Validate();

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  var courseOutline = await openAIClient.createCourseOutline(courseRequest);

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);
  // Get logged in user
  const user = await supabase.auth.getUser(req.headers.get('Authorization')!.replace("Bearer ",""));

  if(!user?.data?.user?.id)
  {
    console.log("User not found");
    throw new SupabaseError("404", "User not found");
  }

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  courseOutline.Course.userId = user.data.user?.id;
  const insertedCourse = await courseDao.insertCourse(courseOutline.Course, `Message: ${courseRequest.search_text}, Section Count: ${courseRequest.section_count}, Max Tokens: ${courseRequest.max_tokens}, Temperature: ${courseRequest.temperature}`);

  // Set course id and userId on sections
  courseOutline.Sections.forEach((section) => {
    section.userId = user.data.user?.id;
    section.courseId = insertedCourse?.id;
  });

  const sectionDao = new SectionDao(supabase);
  const insertedSections = await sectionDao.insertSections(courseOutline.Sections);

  // Map internal model to public model
  const courseOutlineResponse: ICourseOutlinePublic = {
    Course: {
      courseId: insertedCourse.id,
      title: insertedCourse.title,
      dates: insertedCourse.dates ?? undefined,
      description: insertedCourse.description
    },
    Sections:
      insertedSections.map((section) => {
        const mappedSection: ISectionPublic = {
          id: section.id,
          title: section.title,
          dates: section.dates ?? undefined,
          description: section.description,
          content: undefined,
          path: section.path
        };
        return mappedSection;
      }) ?? [],
  };

  return courseOutlineResponse;
});

serve((req) => httpService.handle(req));