import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/Errors";
import { Database } from "../consts/database.types";
import { InternalTopic } from "../lib/InternalModels";

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

  async getTopicsByLessonId(
    lessonId: string
  ): Promise<Database["public"]["Tables"]["topic"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("topic")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true })
      .returns<Database["public"]["Tables"]["topic"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to get topics by lesson id ${lessonId}, ${error.message}`);
    }

    return data;
  }

  async getTopicsByCourseId(
    courseId: string
  ): Promise<Database["public"]["Tables"]["topic"]["Row"][]> {
    const { data, error } = await this.supabase
      .from("topic")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true })
      .returns<Database["public"]["Tables"]["topic"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to get topics by course id ${courseId}, ${error.message}`);
    }

    return data;
  }

  async insertTopics(
    topics: InternalTopic[]
  ): Promise<Database["public"]["Tables"]["topic"]["Row"][]> {
    const { data, error } = await this.supabase
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
      )
      .select("*")
      .returns<Database["public"]["Tables"]["topic"]["Row"][]>();

    if (error) {
      throw new SupabaseError(error.code, `Failed to insert topics, ${error.message}`);
    }

    if(!data)
    {
      throw new SupabaseError("topic_not_found", `Failed to insert topics, no data returned`);
    }

    return data;
  } 
}

