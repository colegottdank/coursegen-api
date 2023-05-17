import { OpenAIInvalidResponseError } from "../../consts/Errors.ts";
import { IOpenAIResponse } from "./IOpenAIResponse.ts";

export interface ITitleResponse {
  s: boolean;
  d: {
    ti: ITitle;
  };
  e: {
    c: number;
    m: string;
  };
}

export interface ITitle {
  t: string;
  i: ITitleItem[];
}

export interface ITitleItem {
  ty: string;
  t: string;
  i?: ITitleItem[];
}

export class TitleResponse implements IOpenAIResponse {
  response: ITitleResponse;

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
    if (!this.response.s) {
      throw new OpenAIInvalidResponseError(`${this.response.e?.m}`);
    }
  }
}
