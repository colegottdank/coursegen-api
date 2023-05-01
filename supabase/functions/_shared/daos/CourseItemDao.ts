import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";
import { Database } from "../database.types.ts";
import { InternalCourseItem } from "../InternalModels.ts";

export class CourseItemDao {
  constructor(private supabase: SupabaseClient) {}

  async insertCourseItems(course_items: InternalCourseItem[]): Promise<Database["public"]["Tables"]["course_item"]["Row"][]> {
    const { data, error } = await this.supabase
    .from("course_item")
    .insert(
        course_items.map((course_item) => {
            return {
                title: course_item.title,
                description: course_item.description,
                dates: course_item.dates,
                order_index: course_item.order_index,
                type: course_item.type,
                course_id: course_item.course_id,
                user_id: course_item.user_id
            };
        })
    )
    .select()
    .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();

    if (error) {
        throw new SupabaseError(error.code, `Failed to insert course items`);
    }
    
    if (!data) {
        throw new SupabaseError("404", `Course items not found`);
    }

    return data;
  }

  async insertCourseItemsRecursively(
    course_items: InternalCourseItem[],
    parentItemId?: string
  ): Promise<InternalCourseItem[]> {
    // Flatten the items and collect their references
    const itemRefs: { ref: InternalCourseItem; item: any }[] = [];
    const flattenedItems: any[] = [];
  
    let tempIdCounter = 0;
  
    const flatten = (items: InternalCourseItem[], parentId?: string) => {
      for (const item of items) {
        const newItem = {
          ...item,
          tempId: `temp_${tempIdCounter++}`,
          parentItemId: parentId,
        };
        flattenedItems.push(newItem);
        itemRefs.push({ ref: item, item: newItem });
  
        if (item.items && item.items.length > 0) {
          flatten(item.items, newItem.tempId);
        }
      }
    };
  
    flatten(course_items);
    console.log(flattenedItems);
  
    // Bulk insert
    const { data, error } = await this.supabase
      .from("course_item")
      .insert(flattenedItems.map((item) => ({
        title: item.title,
        description: item.description,
        dates: item.dates,
        order_index: item.order_index,
        type: item.type,
        course_id: item.course_id,
        user_id: item.user_id
      })))
      .select()
      .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();
  
    if (error) {
      throw error;
    }
  
    if (data && data.length > 0) {
      // Map the newly created IDs to the original items
      data.forEach((insertedItem) => {
        const refItem = itemRefs.find((ref) => ref.item.tempId === insertedItem.parent_id);
        if (refItem) {
          refItem.ref.id = insertedItem.id;
          insertedItem.parent_id = refItem.item.parentItemId;
        }
      });
    }
  
    return course_items;
  }
  
}
