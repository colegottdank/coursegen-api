import { PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types.ts';
import { ICourse } from "../models/internal/ICourse.ts";
import { ISection } from "../models/internal/ISection.ts";

export class CourseDao {
  constructor(private supabase: SupabaseClient) {}

  async insertCourse(course: ICourse): Promise<PostgrestSingleResponse<Database['public']['Tables']['course']['Row']>> {
    return await this.supabase
      .from("course")
      .insert({
        description: course.description,
        title: course.title,
        dates: course.dates,
        user_id: course.userId,
      })
      .select()
      .limit(1)
      .single();
  }

  async insertSections(sections: ISection[]): Promise<PostgrestResponse<Database['public']['Tables']['section']['Row']>> {
    return await this.supabase
      .from("section")
      .insert(sections.map((section) => {
        return {
          title: section.title,
          description: section.description,
          dates: section.dates,
          section_order: section.sectionOrder,
          content: section.content,
          user_id: section.userId,
          course_key: section.courseKey,
          path: section.path
        }
      }))
      .select()
      .returns()
  }
}