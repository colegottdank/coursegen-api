import { AssistantResponse } from "./assistant_response.ts";

export interface SubjectResponse {
    course?: Course;
    error?: {
      code: number;
      message: string;
    };
}

export interface CourseSection {
    name: string;
    description: string;
    date?: string;
}

export interface Course {
    name: string;
    sections: CourseSection[];
}

export function MapAssistantResponseToSubjectResponse(response: AssistantResponse): SubjectResponse {
    return { course: response.data.course };
}