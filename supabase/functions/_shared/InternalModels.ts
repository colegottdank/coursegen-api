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
}

export enum CourseItemType {
  Module = 'module',
  Lesson = 'lesson'
}