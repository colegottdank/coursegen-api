import { OpenAIInvalidResponseError } from "../../consts/Errors.ts";

export interface ITopicResponseAI {
  success: boolean;
  data: {
    topics: string[];
  };
  error: {
    code: number;
    message: string;
  };
}

export class TopicResponseAI {
  response: ITopicResponseAI;

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

    const topics = this.response.data.topics;

    if (!topics) {
        throw new OpenAIInvalidResponseError("Topics must not be null");
    }
  }
}
