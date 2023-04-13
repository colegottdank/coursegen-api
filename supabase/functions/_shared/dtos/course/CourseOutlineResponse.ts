import { OpenAIInvalidResponseError } from "../../consts/errors/OpenAIInvalidResponseError.ts";

export interface ICourseOutlineResponse {
  success: boolean;
  data: {
    course: ICourse;
    sections: ICourseSection[];
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

  validate(): void {
    if (!this.response.success) {
      throw new OpenAIInvalidResponseError(`${this.response.error?.message}`);
    }

    const course = this.response.data.course;
    if (!course.title || course.title.length > 200) {
      throw new OpenAIInvalidResponseError("Assistant course title must not be null and less than 200 characters");
    }
    if (course.description.length > 300) {
      throw new OpenAIInvalidResponseError("Assistant course description must be less than 300 characters");
    }
    if (course.dates != null && course.dates.length > 50) {
      throw new OpenAIInvalidResponseError("Assistant course dates must be less than 50 characters");
    }
    
    const sections = this.response.data.sections;
    if(sections == null || sections.length == 0) {
      throw new OpenAIInvalidResponseError("Assistant course must have at least one section")
    }

    sections.forEach((section) => {
      if (!section.title || section.title.length > 200) {
        throw new OpenAIInvalidResponseError("Assistant section title must not be null and less than 200 characters");
      }
      if (!section.description) {
        throw new OpenAIInvalidResponseError("Assistant section description must not be null");
      }
      if (section.description.length > 300) {
        throw new OpenAIInvalidResponseError("Assistant section description must be less than 300 characters");
      }
      if (section.dates != null && section.dates.length > 50) {
        throw new OpenAIInvalidResponseError("Assistant section dates must be less than 50 characters");
      }
    });
  }
}
