import { ICourseOutline } from "./../_shared/models/public/ICourseOutline.ts";
import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { CourseRequest } from "../_shared/dtos/course/CourseRequest.ts";
import { CourseDao } from "../_shared/daos/CourseDao.ts";
import { ISection } from "../_shared/models/public/ISection.ts";

const httpService = new HttpService(async (req: Request) => {
  // Parse request parameters
  const courseRequest = new CourseRequest(await req.json());
  courseRequest.Validate();

  // Initialize new OpenAI API client
  const openAIClient = new OpenAIClient();
  var courseOutline = await openAIClient.createCourseOutline(courseRequest);

  console.log(courseOutline.Course, courseOutline.Sections.map((section) => section.name));

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);
  // Get logged in user
  const user = await supabase.auth.getUser();

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  console.log("User: ", user);
  courseOutline.Course.userId = user.data.user?.id;
  console.log("Pre inserted course: ", courseOutline.Course)
  const insertedCourse = await courseDao.insertCourse(courseOutline.Course);

  courseOutline.Sections.forEach((section) => {
    section.userId = user.data.user?.id;
    section.courseId = insertedCourse.data?.id;
  });
  console.log("Pre inserted sections: ", courseOutline.Sections.map((section) => section.name));
  const insertedSections = await courseDao.insertSections(courseOutline.Sections);

  console.log("insertedCourse: ", insertedCourse)
  console.log("insertedSection: ", insertedSections.data?.map((section) => section.name))
  // Map internal model to public model
  const courseOutlineResponse: ICourseOutline = {
    Course: {
      title: insertedCourse.data?.title ?? "Title undefined",
      description: insertedCourse.data?.description ?? "Description undefined",
    },
    Sections:
      insertedSections.data?.map((section) => {
        const mappedSection: ISection = {
          id: section.id,
          name: section.name,
          description: section.description,
          sectionOrder: section.section_order,
          content: section.content,
        };
        return mappedSection;
      }) ?? [],
  };

  return courseOutlineResponse;
});

serve((req) => httpService.handle(req));