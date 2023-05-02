export interface PublicCourse {
    id?: string;
    title: string;
    description?: string;
    dates?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
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
    items?: PublicCourseItem[];
}
  
export enum CourseItemType {
    Module = 'module',
    Lesson = 'lesson'
}