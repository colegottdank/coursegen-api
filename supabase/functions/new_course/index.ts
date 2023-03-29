import { ICourseOutline } from "./../_shared/models/public/ICourseOutline.ts";
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { ISection } from "../_shared/models/public/ISection.ts";
import { SectionDao } from "../_shared/daos/SectionDao.ts";
import { SupabaseError } from "../_shared/consts/errors/SupabaseError.ts";
import { defaultProficiency, defaultSectionCount } from "../_shared/consts/defaults.ts";

const httpService = new HttpService(async (req: Request) => {
  // Parse request parameters
  const courseRequest = new CourseRequest(await req.json());
  courseRequest.Validate();

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  const newUserMessage = `Subject: ${courseRequest.subject}, 
    Proficiency: ${courseRequest.proficiency ?? defaultProficiency}, 
    Sections: ${courseRequest.section_count ?? defaultSectionCount}`
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
  const insertedCourse = await courseDao.insertCourse(courseOutline.Course, newUserMessage);

  // Set course id and userId on sections
  courseOutline.Sections.forEach((section) => {
    section.userId = user.data.user?.id;
    section.courseId = insertedCourse?.id;
  });

  const sectionDao = new SectionDao(supabase);
  const insertedSections = await sectionDao.insertSections(courseOutline.Sections);

  // Map internal model to public model
  const courseOutlineResponse: ICourseOutline = {
    Course: {
      courseId: insertedCourse.id,
      title: insertedCourse.title,
      dates: insertedCourse.dates ?? undefined,
      description: insertedCourse.description
    },
    Sections:
      insertedSections.map((section) => {
        const mappedSection: ISection = {
          id: section.id,
          title: section.title,
          dates: section.dates ?? undefined,
          description: section.description,
          content: section.content ?? undefined,
          path: section.path
        };
        return mappedSection;
      }) ?? [],
  };

  return courseOutlineResponse;
});

serve((req) => httpService.handle(req));