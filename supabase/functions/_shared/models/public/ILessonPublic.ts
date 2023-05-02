export interface ILessonPublic {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ITopic[];
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITopic {
    title: string;
    content?: string;
}