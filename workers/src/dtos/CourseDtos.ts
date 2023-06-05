import { BadRequestError } from "../consts/Errors";
import * as validators from "../lib/Validators";

export interface ICourseRequestPost { 
  search_text?: string;
//   module_count?: number;
//   max_tokens?: number;
//   temperature?: number;
  gpt_model?: string;
}

export class CourseRequestPost implements ICourseRequestPost {
  search_text?: string;
//   module_count?: number;
//   max_tokens?: number;
//   temperature?: number;
  gpt_model?: string;

  constructor(requestJson: string | undefined) {
    if(!requestJson) throw new BadRequestError("Request body must exist for CourseRequestPost.");

    try {
      Object.assign(this, requestJson);
    } catch(error) {
      throw new BadRequestError("Invalid request body format for CourseRequestPost.");
    }
  }

  Validate(): void {
    validators.validateSearchText(this.search_text);
    // validators.validateModuleCount(this.module_count);
    // validators.validateMaxTokens(this.max_tokens);
    // validators.validateTemperature(this.temperature);
    validators.validateGPTModel(this.gpt_model);
  }
}

