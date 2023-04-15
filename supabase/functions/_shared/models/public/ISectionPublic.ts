export interface ISectionPublic {
    id?: number;
    title: string;
    description: string;
    dates?: string;
    content?: ISectionContentPublic[];
    subsections?: ISectionPublic[];
    path: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISectionContentPublic {
    header: string;
    text: string;
}