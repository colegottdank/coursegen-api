export interface ISection {
    id?: number;
    name: string;
    description: string;
    content?: string | null;
    courseId?: number | null;
    parentId?: number | null;
    sectionOrder: number;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}