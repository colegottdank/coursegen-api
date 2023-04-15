import { ICoursePublic } from "./ICoursePublic.ts";
import { ISectionPublic } from "./ISectionPublic.ts";

export interface ICourseOutlinePublic {
   Course: ICoursePublic;
   Sections: ISectionPublic[];
}