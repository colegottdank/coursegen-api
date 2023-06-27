import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/Errors";
import { InternalCourse } from "../lib/InternalModels";
import { Database } from "../consts/database.types";


export class CourseDao {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getCourseById(courseId: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .select("*")
      .eq("id", courseId)
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .limit(1);

      if(error) {
        throw new SupabaseError("422", `Failed to get course by id ${courseId}`, error.code);
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
      throw new SupabaseError("422", `Failed to get course by id ${courseId} and user id ${userId}`, error.code);
    }

    if(!data) {
      throw new SupabaseError("404", `Course not found by id ${courseId} for user ${userId}`);
    }

    return data;
  }

  async insertCourse(course: InternalCourse, search_text: string, origin_course_id: string | null): Promise<Database["public"]["Tables"]["course"]["Row"]> { 
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        id: course.id,
        description: course.description!,
        title: course.title,
        dates: course.dates,
        user_id: course.user_id!,
        search_text: search_text,
        origin_course_id: origin_course_id
      })
      .select()
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      throw new SupabaseError("422", `Failed to insert course, ${error.message}`, error.code);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }
}
