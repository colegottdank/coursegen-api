export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string | null;
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}