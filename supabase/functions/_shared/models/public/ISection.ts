export interface ISection {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ISectionContent[];
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISectionContent {
    header: string;
    text: string;
}