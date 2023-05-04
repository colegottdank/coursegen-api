import { BadRequestError } from "../consts/errors/BadRequestError.ts";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import * as defaults from "../../_shared/consts/defaults.ts";

export function notNullAndValidUUID(uuid: string | undefined, paramName: string): void {
  if (!uuid) {
    throw new BadRequestError(`${paramName} must not be null`);
  }

  if (!uuidValidate(uuid)) {
    throw new BadRequestError(`${paramName} must be a valid UUID`);
  }
}

export function validateSearchText(subject: string | undefined): void {
  if (!subject || subject.length > 300) {
    throw new BadRequestError("Search text must be not null and less than 300 characters");
  }
}

export function validateProficiency(proficiency: string | undefined): void {
  if (proficiency && proficiency.length > 50) {
    throw new BadRequestError("Proficiency must be less than 50 characters");
  }
}

export function validateModuleCount(module_count: number | undefined): void {
  if (module_count && (module_count < 2 || module_count > 10)) {
    throw new BadRequestError("Module count must be between 2 and 10");
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
    throw new BadRequestError("SessionKey must be a valid UUID");
  }
}

export function validateGPTModel(gptModel: string | undefined): void {
  if (gptModel && gptModel != defaults.gpt35 && gptModel != defaults.gpt4) {
    throw new BadRequestError(`GPT Model must be ${defaults.gpt35} or ${defaults.gpt4} but was ${gptModel}`);
  }
}
