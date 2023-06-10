import { ICourseItem, ICourseOutlineResponse, ILessonContentResponse } from "../clients/OpenAIResponses";
import { InvalidGenerationReferenceTypeError, InvalidGenerationStatusError } from "../consts/Errors";
import { Database } from "../consts/database.types";
import { ILessonContentPost } from "../dtos/TopicDto";
import { InternalGenerationReferenceType, InternalGenerationStatus } from "./InternalModels";
import {
  InternalCourseItemType,
  InternalGenerationLog,
  InternalCourse,
  InternalCourseItem,
  InternalTopic,
} from "./InternalModels";
import {
  PublicCourse,
  PublicCourseItem,
  PublicGenerationReferenceType,
  PublicGenerationStatus,
  PublicTopic,
} from "./PublicModels";
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

export function mapExternalCourseOutlineResponseToInternal(
  courseOutlineResponse: ICourseOutlineResponse
): InternalCourse {
  const externalCourse = courseOutlineResponse.data.course;
  const internalCourse: InternalCourse = {
    title: externalCourse.title,
    description: externalCourse.description,
    dates: externalCourse.dates,
    items: mapExternalCourseItemsToInternal(courseOutlineResponse.data.course.items),
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
      type: externalCourseItem.type === "module" ? InternalCourseItemType.Module : InternalCourseItemType.Lesson,
      order_index: orderIndex,
    };

    if (externalCourseItem.type === "module" && externalCourseItem.items) {
      internalCourseItem.items = mapExternalCourseItemsToInternal(externalCourseItem.items);
    }

    internalCourseItems.push(internalCourseItem);
    orderIndex++;
  }

  return internalCourseItems;
}

export function mapExternalTopicsToInternalTopics(
  response: ILessonContentResponse,
  request: ILessonContentPost,
  userId: string
): InternalTopic[] {
  return response.data.topics.map((topic, index) => {
    return {
      id: uuidv4(),
      title: topic.topic,
      content: topic.content,
      order_index: index + 1,
      lesson_id: request.lesson_id!,
      user_id: userId,
      course_id: request.course_id!,
    };
  });
}

export function mapCourseDaoToInternalCourse(courseData: any): InternalCourse {
  const internalCourse: InternalCourse = {
    id: courseData.id,
    title: courseData.title,
    description: courseData.description,
    search_text: courseData.search_text,
    dates: courseData.dates,
    user_id: courseData.user_id,
    created_at: courseData.created_at,
    updated_at: courseData.updated_at,
    items: [],
  };

  return internalCourse;
}

export function mapCourseItemDaoToInternalCourseItem(courseItemData: any): InternalCourseItem {
  const internalCourseItem: InternalCourseItem = {
    id: courseItemData.id,
    parent_id: courseItemData.parent_id,
    title: courseItemData.title,
    description: courseItemData.description,
    dates: courseItemData.dates,
    order_index: courseItemData.order_index,
    type: courseItemData.type,
    course_id: courseItemData.course_id,
    user_id: courseItemData.user_id,
  };

  return internalCourseItem;
}

export function buildCourseOutline(course: InternalCourse, courseItems: InternalCourseItem[]): InternalCourse {
  // Create a map of course items for easy lookup
  const courseItemsMap = new Map<string, InternalCourseItem>();
  courseItems.forEach((item) => {
    courseItemsMap.set(item.id!, item);
  });

  // Recursive function to build the nested structure
  function buildNestedCourseItems(courseItem: InternalCourseItem) {
    if (courseItem.type === InternalCourseItemType.Module) {
      courseItem.items = courseItem.items ?? [];

      // Find and nest the course items whose parent_id is the current courseItem.id
      courseItems
        .filter((item) => item.parent_id === courseItem.id)
        .forEach((childItem) => {
          buildNestedCourseItems(childItem);
          courseItem.items!.push(childItem);
        });

      // Sort the nested items by their order_index
      courseItem.items.sort((a, b) => a.order_index - b.order_index);
    }
  }

  // Filter out only the top-level course items (i.e., those with no parent)
  const topLevelCourseItems = courseItems.filter((item) => !item.parent_id);

  // Build the nested structure for each top-level course item
  topLevelCourseItems.forEach(buildNestedCourseItems);

  // Sort the top-level course items by their order_index
  topLevelCourseItems.sort((a, b) => a.order_index - b.order_index);

  // Assign the top-level course items to the course
  course.items = topLevelCourseItems;

  return course;
}

export function mapCourseForGPT(course: InternalCourse): any {
  const gptCourse = {
    title: course.title,
    description: course.description,
    items: course.items.map(mapCourseItemForGPT),
  };

  return gptCourse;
}

function mapCourseItemForGPT(courseItem: InternalCourseItem): any {
  const gptCourseItem: {
    title: string;
    description: string;
    type: InternalCourseItemType;
    items?: any[];
    topics?: any[];
  } = {
    title: courseItem.title,
    description: courseItem.description ?? "",
    type: courseItem.type,
  };

  if (courseItem.type === InternalCourseItemType.Module && courseItem.items) {
    gptCourseItem.items = courseItem.items.map(mapCourseItemForGPT);
  }

  if (courseItem.type === InternalCourseItemType.Lesson && courseItem.topics) {
    gptCourseItem.topics = mapTopicsForGPT(courseItem.topics);
  }

  return gptCourseItem;
}

function mapTopicsForGPT(topics: InternalTopic[]): any[] {
  return topics.map((topic) => {
    return {
      title: topic.title,
    };
  });
}

export function mapInternalTopicsToPublicTopics(internalTopics: InternalTopic[]): PublicTopic[] {
  return internalTopics.map((internalTopic) => {
    const publicTopic: PublicTopic = {
      id: internalTopic.id,
      title: internalTopic.title,
      content: internalTopic.content,
      order_index: internalTopic.order_index,
    };
    return publicTopic;
  });
}

export function ToInternalGenerationLogFromDbArray(
  generationLogs: Database["public"]["Tables"]["generation_log"]["Row"][]
): InternalGenerationLog[] {
  return generationLogs.map((generationLog) => {
    const internalGenerationLog: InternalGenerationLog = {
      id: generationLog.id,
      reference_name: generationLog.reference_name,
      reference_id: generationLog.reference_id,
      reference_type: parseToReferenceType(generationLog.reference_type),
      generation_status: parseToGenerationStatus(generationLog.generation_status),
      generator_user_id: generationLog.generator_user_id,
      owner_user_id: generationLog.owner_user_id,
      created_at: new Date(generationLog.created_at),
      updated_at: new Date(generationLog.updated_at),
    };

    return internalGenerationLog;
  });
}

export function ToInternalGenerationLogFromDb(
  generationLog: Database["public"]["Tables"]["generation_log"]["Row"]
): InternalGenerationLog {
  const internalGenerationLog: InternalGenerationLog = {
    id: generationLog.id,
    reference_name: generationLog.reference_name,
    reference_id: generationLog.reference_id,
    reference_type: parseToReferenceType(generationLog.reference_type),
    generation_status: parseToGenerationStatus(generationLog.generation_status),
    generator_user_id: generationLog.generator_user_id,
    owner_user_id: generationLog.owner_user_id,
    created_at: new Date(generationLog.created_at),
    updated_at: new Date(generationLog.updated_at),
  };

  return internalGenerationLog;
}

export function ToInternalGenerationLog(
  reference_name: string,
  reference_id: string,
  userId: string,
  reference_type: InternalGenerationReferenceType,
  generation_status: InternalGenerationStatus
): InternalGenerationLog {
  return {
    id: uuidv4(),
    reference_name: reference_name,
    reference_id: reference_id,
    reference_type: reference_type,
    generator_user_id: userId,
    owner_user_id: userId,
    generation_status: generation_status,
  };
}

function parseToReferenceType(value: string): InternalGenerationReferenceType {
  const normalizedValue = value.toLowerCase();

  for (const key in InternalGenerationReferenceType) {
    if (
      InternalGenerationReferenceType[key as keyof typeof InternalGenerationReferenceType].toLowerCase() ===
      normalizedValue
    ) {
      return InternalGenerationReferenceType[key as keyof typeof InternalGenerationReferenceType];
    }
  }

  throw new InvalidGenerationReferenceTypeError(value);
}

function parseToGenerationStatus(value: string): InternalGenerationStatus {
  const normalizedValue = value.toLowerCase();

  for (const key in InternalGenerationStatus) {
    if (InternalGenerationStatus[key as keyof typeof InternalGenerationStatus].toLowerCase() === normalizedValue) {
      return InternalGenerationStatus[key as keyof typeof InternalGenerationStatus];
    }
  }

  throw new InvalidGenerationStatusError(value);
}
