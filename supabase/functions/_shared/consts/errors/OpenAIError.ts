import { BaseError } from "./BaseError.ts";

export class OpenAIError extends BaseError {  
    constructor(code: string, message: string) {
      super(code, message);
    }
  }