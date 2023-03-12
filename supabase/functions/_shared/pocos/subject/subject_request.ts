import * as prompts from "../../prompts.ts";
import GPT3Tokenizer from "tokenizer";

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
    throw new Error("Subject must be not null and less than 50 characters");
  }
  if (request.proficiency && request.proficiency.length > 50) {
    throw new Error("Proficiency must be less than 50 characters");
  }
  if (request.section_count && (request.section_count < 2 || request.section_count > 15)) {
    throw new Error("Section count must be between 2 and 15");
  }

  // Calculate tokens in prompts
  var encoded = encodeString(newUserMessage);
  var maxTokenCount = (4096 - encoded.text.length-100) // Subtract 100 because I can't figure out how to get the exact number of tokens in the prompts
  if (request.max_tokens && (request.max_tokens < 1000 || request.max_tokens > maxTokenCount)) {
    throw new Error(`Max tokens must be between 1000 and ${maxTokenCount}`);
  }
  if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
    throw new Error("Temperature must be between 0 and 1");
  }
}

function encodeString(newUserMessage: string): { bpe: number[]; text: string[] } {
  const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
  const allPrompts = `${prompts.system1}${prompts.user1}${prompts.assistant1}${prompts.user1error}${prompts.assistant1error}${newUserMessage}`;
  return tokenizer.encode(allPrompts);
}