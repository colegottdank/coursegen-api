export interface InternalCourse {
  id?: string;
  title: string;
  description?: string;
  dates?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  items: InternalCourseItem[];
}

export interface InternalCourseItem {
  id?: string;
  parent_id?: string;
  title: string;
  description: string;
  dates?: string;
  order_index: number;
  type: CourseItemType;
  course_id?: string;
  user_id?: string;
  items?: InternalCourseItem[];
  topics?: InternalTopic[];
}

export interface InternalCourseItemClosure {
  ancestor_id: string;
  descendant_id: string;
  depth: number;
  course_id: string;
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

export enum CourseItemType {
  Module = 'module',
  Lesson = 'lesson'
}