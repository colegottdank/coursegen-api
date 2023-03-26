import { BaseError } from "./BaseError.ts";

export class SupabaseError extends BaseError {  
    constructor(code: string, message: string) {
      super(code, message);
    }
  }