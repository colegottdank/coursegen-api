import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";
import { Database } from "../database.types.ts";
import { InternalTopic } from "../InternalModels.ts";

export class TopicDao {
  constructor(private supabase: SupabaseClient) {}

  async getTopicsByLessonIdAndUserId(
    lessonId: string,
    userId: string
  ): Promise<Database["public"]["Tables"]["topic"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("topic")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .returns<Database["public"]["Tables"]["topic"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to get topics by lesson id, ${error.message} and userId ${userId}`);
    }

    return data;
  }

  async insertTopics(
    topics: InternalTopic[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from("topic")
      .insert(
        topics.map((topic) => {
          return {
            id: topic.id,
            title: topic.title,
            content: topic.content,
            order_index: topic.order_index,
            lesson_id: topic.lesson_id,
            user_id: topic.user_id,
            course_id: topic.course_id
          };
        })
      );

    if (error) {
      throw new SupabaseError(error.code, `Failed to insert topics, ${error.message}`);
    }
  }

  async updateTopicsWithContent(
    topics: InternalTopic[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from("topic")
      .update(
        topics.map((topic) => {
          return {
            content: topic.content,
          };
        }
      )
    );
        
    if (error) {
      throw new SupabaseError(error.code, `Failed to update topics, ${error.message}`);
    }
  
    return;
  }  
}

