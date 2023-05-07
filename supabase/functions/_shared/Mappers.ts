import { ICourseItem, ICourseOutlineResponseV2 } from "./dtos/course/CourseOutlineResponseV2.ts";
import { CourseItemType, InternalCourse, InternalCourseItem, InternalCourseItemClosure, InternalTopic } from "./InternalModels.ts";
import { PublicCourse, PublicCourseItem, PublicTopic } from "./PublicModels.ts";
import { v4 as uuidv4} from "uuid";

export function mapInternalCourseItemToPublicCourseItem(internalCourseItem: InternalCourseItem): PublicCourseItem {
  const publicCourseItem: PublicCourseItem = {
    id: internalCourseItem.id,
    parent_id: internalCourseItem.parent_id,
    course_id: internalCourseItem.course_id,
    title: internalCourseItem.title,
    description: internalCourseItem.description,
    dates: internalCourseItem.dates,
    order_index: internalCourseItem.order_index,
    type: internalCourseItem.type,
    user_id: internalCourseItem.user_id,
  };

  if (internalCourseItem.topics) {
    publicCourseItem.topics = internalCourseItem.topics.map((topic) => {
      const publicTopic: PublicTopic = {
        id: topic.id,
        title: topic.title,
        content: topic.content,
        order_index: topic.order_index
      };
      return publicTopic;
    });
  }

  return publicCourseItem;
}

export function mapInternalTopicsToPublicTopics(internalTopics: InternalTopic[]): PublicTopic[] {
  return internalTopics.map((internalTopic) => {
    const publicTopic: PublicTopic = {
      id: internalTopic.id,
      title: internalTopic.title,
      content: internalTopic.content,
      order_index: internalTopic.order_index
    };
    return publicTopic;
  });
}

export function mapTopicsToInternalTopics(
  topics: string[],
  lessonId: string,
  userId: string,
  courseId: string,
  content?: string[]
): InternalTopic[] {
  return topics.map((topic, index) => {
    return {
      id: uuidv4(),
      title: topic,
      lesson_id: lessonId,
      user_id: userId,
      course_id: courseId,
      order_index: index + 1
    };
  });
}

export function mapContentToInternalTopics(
  internalTopics: InternalTopic[],
  content: string[]
): void {
  internalTopics.map((internalTopic, index) => {
      internalTopic.content = content.find((_, contentIndex) => contentIndex === index)
  });
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
    type: CourseItemType;
    items?: any[];
    topics?: any[];
  } = {
    title: courseItem.title,
    description: courseItem.description,
    type: courseItem.type,
  };

  if (courseItem.type === CourseItemType.Module && courseItem.items) {
    gptCourseItem.items = courseItem.items.map(mapCourseItemForGPT);
  }

  if (courseItem.type === CourseItemType.Lesson && courseItem.topics) {
    gptCourseItem.topics = mapTopicsForGPT(courseItem.topics);
  }

  return gptCourseItem;
}

function mapTopicsForGPT(topics: InternalTopic[]): any[] {
  return topics.map((topic) => {
    return {
      title: topic.title
    };
  });
}

export function mapCourseDaoToInternalCourse(courseData: any): InternalCourse {
  const internalCourse: InternalCourse = {
    id: courseData.id,
    title: courseData.title,
    description: courseData.description,
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

export function mapCourseItemClosureDaoToInternalCourseItemClosure(courseItemClosureData: any): InternalCourseItemClosure {
  const internalCourseItemClosure: InternalCourseItemClosure = {
    ancestor_id: courseItemClosureData.ancestor_id,
    descendant_id: courseItemClosureData.descendant_id,
    depth: courseItemClosureData.depth,
    course_id: courseItemClosureData.course_id,
  };

  return internalCourseItemClosure;
}

export function buildCourseOutline(course: InternalCourse, courseItems: InternalCourseItem[], courseItemClosures: InternalCourseItemClosure[]): InternalCourse {
  // Create a map of course items for easy lookup
  const courseItemsMap = new Map<string, InternalCourseItem>();
  courseItems.forEach((item) => {
    courseItemsMap.set(item.id!, item);
  });

  // Filter out only the top-level course items (i.e., those with no parent)
  const topLevelCourseItems = courseItems.filter((item) => !item.parent_id);

  // Recursive function to build the nested structure
  function buildNestedCourseItems(courseItem: InternalCourseItem) {
    if (courseItem.type === CourseItemType.Module) {
      // Use nullish coalescing operator to ensure an empty array is used when courseItem.items is undefined
      courseItem.items = courseItem.items ?? [];
  
      courseItemClosures
        .filter((closure) => closure.ancestor_id === courseItem.id && closure.depth === 1)
        .forEach((closure) => {
          const childItem = courseItemsMap.get(closure.descendant_id);
          if (childItem) {
            buildNestedCourseItems(childItem);
            courseItem.items!.push(childItem);
          }
        });
  
      // Sort the nested items by their order_index
      courseItem.items.sort((a, b) => a.order_index - b.order_index);
    }
  }

  // Build the nested structure for each top-level course item
  topLevelCourseItems.forEach(buildNestedCourseItems);

  // Sort the top-level course items by their order_index
  topLevelCourseItems.sort((a, b) => a.order_index - b.order_index);

  // Assign the top-level course items to the course
  course.items = topLevelCourseItems;

  return course;
}


export function mapExternalCourseOutlineResponseToInternal(courseOutlineResponse: ICourseOutlineResponseV2): InternalCourse {
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
      description: internalItem.description,
      dates: internalItem.dates,
      order_index: internalItem.order_index,
      type: internalItem.type,
      items: internalItem.items?.map(mapInternalToPublicCourseItem),
    };
  
    return publicItem;
  }
