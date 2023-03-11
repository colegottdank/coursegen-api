export interface CourseSection {
  name: string;
  description: string;
}

export interface Course {
  name: string;
  sections: CourseSection[];
}

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