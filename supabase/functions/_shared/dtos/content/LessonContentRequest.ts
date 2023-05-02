import * as validators from "../../util/validators.ts";

export interface ILessonContentRequest {
    lesson_id?: string;
    course_id?: string;
    topic_count?: number;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;
}

export class LessonContentRequest implements ILessonContentRequest {
    lesson_id?: string;
    course_id?: string;
    topic_count?: number;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;

    constructor(requestJson: string) {
        Object.assign(this, requestJson);
    }

    Validate(): void {
        validators.notNullAndValidUUID(this.lesson_id, "lesson_id");
        validators.notNullAndValidUUID(this.course_id, "course_id");
        validators.validateProficiency(this.proficiency);
        validators.validateMaxTokens(this.max_tokens);
        validators.validateTemperature(this.temperature);
        validators.validateSessionKey(this.session_key)
    }
}