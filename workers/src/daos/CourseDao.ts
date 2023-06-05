import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../consts/database.types";
import { SupabaseError } from "../consts/Errors";
import { InternalCourse } from "../lib/InternalModels";


export class CourseDao {
  constructor(private supabase: SupabaseClient) {}

  async getCourseById(courseId: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .select("*")
      .eq("id", courseId)
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

      if(error) {
        throw new SupabaseError("course_not_found", `Failed to get course by id ${courseId}`);
      }
  
      if(!data) {
        throw new SupabaseError("course_not_found", `Course not found by id ${courseId}`);
      }

    return data;
  }

  async getCourseByIdAndUserId(courseId: string, userId: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .select("*")
      .eq("user_id", userId)
      .eq("id", courseId)
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      throw new SupabaseError("course_not_found", `Failed to get course by id ${courseId} and user id ${userId}`);
    }

    if(!data) {
      throw new SupabaseError("course_not_found", `Course not found by id ${courseId} for user ${userId}`);
    }

    return data;
  }

  async insertCourse(course: InternalCourse, search_text: string, origin_course_id: string | null): Promise<Database["public"]["Tables"]["course"]["Row"]> {    
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        id: course.id,
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.user_id,
        search_text: search_text,
        origin_course_id: origin_course_id
      })
      .select()
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      throw new SupabaseError(error.code, `Failed to insert course, ${error.message}`);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }
}
