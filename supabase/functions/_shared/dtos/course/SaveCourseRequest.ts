import * as validators from "../../util/validators.ts";

export interface ISaveCourseRequest {
    course_id?: string;
}

export class SaveCourseRequest implements ISaveCourseRequest {
    course_id?: string;

    constructor(requestJson: string) {
        Object.assign(this, requestJson);
    }

    Validate(): void {
        validators.notNullAndValidUUID(this.course_id, "course_id");
    }
}