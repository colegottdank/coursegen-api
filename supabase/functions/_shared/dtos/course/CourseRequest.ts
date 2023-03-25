import { BadRequestError } from "../../consts/errors/BadRequestError.ts";

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
    if (!this.subject || this.subject.length > 200) {
      throw new BadRequestError("Subject must be not null and less than 200 characters");
    }
    if (this.proficiency && this.proficiency.length > 50) {
      throw new BadRequestError("Proficiency must be less than 50 characters");
    }
    if (this.section_count && (this.section_count < 2 || this.section_count > 15)) {
      throw new BadRequestError("Section count must be between 2 and 15");
    }

    // Calculate tokens in prompts
    // TODO: https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
    // const encoded = encodeString(newUserMessage);
    // const maxTokenCount = (4096 - encoded.bpe.length) - 150 // 150 is for the subject, proficiency, and section_count. No tokenizer works for cl100k_base yet in JS
    if (this.max_tokens && (this.max_tokens < 1000 || this.max_tokens > 3600)) {
      throw new BadRequestError(`Max tokens must be between 1000 and 3600`);
    }
    if (this.temperature && (this.temperature < 0 || this.temperature > 1)) {
      throw new BadRequestError("Temperature must be between 0 and 1");
    }
  }
}

