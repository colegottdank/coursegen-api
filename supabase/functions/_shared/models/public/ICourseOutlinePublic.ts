import { ICoursePublic } from "./ICoursePublic.ts";
import { ILessonPublic } from "./ISectionPublic.ts";

export interface ICourseOutlinePublic {
   Course: ICoursePublic;
   Sections: ILessonPublic[];
}