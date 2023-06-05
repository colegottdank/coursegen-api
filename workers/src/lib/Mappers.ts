import { ICourseItem, ICourseOutlineResponse } from "../dtos/CourseOutlineResponse";
import { CourseItemType, InternalCourse, InternalCourseItem } from "./InternalModels";
import { PublicCourse, PublicCourseItem } from "./PublicModels";
import { v4 as uuidv4 } from "uuid";

export function mapInternalToPublicCourse(internalCourse: InternalCourse): PublicCourse {
  const publicCourse: PublicCourse = {
    id: internalCourse.id,
    title: internalCourse.title,
    description: internalCourse.description,
    dates: internalCourse.dates,
    user_id: internalCourse.user_id,
    items: internalCourse.items.map(mapInternalToPublicCourseItem),
  };

  return publicCourse;
}

function mapInternalToPublicCourseItem(internalItem: InternalCourseItem): PublicCourseItem {
  const publicItem: PublicCourseItem = {
    id: internalItem.id,
    parent_id: internalItem.parent_id,
    title: internalItem.title,
    description: internalItem.description ?? "",
    dates: internalItem.dates,
    order_index: internalItem.order_index,
    type: internalItem.type,
    items: internalItem.items?.map(mapInternalToPublicCourseItem),
  };

  return publicItem;
}

export function mapExternalCourseOutlineResponseToInternal(courseOutlineResponse: ICourseOutlineResponse): InternalCourse {
  const externalCourse = courseOutlineResponse.data.course;
  const internalCourse: InternalCourse = {
      title: externalCourse.title,
      description: externalCourse.description,
      dates: externalCourse.dates,
      items: mapExternalCourseItemsToInternal(courseOutlineResponse.data.course.items),
  };
  return internalCourse;
};

function mapExternalCourseItemsToInternal(externalCourseItems: ICourseItem[]): InternalCourseItem[] {
  const internalCourseItems: InternalCourseItem[] = [];

  let orderIndex = 1;
  for (const externalCourseItem of externalCourseItems) {
      const internalCourseItem: InternalCourseItem = {
          title: externalCourseItem.title,
          description: externalCourseItem.description,
          dates: externalCourseItem.dates,
          type: externalCourseItem.type === 'module' ? CourseItemType.Module : CourseItemType.Lesson,
          order_index: orderIndex
      };

      if (externalCourseItem.type === 'module' && externalCourseItem.items) {
        internalCourseItem.items = mapExternalCourseItemsToInternal(externalCourseItem.items);
      }

      internalCourseItems.push(internalCourseItem);
      orderIndex++;
  }

  return internalCourseItems;
}

export function mapExternalTopicsToInternalTopics(response: ILessonContentResponse, request: ILessonContentRequest, userId: string): InternalTopic[] {
  return response.data.topics.map((topic, index) => {
    return {
      id: uuidv4(),
      title: topic.topic,
      content: topic.content,
      order_index: index+1,
      lesson_id: request.lesson_id!,
      user_id: userId,
      course_id: request.course_id!
    };
  });
}