export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string;
    courseId?: string;
    parentId?: number;
    path: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}