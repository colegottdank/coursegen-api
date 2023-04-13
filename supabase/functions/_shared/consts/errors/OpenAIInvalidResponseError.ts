import { BaseError } from "./BaseError.ts";

export class OpenAIInvalidResponseError extends BaseError {  
    constructor(message: string) {
      super("422", message);
    }
  }