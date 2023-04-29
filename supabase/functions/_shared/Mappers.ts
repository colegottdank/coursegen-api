import { ICourseItem, ICourseOutlineResponseV2 } from "./dtos/course/CourseOutlineResponseV2.ts";
import { CourseItemType, InternalCourse, InternalCourseItem } from "./InternalModels.ts";
import { PublicCourse, PublicCourseItem } from "./PublicModels.ts";

export function mapExternalCourseOutlineResponseToInternal(courseOutlineResponse: ICourseOutlineResponseV2): InternalCourse {
    const externalCourse = courseOutlineResponse.data.course;
    const internalCourse: InternalCourse = {
        title: externalCourse.title,
        description: externalCourse.description,
        dates: externalCourse.dates,
        items: mapExternalCourseItemsToInternal(courseOutlineResponse.data.items),
    };
    return internalCourse;
}
  
function mapExternalCourseItemsToInternal(externalCourseItems: ICourseItem[]): InternalCourseItem[] {
    const internalCourseItems: InternalCourseItem[] = [];

    let orderIndex = 1;
    for (const externalCourseItem of externalCourseItems) {
        const internalCourseItem: InternalCourseItem = {
            title: externalCourseItem.title,
            description: externalCourseItem.description,
            dates: externalCourseItem.dates,
            type: externalCourseItem.type === 'module' ? CourseItemType.Module : CourseItemType.Lesson,
            order_index: orderIndex,
            items: [],
        };

        if (externalCourseItem.items) {
            internalCourseItem.items = mapExternalCourseItemsToInternal(externalCourseItem.items);
        }

        internalCourseItems.push(internalCourseItem);
        orderIndex++;
    }

    return internalCourseItems;
}

export function mapInternalToPublicCourse(internalCourse: InternalCourse): PublicCourse {
    const publicCourse: PublicCourse = {
      id: internalCourse.id,
      title: internalCourse.title,
      description: internalCourse.description,
      dates: internalCourse.dates,
      userId: internalCourse.userId,
      createdAt: internalCourse.createdAt,
      updatedAt: internalCourse.updatedAt,
      items: internalCourse.items.map(mapInternalToPublicCourseItem),
    };
  
    return publicCourse;
  }
  
  function mapInternalToPublicCourseItem(internalItem: InternalCourseItem): PublicCourseItem {
    const publicItem: PublicCourseItem = {
      id: internalItem.id,
      title: internalItem.title,
      description: internalItem.description,
      dates: internalItem.dates,
      order_index: internalItem.order_index,
      type: internalItem.type,
      items: internalItem.items?.map(mapInternalToPublicCourseItem),
    };
  
    return publicItem;
  }
  
