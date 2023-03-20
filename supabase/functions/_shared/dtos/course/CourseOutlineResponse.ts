import { BadRequestError } from "../../consts/errors/BadRequestError.ts";

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
  name: string;
  sections: ICourseSection[];
}

export interface ICourseSection {
  name: string;
  description: string;
  date?: string;
}

export class CourseOutlineResponse {
  response: ICourseOutlineResponse;

  constructor(json: string) {
    this.response = JSON.parse(json);
  }

  validate(sectionCount: number): void {
    if (!this.response.success) {
      throw new BadRequestError(`${this.response.error?.message}`);
    }

    const course = this.response.data.course;
    if (!course.name || course.name.length > 100) {
      throw new BadRequestError("Course name must not be null and less than 100 characters");
    }
    if (course.sections.length !== sectionCount) {
      throw new BadRequestError(`Number of course sections must match requested section count (${sectionCount})`);
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
}
