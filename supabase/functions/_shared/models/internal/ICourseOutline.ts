import { ICourse } from './ICourse.ts';
import { ISection } from './ISection.ts';

export interface ICourseOutline {
    Course: ICourse;
    Sections: ISection[];
 }