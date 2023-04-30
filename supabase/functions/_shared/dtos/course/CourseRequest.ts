import * as validators from "../../util/validators.ts";

export interface ICourseRequest { 
  search_text?: string;
  subject?: string;
  module_count?: number;
  max_tokens?: number;
  temperature?: number;
}

export class CourseRequest implements ICourseRequest {
  search_text?: string;
  subject?: string;
  module_count?: number;
  max_tokens?: number;
  temperature?: number;

  constructor(requestJson: string) {
    Object.assign(this, requestJson);
  }

  Validate(): void {
    if(this.subject == null){
      validators.validateSubject(this.search_text);
    }
    else{
      validators.validateSubject(this.subject);
    }

    validators.validateModuleCount(this.module_count);
    validators.validateMaxTokens(this.max_tokens);
    validators.validateTemperature(this.temperature);
  }
}

