import * as prompts from "../../prompts.ts";
import { BadRequestError } from "../../errors/BadRequestError.ts";

export interface SubjectRequest {
  subject: string;
  proficiency?: string;
  section_count?: number;
  max_tokens?: number;
  temperature?: number;
}

export const defaultSectionCount = 3;
export const defaultProficiency = "Beginner";
export const defaultMaxTokens = 1000;
export const defaultTemperature = 0.25;

export function ValidateCourseRequest(request: SubjectRequest, newUserMessage: string): void {
  if (!request.subject || request.subject.length > 50) {
    throw new BadRequestError("Subject must be not null and less than 50 characters");
  }
  if (request.proficiency && request.proficiency.length > 50) {
    throw new BadRequestError("Proficiency must be less than 50 characters");
  }
  if (request.section_count && (request.section_count < 2 || request.section_count > 15)) {
    throw new BadRequestError("Section count must be between 2 and 15");
  }

  // Calculate tokens in prompts
  // TODO: https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  if (request.max_tokens && (request.max_tokens < 1000 || request.max_tokens > 3500)) {
    throw new BadRequestError(`Max tokens must be between 1000 and 3500`);
  }
  if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
    throw new BadRequestError("Temperature must be between 0 and 1");
  }
}