import * as validators from "../../util/validators.ts";

export interface ICourseRequest { 
  search_text?: string;
  module_count?: number;
  max_tokens?: number;
  temperature?: number;
  gpt_model?: string;
}

export class CourseRequest implements ICourseRequest {
  search_text?: string;
  module_count?: number;
  max_tokens?: number;
  temperature?: number;
  gpt_model?: string;

  constructor(requestJson: string) {
    Object.assign(this, requestJson);
  }

  Validate(): void {
    validators.validateSearchText(this.search_text);
    validators.validateModuleCount(this.module_count);
    validators.validateMaxTokens(this.max_tokens);
    validators.validateTemperature(this.temperature);
    validators.validateGPTModel(this.gpt_model);
  }
}

