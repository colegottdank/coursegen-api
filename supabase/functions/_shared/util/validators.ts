import { BadRequestError } from "../consts/errors/BadRequestError.ts";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

export function validateSubject(subject: string | undefined): void {
  if (!subject || subject.length > 200) {
    throw new BadRequestError("Subject must be not null and less than 200 characters");
  }
}

export function validateProficiency(proficiency: string | undefined): void {
  if (proficiency && proficiency.length > 50) {
    throw new BadRequestError("Proficiency must be less than 50 characters");
  }
}

export function validateSectionCount(section_count: number | undefined): void {
  if (section_count && (section_count < 2 || section_count > 15)) {
    throw new BadRequestError("Section count must be between 2 and 15");
  }
}

// Calculate tokens in prompts
// TODO: https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
// const encoded = encodeString(newUserMessage);
// const maxTokenCount = (4096 - encoded.bpe.length) - 150 // 150 is for the subject, proficiency, and section_count. No tokenizer works for cl100k_base yet in JS
export function validateMaxTokens(max_tokens: number | undefined): void {
  if (max_tokens && (max_tokens < 1000 || max_tokens > 3600)) {
    throw new BadRequestError(`Max tokens must be between 1000 and 3600`);
  }
}

export function validateTemperature(temperature: number | undefined): void {
  if (temperature && (temperature < 0 || temperature > 1)) {
    throw new BadRequestError("Temperature must be between 0 and 1");
  }
}

export function validateSectionId(sectionId: number | undefined): void {
  if (!sectionId || sectionId < 1) {
    throw new BadRequestError("Section ID must be greater than 0");
  }
}

export function validateSessionKey(sessionKey: string | undefined): void {
  // validate session is a valid uuid
  if(!uuidValidate(sessionKey)) {
    console.log("SessionKey must be a valid UUID");
    throw new BadRequestError("SessionKey must be a valid UUID");
  }
}

// Export all validators in a single object
export const validators = {
  validateSubject,
  validateProficiency,
  validateSectionCount,
  validateMaxTokens,
  validateTemperature,
  validateSectionId,
  validateSessionKey
};
