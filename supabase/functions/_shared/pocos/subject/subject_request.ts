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
  // const encoded = encodeString(newUserMessage);
  // const maxTokenCount = (4096 - encoded.bpe.length) - 150 // 150 is for the subject, proficiency, and section_count. No tokenizer works for cl100k_base yet in JS
  if (request.max_tokens && (request.max_tokens < 1000 || request.max_tokens > 3600)) {
    throw new BadRequestError(`Max tokens must be between 1000 and 3600`);
  }
  if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
    throw new BadRequestError("Temperature must be between 0 and 1");
  }
}

// Temporarily just encode the prompts
// function encodeString(newUserMessage: string): { bpe: number[]; text: string[] } {
//   const tokenizer = GPT3Tokenizer({ type: 'gpt3' });
//   const allPrompts = `${prompts.system1} ${prompts.user1} ${prompts.assistant1} ${prompts.user1error} ${prompts.assistant1error}`;
//   return tokenizer.encode(allPrompts);
// }