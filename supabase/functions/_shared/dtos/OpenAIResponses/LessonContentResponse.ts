import { OpenAIInvalidResponseError } from "../../consts/Errors.ts";
import { IOpenAIResponse } from "./IOpenAIResponse.ts";

export interface ILessonContentResponse {
  success: boolean;
  data: {
    topics: ITopic[];
  };
  error: {
    code: number;
    message: string;
  };
}

export interface ITopic {
  topic: string;
  content: string;
}

export class LessonContentResponse implements IOpenAIResponse {
  response: ILessonContentResponse;

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
  }
}