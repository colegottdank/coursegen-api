import { ICourseOutline } from "./../models/internal/ICourseOutline.ts";
import { Configuration, OpenAIApi } from "openai";
import { ICourseRequest } from "../dtos/course/CourseRequest.ts";
import * as new_course_prompts from "../consts/prompts/new_course_prompts.ts";
import * as lesson_topics_prompts from "../consts/prompts/lesson_topics_prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultTemperature } from "../consts/defaults.ts";
import { CourseOutlineResponse } from "../dtos/course/CourseOutlineResponse.ts";
import { ISection } from "../models/internal/ISection.ts";
import { ITopicsRequest } from "../dtos/content/TopicsRequest.ts";
import { CourseOutlineResponseV2 } from "../dtos/course/CourseOutlineResponseV2.ts";
import { mapExternalCourseOutlineResponseToInternal } from "../Mappers.ts";
import { InternalCourse } from "../InternalModels.ts";
import { ILessonContentRequest } from "../dtos/content/LessonContentRequest.ts";
import { OpenAIError } from "../consts/errors/Errors.ts";

export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_APIKEY") });
    this.openai = new OpenAIApi(this.config);
  }

  async createCourseOutline(courseRequest: ICourseRequest): Promise<ICourseOutline> {
    // let model = "gpt-4";
    let model = "gpt-3.5-turbo";
    let messages;
    let user_message = courseRequest.search_text ?? courseRequest.subject;

    if (courseRequest.module_count != null) {
      user_message = `${user_message}. Section Count: ${courseRequest.module_count}`;
    }

    if (model === "gpt-4") {
      messages = [
        { role: "system", content: new_course_prompts.course_outline_system2 },
        { role: "user", content: user_message },
      ];
    } else if (model === "gpt-3.5-turbo") {
      messages = [{ role: "user", content: `${new_course_prompts.course_outline_system2}. Request: ${user_message} ` }];
    }

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: model,
        messages: messages,
        max_tokens: courseRequest.max_tokens ?? defaultMaxTokens,
        temperature: courseRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI`);
      }
    }

    console.log(completion.data.choices[0].message.content);

    if (!completion?.data?.choices[0]?.message?.content) {
      throw new OpenAIError("404", `Course outline not returned from OpenAI`);
    }

    const courseOutlineResponse = new CourseOutlineResponse(completion.data.choices[0].message.content);
    courseOutlineResponse.validate();

    const courseOutline: ICourseOutline = {
      Course: {
        title: courseOutlineResponse.response.data.course.title,
        description: courseOutlineResponse.response.data.course.description,
        dates: courseOutlineResponse.response.data.course.dates,
      },
      Sections: courseOutlineResponse.response.data.sections.map((section, index) => {
        const mappedSection: ISection = {
          title: section.title,
          description: section.description,
          dates: section.dates,
          path: (index + 1).toString().padStart(2, "0"),
        };
        return mappedSection;
      }),
    };

    return courseOutline;
  }

  async createCourseOutlineV2(courseRequest: ICourseRequest, model: string): Promise<InternalCourse> {
    let messages;
    let user_message = courseRequest.search_text ?? courseRequest.subject;

    if (courseRequest.module_count != null) {
      user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    }

    if (model === "gpt-4") {
      messages = [
        { role: "system", content: new_course_prompts.course_outline_v2 },
        { role: "user", content: user_message },
      ];
    } else if (model === "gpt-3.5-turbo") {
      messages = [{ role: "user", content: `${new_course_prompts.course_outline_v2}. Course Request Text: ${user_message} ` }];
    }

  let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: model,
        messages: messages,
        max_tokens: courseRequest.max_tokens ?? defaultMaxTokens,
        temperature: courseRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI`);
      }
    }

    if (!completion?.data?.choices[0]?.message?.content) {
      throw new OpenAIError("404", `Course outline not returned from OpenAI`);
    }

    const courseOutlineResponse = new CourseOutlineResponseV2(completion.data.choices[0].message.content);
    courseOutlineResponse.validate();

    const course = mapExternalCourseOutlineResponseToInternal(courseOutlineResponse.response);

    return course;
  }

  async generateTopicTitles(topicsRequest: ITopicsRequest, courseOutline: string, model: string): Promise<string[]> {
    let topicMessages: any[] = [];

    if (model === "gpt-4") {
      topicMessages = [
        {
          role: "system",
          content: lesson_topics_prompts.topic_request_2 + ". Existing course outline: " + courseOutline,
        },
        {
          role: "user",
          content: `Lesson to generate topics for: ${topicsRequest.title}
          }`,
        },
      ];
    } else if (model === "gpt-3.5-turbo") {
      topicMessages = [
        {
          role: "user",
          content:
            lesson_topics_prompts.topic_request_2 +
            ". Existing course outline: " +
            courseOutline +
            `. Lesson to generate topics for: ${topicsRequest.title}. Proficiency: ${
              topicsRequest.proficiency ?? defaultProficiency
            }, }`,
        },
      ];
    }

    console.log(topicMessages[0].content);
    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: model,
        messages: topicMessages,
        max_tokens: topicsRequest.max_tokens ?? defaultMaxTokens,
        temperature: topicsRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve topics from OpenAI. ${error.response.data.error.message}`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve topics from OpenAI`);
      }
    }

    const topicJson = JSON.parse(completion.data.choices[0].message.content);
    const topics = topicJson["data"]["topics"];
    console.log(topics);

    return topics;
  }

  async generateTopicContent(
    topicsRequest: ITopicsRequest,
    courseOutline: string,
    topics: string[],
    model: string
  ): Promise<string[]> {
    // First generate topics
    let messages: any[] = [];
    if (model == "gpt-4") {
      messages = topics.map((topic: any) => {
        return [
          {
            role: "system",
            content: lesson_topics_prompts.topic_text_request2 + ". Existing course outline: " + courseOutline,
          },
          {
            role: "user",
            content: `Lesson to generate topics for: ${topicsRequest.title}
            }`,
          },
        ];
      });
    } else if (model == "gpt-3.5-turbo") {
      messages = topics.map((topic: any) => {
        return [
          {
            role: "user",
            content:
              lesson_topics_prompts.topic_text_request2 +
              ". Existing course outline: " +
              courseOutline +
              `. Topic to generate content for: ${topic}. Lesson which the topic belongs to: ${
                topicsRequest.title
              }, Proficiency for which to consider: ${topicsRequest.proficiency ?? defaultProficiency}, }`,
          },
        ];
      });
    }

    const promises = messages.map((message: any) => {
      return this.openai.createChatCompletion({
        model: model,
        messages: message,
        max_tokens: topicsRequest.max_tokens ?? defaultMaxTokens,
        temperature: topicsRequest.temperature ?? defaultTemperature,
      });
    });

    let responses;
    try {
      responses = await Promise.all(promises);
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(
          error.response.status,
          `Failed to retrieve topic text from OpenAI. ${error.response.data.error.message}`
        );
      } else {
        throw new OpenAIError("500", `Failed to retrieve topic text from OpenAI`);
      }
    }

    let content: string[] = [];
    responses.forEach((response) => {
      content.push(response.data.choices[0].message.content);
    });

    return content;
  }
  
  async generateLessonTopics(lessonRequest: ILessonContentRequest, lessonTitle: string, courseOutline: string, model: string): Promise<string[]> {
    let topicMessages: any[] = [];

    if (model === "gpt-4") {
      topicMessages = [
        {
          role: "system",
          content: lesson_topics_prompts.lesson_topics_request + ". Existing course outline: " + courseOutline,
        },
        {
          role: "user",
          content: `Lesson to generate topics for: ${lessonTitle}
          }`,
        },
      ];
    } else if (model === "gpt-3.5-turbo") {
      topicMessages = [
        {
          role: "user",
          content:
            lesson_topics_prompts.lesson_topics_request +
            ". Existing course outline: " +
            courseOutline +
            `. Lesson to generate topics for: ${lessonTitle}.`,
        },
      ];
    }

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: model,
        messages: topicMessages,
        max_tokens: lessonRequest.max_tokens ?? defaultMaxTokens,
        temperature: lessonRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve topics from OpenAI. ${error.response.data.error.message}`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve topics from OpenAI`);
      }
    }

    const topicJson = JSON.parse(completion.data.choices[0].message.content);
    const topics = topicJson["data"]["topics"];

    return topics;
  }

  async generateLessonTopicContent(
    lessonRequest: ILessonContentRequest,
    lessonTitle: string,
    courseOutline: string,
    topics: string[],
    model: string
  ): Promise<string[]> {
    // First generate topics
    let messages: any[] = [];
    if (model == "gpt-4") {
      // messages = topics.map((topic: any) => {
      //   return [
      //     {
      //       role: "system",
      //       content: lesson_topics_prompts.topic_text_request2 + ". Existing course outline: " + courseOutline,
      //     },
      //     {
      //       role: "user",
      //       content: `Lesson to generate topics for: ${topicsRequest.title}
      //       }`,
      //     },
      //   ];
      // });
    } else if (model == "gpt-3.5-turbo") {
      messages = topics.map((topic: any) => {
        return [
          {
            role: "user",
            content:
              lesson_topics_prompts.topic_text_request2 +
              ". Existing course outline: " +
              courseOutline +
              `. Topic to generate content for: ${topic}. Lesson which the topic belongs to: ${
                lessonTitle
              }, Proficiency for which to consider: ${lessonRequest.proficiency ?? defaultProficiency}`,
          },
        ];
      });
    }

    const promises = messages.map((message: any) => {
      return this.openai.createChatCompletion({
        model: model,
        messages: message,
        max_tokens: lessonRequest.max_tokens ?? defaultMaxTokens,
        temperature: lessonRequest.temperature ?? defaultTemperature,
      });
    });

    let responses;
    try {
      responses = await Promise.all(promises);
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(
          error.response.status,
          `Failed to retrieve topic text from OpenAI. ${error.response.data.error.message}`
        );
      } else {
        throw new OpenAIError("500", `Failed to retrieve topic text from OpenAI`);
      }
    }

    let content: string[] = [];
    responses.forEach((response) => {
      content.push(response.data.choices[0].message.content);
    });

    return content;
  }
}



//   async createSectionContentStream(
//     sectionContentRequest: ISectionContentRequest,
//     supabase: SupabaseClient
//   ): Promise<ISectionContent[]> {
//     const newUserMessage = `Section: ${sectionContentRequest.title}, Proficiency: ${
//       sectionContentRequest.proficiency ?? defaultProficiency
//     }`;

//     let model = "gpt-4";
//     // let model = "gpt-3.5-turbo";
//     let messages;

//     if (model === "gpt-4") {
//       messages = [
//         { role: "system", content: lesson_topics_prompts.section_content_system1 },
//         { role: "user", content: newUserMessage },
//       ];
//     } else if (model === "gpt-3.5-turbo") {
//       messages = [
//         {
//           role: "user",
//           content:
//             lesson_topics_prompts.section_content_system1 + `, New section content request: ${newUserMessage}}`,
//         },
//       ];
//     }

//     const stream = await OpenAI(
//       "chat",
//       {
//         model: model,
//         messages: messages,
//         max_tokens: sectionContentRequest.max_tokens ?? defaultMaxTokens,
//         temperature: sectionContentRequest.temperature ?? defaultTemperature,
//       },
//       {
//         apiKey: Deno.env.get("OPENAI_APIKEY"),
//       }
//     );

//     const channel = supabase.channel(`section_content_${sectionContentRequest.session_key}`);

//     let subscribed = false;
//     channel.subscribe((status) => {
//       if (status === "SUBSCRIBED") {
//         subscribed = true;
//       } else if (status === "CLOSED") {
//         console.log(status);
//         console.log("Channel closed");
//       } else if (status == "TIMED_OUT") {
//         console.log(status);
//         console.log("Channel timed out");
//       } else if (status == "CHANNEL_ERROR") {
//         console.log(status);
//         console.log("Channel error");
//       }
//     });

//     const decoder = new TextDecoder("utf-8");
//     let content = "";
//     for await (const chunk of stream) {
//       const chunkStr = decoder.decode(chunk);
//       if (chunkStr) {
//         if (subscribed) {
//           channel.send({ type: "broadcast", event: "section_content", chunkStr });
//         }
//         content += chunkStr;
//       }
//     }

//     const topicsResponse = new SectionContentResponse(content);
//     topicsResponse.validate();

//     const topics: ITopic[] = topicsResponse.response.data.topics.map((topic: any) => ({
//       title: topic.title,
//       text: topic.text,
//     }));

//     return topics;
//   }
// }

// export const config = {
//   runtime: "edge",
// };
