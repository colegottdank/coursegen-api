import { SupabaseClient } from "@supabase/supabase-js";
import { PostgrestSingleResponse } from "@supabase/supabase-js";

interface Course {
  created_at: string;
  description: string;
  id: number;
  title: string;
  updated_at: string;
  user_id: string;
}

interface CourseSection {
  content: string | null;
  course_id: number | null;
  created_at: string;
  description: string;
  id: number;
  name: string;
  parent_id: number | null;
  section_order: number;
  updated_at: string;
  user_id: string;
}

export class CourseDao {
  constructor(private supabase: SupabaseClient) {}

  async insertCourse(): Promise<PostgrestSingleResponse<Course>> {
    return await this.supabase
      .from("course")
      .insert({
        description: "This is a course",
        title: "My Course",
        user_id: "1",
      })
      .select()
      .limit(1)
      .single();
  }
}
