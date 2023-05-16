import { OpenAIError, OpenAIInvalidResponseError } from './../consts/Errors.ts';
import { Configuration, OpenAIApi } from "openai";
import { ICourseRequest } from "../dtos/course/CourseRequest.ts";
import * as new_course_prompts from "../consts/prompts/new_course_prompts.ts";
import * as lesson_topics_prompts from "../consts/prompts/lesson_topics_prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultTemperature } from "../consts/defaults.ts";
import { mapExternalCourseOutlineResponseToInternal } from "../Mappers.ts";
import { InternalCourse, InternalCourseItem } from "../InternalModels.ts";
import { ILessonContentRequest } from "../dtos/content/LessonContentRequest.ts";
import { CourseOutlineResponse } from "../dtos/OpenAIResponses/CourseOutlineResponse.ts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BaseChatMessage, HumanChatMessage, SystemChatMessage } from "langchain/schema";
import * as defaults from "../../_shared/consts/defaults.ts";
import { TopicResponseAI } from "../dtos/content/TopicResponseAI.ts";
import { IOpenAIResponse } from "../dtos/OpenAIResponses/IOpenAIResponse.ts";


export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_APIKEY") });
    this.openai = new OpenAIApi(this.config);
  }

  private async createChatCompletion<T extends IOpenAIResponse>(
    model: string,
    messages: any[],
    responseType: new (responseText: string) => T,
    maxTokens?: number,
    temperature?: number
  ): Promise<T> {
    const chat = new ChatOpenAI({
      temperature: temperature ?? defaultTemperature,
      modelName: model,
      maxTokens: maxTokens ?? defaultMaxTokens,
    });
  
    try {
      console.log(messages);
      const response = await chat.call(messages);
      console.log(response.text);
      let json = response.text.substring(response.text.indexOf('{'), response.text.lastIndexOf('}')+1);
      const parsedResponse = new responseType(json);
      parsedResponse.validate();
      return parsedResponse;
    } catch (error) {
      if (error instanceof OpenAIError || error instanceof OpenAIInvalidResponseError) {
        throw error;
      } else {
        // If the error is due to parsing the response, try to fix the JSON
        const fixedResponse = await chat.call([
          new HumanChatMessage(
            "Please fix and return just the json that may or may not be invalid. Do not return anything that is not JSON." + error.message
          ),
        ]);

        console.log(fixedResponse.text);

        let json = fixedResponse.text.substring(fixedResponse.text.indexOf('{'), fixedResponse.text.lastIndexOf('}')+1);
        const fixedParsedResponse = new responseType(json);
        fixedParsedResponse.validate();
        return fixedParsedResponse;
      }
    }
  }
  

  // private async createChatCompletion(model: string, messages: any[], maxTokens?: number, temperature?: number): Promise<BaseChatMessage> {
  //   const chat = new ChatOpenAI({ 
  //     temperature: temperature ?? defaultTemperature,
  //     modelName: model, 
  //     maxTokens: maxTokens ?? defaultMaxTokens 
  //   });

  //   try {
  //     return await chat.call(messages);
  //   } catch (error) {
  //     if (error.response) {
  //       throw new OpenAIError(error.response.status, `Failed to retrieve data from OpenAI. ${error.response.data.error.message}`);
  //     } else {
  //       throw new OpenAIError("500", `Failed to retrieve data from OpenAI`);
  //     }
  //   }
  // }

  async createCourseOutlineTitlesChain(courseRequest: ICourseRequest, model: string): Promise<InternalCourse> {
    let user_message = courseRequest.search_text;
    if (courseRequest.module_count != null) {
      user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    }

    let messages = [new SystemChatMessage(new_course_prompts.course_outline_v2), new HumanChatMessage(user_message!)]

    let response = await this.createChatCompletion(defaults.gpt35, messages, CourseOutlineResponse, courseRequest.max_tokens, courseRequest.temperature);

    console.log(response.response.data);

    console.log(new_course_prompts.course_outline_v2_improve);
    let fixMessages = [new SystemChatMessage(new_course_prompts.course_outline_v2_improve), new HumanChatMessage(`Improve this created outline ${response.response.data.course}. Course Request Text: ${user_message}`)]

    response = await this.createChatCompletion(defaults.gpt35, fixMessages, CourseOutlineResponse, courseRequest.max_tokens, courseRequest.temperature);

    console.log(response.response.data);

    return mapExternalCourseOutlineResponseToInternal(response.response);
  }

  async createCourseOutlineTitles(courseRequest: ICourseRequest, model: string): Promise<InternalCourse> {
    let user_message = courseRequest.search_text;
    if (courseRequest.module_count != null) {
      user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    }

    let messages;
    if(model == defaults.gpt4) {
      messages = [new SystemChatMessage(new_course_prompts.course_outline_titles), new HumanChatMessage(user_message!)]
    }
    else{
      messages = [new HumanChatMessage(`${new_course_prompts.course_outline_titles}. Course Request Text: ${user_message}`)]
    }

    console.log("Generating outline titles");
    const response = await this.createChatCompletion(model, messages, CourseOutlineResponse, 1000, courseRequest.temperature);

    return mapExternalCourseOutlineResponseToInternal(response.response);
  }

  simplifyItem(item: InternalCourseItem): any {
    const simplifiedItem: any = {
      title: item.title,
      type: item.type,
    };
    if (item.items) {
      simplifiedItem.items = item.items.map(this.simplifyItem);
    }
    return simplifiedItem;
  }

  simplifyCourse(course: InternalCourse): any {
    const simplifiedCourse: any = {
      title: course.title,
      type: 'course',
      items: course.items?.map(this.simplifyItem)
    };
    return simplifiedCourse;
  }

  async createCourseOutlineDescriptions(courseRequest: ICourseRequest, course: InternalCourse, model: string): Promise<InternalCourse> {
    console.log(course);
    let courseJson = JSON.stringify(this.simplifyCourse(course));

    let messages;
    if(model == defaults.gpt4) {
      messages = [new SystemChatMessage(new_course_prompts.course_outline_descriptions), new HumanChatMessage(`Existing course outline: ${courseJson!}`)]
    }
    else{
      messages = [new HumanChatMessage(`${new_course_prompts.course_outline_descriptions}. Existing course outline: ${courseJson}`)]
    }

    console.log("Generating outline descriptions");
    const response = await this.createChatCompletion(model, messages, CourseOutlineResponse, courseRequest.max_tokens, courseRequest.temperature);

    return mapExternalCourseOutlineResponseToInternal(response.response);
  }

  async createCourseOutlineV2(courseRequest: ICourseRequest, model: string): Promise<InternalCourse> {
    let user_message = courseRequest.search_text;
    if (courseRequest.module_count != null) {
      user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    }

    let messages;
    if(model == defaults.gpt4) {
      messages = [new SystemChatMessage(new_course_prompts.course_outline_v2), new HumanChatMessage(user_message!)]
    }
    else{
      messages = [new HumanChatMessage(`${new_course_prompts.course_outline_v2}. Course Request Text: ${user_message}`)]
    }

    const chat = new ChatOpenAI({ temperature: courseRequest.temperature ?? defaultTemperature, modelName: model, maxTokens: courseRequest.max_tokens ?? defaultMaxTokens });

    let courseOutline;
    try{
      courseOutline = await chat.call([
        new SystemChatMessage(new_course_prompts.course_outline_v2),
        new HumanChatMessage(user_message!),
      ]);
    }
    catch(error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`);
      }
      else {
        throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI`);
      }
    }
    
    if(courseOutline.text.length == 0) {
      throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI, empty response`);
    }

    let courseOutlineResponse;
    try {
      courseOutlineResponse = new CourseOutlineResponse(courseOutline.text);
    }
    catch(error)
    {
      chat.modelName = defaults.gpt35;
      const courseOutlineFix = await chat.call([
        new HumanChatMessage(
          "The following JSON was returned incorrectly from OpenAI, please correct it: " + courseOutline.text
        ),
      ]);

      courseOutlineResponse = new CourseOutlineResponse(courseOutlineFix.text);
    }

    courseOutlineResponse.validate();

    const course = mapExternalCourseOutlineResponseToInternal(courseOutlineResponse.response);

    return course;
  }

  async fixInvalidJson(invalidJson: string): Promise<BaseChatMessage> {
    const chat = new ChatOpenAI({ temperature: 0, modelName: defaults.gpt35, maxTokens: defaultMaxTokens });
    return await chat.call([
      new HumanChatMessage(
        "The following JSON was returned incorrectly from OpenAI, please correct it: " + invalidJson
      ),
    ]);
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

    const topicResponse = new TopicResponseAI(completion.data.choices[0].message.content)
    topicResponse.validate();

    return topicResponse.response.data.topics;
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
