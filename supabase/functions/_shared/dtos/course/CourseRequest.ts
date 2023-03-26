import { validators } from "../../util/validators.ts";

export interface ICourseRequest { 
  subject?: string;
  proficiency?: string;
  section_count?: number;
  max_tokens?: number;
  temperature?: number;
}

export class CourseRequest implements ICourseRequest {
  subject?: string;
  proficiency?: string;
  section_count?: number;
  max_tokens?: number;
  temperature?: number;

  constructor(requestJson: string) {
    Object.assign(this, requestJson);
  }

  Validate(): void {
    validators.validateSubject(this.subject);
    validators.validateProficiency(this.proficiency);
    validators.validateSectionCount(this.section_count);
    validators.validateMaxTokens(this.max_tokens);
    validators.validateTemperature(this.temperature);
  }
}

