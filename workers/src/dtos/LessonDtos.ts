import { BadRequestError } from "../consts/Errors";
import * as validators from "../lib/Validators";

export interface ILessonContentPost {
    lesson_id?: string;
    course_id?: string;
    topic_count?: number;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;
    gpt_model?: string;
}

export class LessonContentPost implements ILessonContentPost {
    lesson_id?: string;
    course_id?: string;
    topic_count?: number;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;
    gpt_model?: string;

    constructor(requestJson: string) {
        try{
            Object.assign(this, requestJson);
          } catch(error)
          {
            throw new BadRequestError("Invalid request body.");
          }
    }

    Validate(): void {
        validators.notNullAndValidUUID(this.lesson_id, "lesson_id");
        validators.notNullAndValidUUID(this.course_id, "course_id");
        validators.validateProficiency(this.proficiency);
        validators.validateMaxTokens(this.max_tokens);
        validators.validateTemperature(this.temperature);
        validators.validateSessionKey(this.session_key)
        validators.validateGPTModel(this.gpt_model);
    }
}