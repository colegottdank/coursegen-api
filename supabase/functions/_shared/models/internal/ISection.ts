export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ISectionContent[];
    subsections?: ISection[];
    courseId?: string;
    parentId?: number;
    path: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISectionContent {
    header: string;
    text?: string;
}