import { PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../database.types.ts";
import { ISection } from "../models/internal/ISection.ts";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";

export class SectionDao {
  constructor(private supabase: SupabaseClient) {}

  async insertSections(
    sections: ISection[]
  ): Promise<Database["public"]["Tables"]["section"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("section")
      .insert(
        sections.map((section) => {
          return {
            title: section.title,
            description: section.description,
            dates: section.dates,
            content: section.content,
            user_id: section.userId,
            course_id: section.courseId,
            path: section.path,
          };
        })
      )
      .select()
      .returns<Database["public"]["Tables"]["section"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to insert sections`);
    }

    if (!data) {
        throw new SupabaseError("404", `Sections not found`);
    }

    return data;
  }

  async getSectionBySectionIdAndCourseId(
    sectionId: number,
    courseId: string
  ): Promise<Database["public"]["Tables"]["section"]["Row"]> {
    const { data, error } = await this.supabase
      .from("section")
      .select("*")
      .eq("id", sectionId)
      .eq("course_id", courseId)
      .returns<Database["public"]["Tables"]["section"]["Row"]>()
      .single();

    if (error) {
      throw new SupabaseError(error.code, `Failed to get section by section id`);
    }

    if(!data) {
        throw new SupabaseError("404", `Section not found`);
    }

    return data;
  }

  async getSectionsByCourseKey(
    courseId: string
  ): Promise<Database["public"]["Tables"]["section"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("section")
      .select("*")
      .eq("course_id", courseId)
      .order("path", { ascending: true })
      .returns<Database["public"]["Tables"]["section"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to get section by course id`);
    }

    if(!data) {
        throw new SupabaseError("404", `Section not found`);
    }

    return data;
  }

  async updateSectionContentBySectionId(
    sectionId: number,
    content: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("section")
      .update({ content: content })
      .eq("id", sectionId);

    if (error) {
      throw new SupabaseError(error.code, `Failed to update section content`);
    }
  }
}
