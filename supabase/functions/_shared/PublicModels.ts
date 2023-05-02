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
    type: CourseItemType;
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
  
export enum CourseItemType {
    Module = 'module',
    Lesson = 'lesson'
}