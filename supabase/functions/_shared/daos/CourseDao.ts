import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/Errors.ts";
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

  async insertCourseV2(course: InternalCourse, search_text: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.user_id,
        search_text: search_text
      })
      .select()
      .returns<Database["public"]["Tables"]["course"]["Row"]>()
      .single();

    if(error) {
      throw new SupabaseError(error.code, `Failed to insert course`);
    } 

    if(!data) {
      throw new SupabaseError("404", `Course not found`);
    }

    return data;
  }

  async insertCourseAndItemsSproc(course: InternalCourse, search_text: string): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase.rpc("insert_course_and_items", {
      course_data: course,
      course_items_data: course.items,
      search_text: search_text
    });

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
