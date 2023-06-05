import { OpenAIInvalidResponseError } from "../consts/Errors.js";
import { IOpenAIResponse } from "./IOpenAIResponse";

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
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        // Handle the extra closing bracket issue
        const fixedJson = json.slice(0, -1);
        this.response = JSON.parse(fixedJson);
      } else {
        // Re-throw the error if it's not a SyntaxError
        throw new OpenAIInvalidResponseError(error.message + error.stack);
      }
    }
  }

  validate(): void {
    if (!this.response.success) {
      throw new OpenAIInvalidResponseError(`${this.response.error?.message}`);
    }
  }
}