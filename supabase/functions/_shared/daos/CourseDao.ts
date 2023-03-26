import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";
import { Database } from "../database.types.ts";
import { ICourse } from "../models/internal/ICourse.ts";

export class CourseDao {
  constructor(private supabase: SupabaseClient) {}

  async insertCourse(course: ICourse): Promise<Database["public"]["Tables"]["course"]["Row"]> {
    const {data, error} = await this.supabase
      .from("course")
      .insert({
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.userId,
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
}
