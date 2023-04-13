export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string;
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}