import { OpenAIInvalidResponseError } from "../../consts/errors/Errors.ts";

export interface ICourseOutlineResponseV2 {
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
  items: ICourseItem[];
}

export interface ICourseItem {
  type: string;
  title: string;
  description: string;
  dates?: string;
  items?: ICourseItem[];
}

export class CourseOutlineResponseV2 {
  response: ICourseOutlineResponseV2;

  constructor(json: string) {
    try {
      this.response = JSON.parse(json);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Handle the extra closing bracket issue
        const fixedJson = json.slice(0, -1);
        this.response = JSON.parse(fixedJson);
      } else {
        // Re-throw the error if it's not a SyntaxError
        throw error;
      }
    }
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

    const content = this.response.data.course.items;
    if (content == null || content.length == 0) {
      throw new OpenAIInvalidResponseError("Assistant course must have at least one item");
    }

    if(content.length < 2 || content.length > 15) {
      throw new OpenAIInvalidResponseError("Assistant course must have between 2 and 15 items");
    }

    const validateContent = (contentItem: ICourseItem) => {
      if (!contentItem.title || contentItem.title.length > 200) {
        throw new OpenAIInvalidResponseError("Assistant content title must not be null and less than 200 characters");
      }
      if (!contentItem.description) {
        throw new OpenAIInvalidResponseError("Assistant content description must not be null");
      }
      if (contentItem.description.length > 300) {
        throw new OpenAIInvalidResponseError("Assistant content description must be less than 300 characters");
      }
      if (contentItem.dates != null && contentItem.dates.length > 50) {
        throw new OpenAIInvalidResponseError("Assistant content dates must be less than 50 characters");
      }
      if (contentItem.type === 'module' && contentItem.items) {
        contentItem.items.forEach(validateContent);
      }
    };

    content.forEach(validateContent);
  }
}
