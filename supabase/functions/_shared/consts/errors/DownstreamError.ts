import { BaseError } from "./BaseError.ts";

export class DownstreamError extends BaseError {  
    constructor(message: string) {
      super("503", message);
    }
  }