import { OpenAIInvalidResponseError } from "../../consts/errors/OpenAIInvalidResponseError.ts";

export interface ISectionContentResponse {
  success: boolean;
  data: {
    content: string;
  };
  error: {
    code: number;
    message: string;
  };
}

export class SectionContentResponse {
  response: ISectionContentResponse;

  constructor(json: string) {
    this.response = JSON.parse(json);
  }

  validate(): void {
    if (!this.response.success) {
      throw new OpenAIInvalidResponseError(`${this.response.error?.message}`);
    }

    const content = this.response.data.content;
    if (!content) {
      throw new OpenAIInvalidResponseError("Content must not be null");
    }
  }
}
