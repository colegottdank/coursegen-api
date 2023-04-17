export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ITopic[];
    subsections?: ISection[];
    courseId?: string;
    parentId?: number;
    path: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITopic {
    title: string;
    content?: string;
}