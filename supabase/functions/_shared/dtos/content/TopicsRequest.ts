import * as validators from "../../util/validators.ts";

export interface ITopicsRequest {
    section_id?: number;
    course_id?: string;
    title?: string;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;
}

export class TopicsRequest implements ITopicsRequest {
    section_id?: number;
    course_id?: string;
    title?: string;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;

    constructor(requestJson: string) {
        Object.assign(this, requestJson);
    }

    Validate(): void {
        validators.validateSectionId(this.section_id);
        validators.notNullAndValidUUID(this.course_id, "course_id");
        validators.validateProficiency(this.proficiency);
        validators.validateMaxTokens(this.max_tokens);
        validators.validateTemperature(this.temperature);
        validators.validateSessionKey(this.session_key)
    }
}