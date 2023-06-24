export interface InternalCourse {
  id?: string;
  title: string;
  description?: string;
  search_text?: string;
  dates?: string;
  user_id?: string;
  created_at?: Date;
  updated_at?: Date;
  original_course_id?: string;
  items: InternalCourseItem[];
}

export interface InternalCourseItem {
  id?: string;
  parent_id?: string;
  title: string;
  description?: string;
  dates?: string;
  order_index: number;
  type: InternalCourseItemType;
  course_id?: string;
  user_id?: string;
  items?: InternalCourseItem[];
  topics?: InternalTopic[];
}

export interface InternalTopic {
  id: string;
  title: string;
  content?: string;
  order_index?: number;
  lesson_id: string;
  user_id: string;
  course_id: string;
  created_at?: Date;
  updated_at?: Date;
}

export enum InternalCourseItemType {
  Module = "module",
  Lesson = "lesson",
}

export interface InternalGenerationLog {
  id?: string;
  reference_name: string;
  reference_id: string;
  reference_type: InternalGenerationReferenceType;
  generation_status: InternalGenerationStatus;
  generator_user_id: string;
  owner_user_id: string;
  created_at?: Date;
  updated_at?: Date;
}

export enum InternalGenerationStatus {
  InProgress = "in_progress",
  Success = "success",
  Failure = "failure",
  Timeout = "timeout"
}

export enum InternalGenerationReferenceType {
  Course = "course",
  Lesson = "lesson",
  Lessons = "lessons"
}