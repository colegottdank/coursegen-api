import { BadRequestError } from "../../errors/BadRequestError.ts";

export interface AssistantResponse {
    success: boolean;
    data: {
      course: Course;
    };
    error: {
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
  
export function ValidateAssistantResponse(assistantResponse: AssistantResponse, sectionCount: number): void {
    if (assistantResponse.success === false) {
        throw new BadRequestError(`${assistantResponse.error.message}`);
    }

    const course = assistantResponse.data.course;
    if (!course.name || course.name.length > 100) {
      throw new BadRequestError("Course name must not be null and less than 100 characters");
    }
    if (course.sections.length !== sectionCount) {
      throw new BadRequestError(
        `Number of course sections must match requested section count (${sectionCount})`
      );
    }
    course.sections.forEach((section) => {
      if (!section.name || section.name.length > 100) {
        throw new BadRequestError("Section name must not be null and less than 100 characters");
      }
      if (!section.description) {
        throw new BadRequestError("Section description must not be null");
      }
      if (section.description.length > 300) {
        throw new BadRequestError("Section description must be less than 300 characters");
      }
      if (section.date && isNaN(Date.parse(section.date))) {
        throw new BadRequestError("Section date must be a valid date");
      }
    });
}