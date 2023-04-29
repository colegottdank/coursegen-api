import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";
import { Database } from "../database.types.ts";
import { InternalCourse } from "../InternalModels.ts";
import { ICourse } from "../models/internal/ICourse.ts";

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
      console.log(error);
      throw new SupabaseError(error.code, `Failed to get course by id`);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }

  async insertCourseV2(course: InternalCourse, search_text: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.userId,
        search_text: search_text
      })
      .select()
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      console.log(error);
      throw new SupabaseError(error.code, `Failed to insert course`);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }

  async insertCourse(course: ICourse, search_text: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.userId,
        search_text: search_text
      })
      .select()
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      console.log(error);
      throw new SupabaseError(error.code, `Failed to insert course`);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }
}
