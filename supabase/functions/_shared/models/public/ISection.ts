export interface ISection {
    id?: number;
    name: string;
    description: string;
    content?: string | null;
    sectionOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}