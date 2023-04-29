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


    // id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    // title text NOT NULL,
    // description text NOT NULL,
    // dates text NULL,
    // order_index integer NOT NULL,
    // type course_item_type NOT NULL,
    // course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
    // user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE SET NULL,

    // created_at timestamptz NOT NULL DEFAULT now(),
    // updated_at timestamptz NOT NULL DEFAULT now()
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
  ): Promise<Database["public"]["Tables"]["course_item"]["Row"][]> {
    const insertedItems: Database["public"]["Tables"]["course_item"]["Row"][] = [];
  
    for (const course_item of course_items) {
      const { data, error } = await this.supabase
        .from("course_item")
        .insert([
          {
            title: course_item.title,
            description: course_item.description,
            dates: course_item.dates,
            order_index: course_item.order_index,
            type: course_item.type,
            course_id: course_item.course_id,
            user_id: course_item.user_id,
          },
        ])
        .select()
        .returns<Database["public"]["Tables"]["course_item"]["Row"][]>();
  
      if (error) {
        throw error;
      }
  
      if (data && data.length > 0) {
        const insertedItem = data[0];
        insertedItems.push(insertedItem);
  
        // Insert the course item into the closure table
        if (parentItemId) {
          const { error: closureError } = await this.supabase
            .from("course_item_closure")
            .insert([
              {
                ancestor_id: parentItemId,
                descendant_id: insertedItem.id,
                depth: 1,
              },
              {
                ancestor_id: insertedItem.id,
                descendant_id: insertedItem.id,
                depth: 0,
              },
            ]);
  
          if (closureError) {
            throw closureError;
          }
        } else {
          const { error: closureError } = await this.supabase
            .from("course_item_closure")
            .insert([
              {
                ancestor_id: insertedItem.id,
                descendant_id: insertedItem.id,
                depth: 0,
              },
            ]);
  
          if (closureError) {
            throw closureError;
          }
        }
  
        // If the current item has child items, recursively insert them
        if (course_item.items && course_item.items.length > 0) {
          const childItems = await this.insertCourseItemsRecursively(course_item.items, insertedItem.id);
          insertedItems.push(...childItems);
        }
      }
    }
  
    return insertedItems;
  }
  
}
