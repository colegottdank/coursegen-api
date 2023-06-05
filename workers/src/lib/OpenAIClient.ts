// import { ChatOpenAI } from 'langchain/chat_models/openai';
// import { encode } from 'gpt-tokenizer'
// import { IOpenAIResponse } from '../dtos/IOpenAIResponse';
// import * as defaults from '../consts/Defaults';
// import { RequestWrapper } from './RequestWrapper';
// import { OpenAIError, OpenAIInvalidResponseError } from '../consts/Errors';
// import { InternalCourse, InternalTopic } from './InternalModels';
// import { CourseOutlineResponse } from '../dtos/CourseOutlineResponse';
// import * as Mappers from "./Mappers";
// import { ILessonContentPost as ILessonContentRequestPost } from '../dtos/LessonDtos';
// import { ICourseRequestPost } from '../dtos/CourseDtos';
// import * as NewCoursePrompts from '../consts/NewCoursePrompts';
// import * as LessonPrompts from '../consts/LessonPrompts';
// import { LessonContentResponse } from '../dtos/LessonContentResponse';
// import { HumanChatMessage, SystemChatMessage } from 'langchain/schema';

// export class OpenAIClient {

//   constructor(private requestWrapper: RequestWrapper) {};

//   // Wrapper for OpenAI's chat API that handles
//   // - Token count limit
//   // - Retries due to invalid JSON
//   // - Parsing & validation of response
//   private async createChatCompletion<T extends IOpenAIResponse>(
//     model: string,
//     messages: any[],
//     responseType: new (responseText: string) => T,
//     maxTokens?: number,
//     temperature?: number
//   ): Promise<T> {
//     const tokens = encode(JSON.stringify(messages));
//     let maxTokensCalc;
//     if(model == defaults.gpt4) maxTokensCalc = defaults.gpt4MaxTokens - tokens.length;
//     else maxTokensCalc = defaults.gpt35MaxTokens - tokens.length;

//     const chat = new ChatOpenAI({
//       openAIApiKey: this.requestWrapper.getOpenAIApiKey(),
//       temperature: temperature ?? defaults.defaultTemperature,
//       modelName: model,
//       maxTokens: maxTokensCalc
//     }, {
//       basePath: "https://oai.hconeai.com/v1",
//       baseOptions: {
//         headers: {
//           "Helicone-Auth": `Bearer ${this.requestWrapper.getHeliconeApiKey()}`
//         },
//       }
//     });
  
//     let json = ""
//     try {
//       const response = await chat.call(messages);
//       json = response.text.substring(response.text.indexOf('{'), response.text.lastIndexOf('}') + 1);
//       const parsedResponse = new responseType(json);
//       parsedResponse.validate();
//       return parsedResponse;
//     } catch (error: any) {
//       if (error instanceof OpenAIError || error instanceof OpenAIInvalidResponseError) {
//         throw error;
//       } else {
//         // If the error is due to parsing the response, try to fix the JSON
//         const fixedResponse = await chat.call([
//           new HumanChatMessage(
//             "Please fix and return just the json that may or may not be invalid. Do not return anything that is not JSON." + error.message + "JSON to fix: " + json
//           ),
//         ]);

//         json = fixedResponse.text.substring(fixedResponse.text.indexOf('{'), fixedResponse.text.lastIndexOf('}')+1);
//         const fixedParsedResponse = new responseType(json);
//         fixedParsedResponse.validate();
//         return fixedParsedResponse;
//       }
//     }
//   }

//   // GPT-4
//   async createCourseOutlineTitles(courseRequest: ICourseRequestPost, model: string): Promise<InternalCourse> {
//     let user_message = courseRequest.search_text;
//     // if (courseRequest.module_count != null) {
//     //   user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
//     // }

//     let messages;
//     if(model == defaults.gpt4) {
//       messages = [new SystemChatMessage(NewCoursePrompts.course_outline_titles), new HumanChatMessage(user_message!)]
//     }
//     else{
//       messages = [new HumanChatMessage(`${NewCoursePrompts.course_outline_titles}. Course Request Text: ${user_message}`)]
//     }

//     const response = await this.createChatCompletion(model, messages, CourseOutlineResponse, undefined, undefined);

//     return Mappers.mapExternalCourseOutlineResponseToInternal(response.response);
//   }

//   // GPT-3.5 Chained
//   async createCourseOutline(courseRequest: ICourseRequestPost): Promise<InternalCourse> {
//     let courseOutlineMsgs1 = [new HumanChatMessage(`${NewCoursePrompts.course_outline_1}. Course Request Text: ${courseRequest.search_text}`)]

//     const initialCourseOutline = await this.createChatCompletion(defaults.gpt35, courseOutlineMsgs1, CourseOutlineResponse, undefined, undefined);

//     let courseOutlineMsgs2 = [new HumanChatMessage(`${NewCoursePrompts.course_outline_improve}. Initial course outline: ${JSON.stringify(initialCourseOutline.response.data)}. Course Request Text: ${courseRequest.search_text}.`)]

//     const improvedCourseOutline = await this.createChatCompletion(defaults.gpt35, courseOutlineMsgs2, CourseOutlineResponse, undefined, undefined);

//     return Mappers.mapExternalCourseOutlineResponseToInternal(improvedCourseOutline.response);
//   }

//   // GPT-3.5 Chained
//   async createLessonContent(lessonRequest: ILessonContentRequestPost, lessonTitle: string, courseOutline: string, searchText: string, userId: string): Promise<InternalTopic[]> {
//     const lessonContentMsgs = [new HumanChatMessage(`${LessonPrompts.lesson_content_request}. Existing course outline: ${courseOutline}. Initial course request text: ${searchText}. Lesson to generate content for: ${lessonTitle}.`)]

//     let initialLessonContent = await this.createChatCompletion(defaults.gpt35, lessonContentMsgs, LessonContentResponse, undefined, undefined);

//     const improveLessonContentMsgs = [new HumanChatMessage(`${LessonPrompts.improve_lesson_content_request}. Existing course outline: ${courseOutline}. Initial course request text: ${searchText}. Lesson title that content was previously generated for: ${lessonTitle}. Generated lesson content from previous request: ${JSON.stringify(initialLessonContent.response.data)}.`)]

//     let improvedLessonContent = await this.createChatCompletion(defaults.gpt35, improveLessonContentMsgs, LessonContentResponse, undefined, undefined);

//     let internalTopics = Mappers.mapExternalTopicsToInternalTopics(improvedLessonContent.response, lessonRequest, userId);

//     return internalTopics;
//   }
// }