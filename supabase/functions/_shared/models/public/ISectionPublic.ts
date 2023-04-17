export interface ISectionPublic {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ITopic[];
    subsections?: ISectionPublic[];
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITopic {
    title: string;
    content?: string;
}