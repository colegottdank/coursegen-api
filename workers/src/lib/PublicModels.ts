export interface PublicCourse {
  id?: string;
  title: string;
  description?: string;
  dates?: string;
  user_id?: string;
  items: PublicCourseItem[];
}

export interface PublicCourseItem {
  id?: string;
  parent_id?: string;
  title: string;
  description: string;
  dates?: string;
  order_index: number;
  type: string;
  course_id?: string;
  user_id?: string;
  items?: PublicCourseItem[];
  topics?: PublicTopic[];
}

export interface PublicTopic {
  id: string;
  title: string;
  content?: string;
  order_index?: number;
  lesson_id?: string;
  user_id?: string;
  course_id?: string;
}

export enum PublicCourseItemType {
  Module = "module",
  Lesson = "lesson",
}

export interface PublicGenerationLog {
  id?: string;
  reference_name: string;
  reference_id: string;
  reference_type: string;
  generation_status: string;
  generator_user_id: string;
  owner_user_id: string;
  created_at?: Date;
  updated_at?: Date;
}

export enum PublicGenerationStatus {
  InProgress = "in_progress",
  Success = "success",
  Failure = "failure"
}

export enum PublicGenerationReferenceType {
  Course = "course",
  Lesson = "lesson"
}
