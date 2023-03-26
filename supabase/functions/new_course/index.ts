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
  console.log(courseOutline.Course, courseOutline.Sections.map((section) => section.title));

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);
  // Get logged in user
  const user = await supabase.auth.getUser();

  // Insert course and sections into db
  const courseDao = new CourseDao(supabase);
  courseOutline.Course.userId = user.data.user?.id;
  const insertedCourse = await courseDao.insertCourse(courseOutline.Course);

  courseOutline.Sections.forEach((section) => {
    section.userId = user.data.user?.id;
    section.courseId = insertedCourse.data?.id;
  });
  const insertedSections = await courseDao.insertSections(courseOutline.Sections);

  // Map internal model to public model
  const courseOutlineResponse: ICourseOutline = {
    Course: {
      courseId: insertedCourse.data?.id ?? "Id undefined",
      title: insertedCourse.data?.title ?? "Title undefined",
      dates: insertedCourse.data?.dates ?? "Dates undefined",
      description: insertedCourse.data?.description ?? "Description undefined",
    },
    Sections:
      insertedSections.data?.map((section) => {
        const mappedSection: ISection = {
          id: section.id,
          title: section.title,
          dates: section.dates ?? "Dates undefined",
          description: section.description,
          content: section.content,
          path: section.path
        };
        return mappedSection;
      }) ?? [],
  };

  return courseOutlineResponse;
});

serve((req) => httpService.handle(req));