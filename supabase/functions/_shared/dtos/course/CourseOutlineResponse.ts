import { OpenAIInvalidResponseError } from "../../consts/errors/OpenAIInvalidResponseError.ts";

export interface ICourseOutlineResponse {
  success: boolean;
  data: {
    course: ICourse;
  };
  error: {
    code: number;
    message: string;
  };
}

export interface ICourse {
  title: string;
  description: string;
  dates?: string;
  sections: ICourseSection[];
}

export interface ICourseSection {
  title: string;
  description: string;
  dates?: string;
}

export class CourseOutlineResponse {
  response: ICourseOutlineResponse;

  constructor(json: string) {
    this.response = JSON.parse(json);
  }

  validate(sectionCount: number): void {
    if (!this.response.success) {
      throw new OpenAIInvalidResponseError(`${this.response.error?.message}`);
    }

    const course = this.response.data.course;
    if (!course.title || course.title.length > 100) {
      throw new OpenAIInvalidResponseError("Course name must not be null and less than 100 characters");
    }
    if (course.sections.length !== sectionCount) {
      throw new OpenAIInvalidResponseError(`Number of course sections must match requested section count (${sectionCount})`);
    }
    if (course.description.length > 300) {
      throw new OpenAIInvalidResponseError("Course description must be less than 300 characters");
    }
    if (course.dates != null && course.dates.length > 50) {
      throw new OpenAIInvalidResponseError("Course dates must be less than 50 characters");
    }
    course.sections.forEach((section) => {
      if (!section.title || section.title.length > 100) {
        throw new OpenAIInvalidResponseError("Section name must not be null and less than 100 characters");
      }
      if (!section.description) {
        throw new OpenAIInvalidResponseError("Section description must not be null");
      }
      if (section.description.length > 300) {
        throw new OpenAIInvalidResponseError("Section description must be less than 300 characters");
      }
      if (section.dates != null && section.dates.length > 50) {
        throw new OpenAIInvalidResponseError("Section dates must be less than 50 characters");
      }
    });
  }
}
