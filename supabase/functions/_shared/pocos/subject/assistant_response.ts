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
        throw new Error(`${assistantResponse.error.code} ${assistantResponse.error.message}`);
    }

    const course = assistantResponse.data.course;
    if (!course.name || course.name.length > 50) {
      throw new Error("Course name must not be null and less than 50 characters");
    }
    if (course.sections.length !== sectionCount) {
      throw new Error(
        `Number of course sections must match requested section count (${sectionCount})`
      );
    }
    course.sections.forEach((section) => {
      if (!section.name || section.name.length > 50) {
        throw new Error("Section name must not be null and less than 50 characters");
      }
      if (!section.description) {
        throw new Error("Section description must not be null");
      }
      if (section.description.length > 200) {
        throw new Error("Section description must be less than 200 characters");
      }
      if (section.date && isNaN(Date.parse(section.date))) {
        throw new Error("Section date must be a valid date");
      }
    });
}