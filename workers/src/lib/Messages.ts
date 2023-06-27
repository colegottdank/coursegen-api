import { InternalCourse } from "./InternalModels";

export interface LessonContentCreateMessage {
    course_id: string;
    course: InternalCourse;
    user_id: string;
    search_text: string;
};

export interface CreateCourseOutlineMessage {
    course_id: string;
    user_id: string;
    search_text: string;
};