import { validators } from "../../util/validators.ts";

export interface ISectionContentRequest {
    section_id?: number;
    title?: string;
    proficiency?: string;
    max_tokens?: number;
    temperature?: number;
    session_key?: string;
}

export class SectionContentRequest implements ISectionContentRequest {
    section_id?: number;
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
        validators.validateProficiency(this.proficiency);
        validators.validateMaxTokens(this.max_tokens);
        validators.validateTemperature(this.temperature);
        validators.validateSessionKey(this.session_key)
    }
}