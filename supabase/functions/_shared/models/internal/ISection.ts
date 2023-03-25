export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string;
    courseId?: string;
    parentId?: number;
    sectionOrder: number;
    path: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}