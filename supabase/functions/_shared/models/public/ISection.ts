export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: string | null;
    sectionOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}