import { OpenAIInvalidResponseError } from "../../consts/Errors.ts";

export interface ITopicsResponse {
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
  title: string;
  text: string;
}

export class TopicsResponse {
  response: ITopicsResponse;

  constructor(json: string) {
    this.response = JSON.parse(json);
  }

  validate(): void {
    if (!this.response.success) {
      throw new OpenAIInvalidResponseError(`${this.response.error?.message}`);
    }

    const topics = this.response.data.topics;
    if (!topics) {
      throw new OpenAIInvalidResponseError("Content must not be null");
    }


    topics.forEach((topic) => {
      if(!topic.title) {
        throw new OpenAIInvalidResponseError("Topic title must not be null")
      }

      if(!topic.text) {
        throw new OpenAIInvalidResponseError("Topic text must not be null")
      }
    });
  }
}
