import { ICoursePublic } from "./ICoursePublic.ts";
import { ILessonPublic } from "./ILessonPublic.ts";

export interface ICourseOutlinePublic {
   Course: ICoursePublic;
   Sections: ILessonPublic[];
}