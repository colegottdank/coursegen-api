export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string;
    courseId?: number;
    parentId?: number;
    sectionOrder: number;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}