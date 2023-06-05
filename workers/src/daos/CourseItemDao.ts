import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../consts/database.types";
import { SupabaseError } from "../consts/Errors";
import { InternalCourseItem } from "../lib/InternalModels";

export class CourseItemDao {
  constructor(private supabase: SupabaseClient) {}

  async getCourseItemsByCourseIdAndUserId(
    course_id: string,
    user_id: string
  ): Promise<Database["public"]["Tables"]["course_item"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("course_item")
      .select()
      .eq("course_id", course_id)
      .eq("user_id", user_id)
      .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();

    if (error) {
      throw new SupabaseError(
        error.code,
        `Failed to get course items for course ${course_id} and user ${user_id}`
      );
    }

    if (!data) {
      throw new SupabaseError(
        "course_item_not_found",
        `Course items not found for course ${course_id} and user ${user_id}`
      );
    }

    return data;
  }

  async getCourseItemsByCourseId(
    course_id: string
  ): Promise<Database["public"]["Tables"]["course_item"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("course_item")
      .select()
      .eq("course_id", course_id)
      .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();

    if (error) {
      throw new SupabaseError(
        error.code,
        `Failed to get course items for course ${course_id}`
      );
    }

    if (!data) {
      throw new SupabaseError(
        "course_item_not_found",
        `Course items not found for course ${course_id}`
      );
    }

    return data;
  }

  async insertCourseItems(
    course_items: InternalCourseItem[]
  ): Promise<Database["public"]["Tables"]["course_item"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("course_item")
      .insert(
        course_items.map((course_item) => {
          return {
            id: course_item.id,
            title: course_item.title,
            description: course_item.description,
            dates: course_item.dates,
            order_index: course_item.order_index,
            type: course_item.type,
            parent_id: course_item.parent_id,
            course_id: course_item.course_id,
            user_id: course_item.user_id,
          };
        })
      )
      .select()
      .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to insert course items, ${error.message}`);
    }

    if (!data) {
      throw new SupabaseError("404", `Course items not found`);
    }

    return data;
  }

  async insertCourseItemsRecursivelyV2(course_items: InternalCourseItem[]): Promise<void> {
    // Flatten the items
    const flattenedItems: InternalCourseItem[] = [];

    const flatten = (items: InternalCourseItem[]) => {
      for (const item of items) {
        flattenedItems.push(item);

        if (item.items && item.items.length > 0) {
          flatten(item.items);
        }
      }
    };

    flatten(course_items);

    // Bulk insert
    const { error } = await this.supabase.from("course_item").insert(
      flattenedItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        dates: item.dates,
        order_index: item.order_index,
        type: item.type,
        course_id: item.course_id,
        user_id: item.user_id,
        parent_id: item.parent_id,
      }))
    );

    if (error) {
      throw error;
    }
  }
}